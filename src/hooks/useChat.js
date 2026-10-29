import { useState, useRef, useCallback, useEffect } from 'react';
import { api, API_URL, getAccessToken, refreshSession } from '../api/client';
import { createSSEParser } from '../utils/sse';

const GENERIC_ERROR = 'Something went wrong. Please try again.';
const SIGN_IN_AGAIN = 'Please sign in again to keep chatting.';

let nextId = 0;
const newId = () => `m${++nextId}`;

// Merge title lists, de-duplicating by media type + TMDB id.
const mergeTitles = (current = [], incoming = []) => {
  const seen = new Set(current.map((t) => `${t.mediaType}:${t.tmdbId}`));
  const extra = incoming.filter((t) => !seen.has(`${t.mediaType}:${t.tmdbId}`) && seen.add(`${t.mediaType}:${t.tmdbId}`));
  return extra.length ? [...current, ...extra] : current;
};

const postChat = (message, lang, signal) =>
  fetch(`${API_URL}/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', Authorization: `Bearer ${getAccessToken()}` },
    body: JSON.stringify({ message, lang }),
    signal,
    credentials: 'include',
  });

/**
 * Chat state machine: history, streaming a turn over SSE, stop, clear, retry.
 * `onComplete(text)` fires after a turn finishes cleanly (used to read the answer aloud).
 */
export function useChat({ onComplete } = {}) {
  const [messages, setMessages] = useState([]);
  const [streaming, setStreaming] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const abortRef = useRef(null);
  const lastRef = useRef(null); // last request, for "Try again"
  const completeRef = useRef(onComplete);
  const touchedRef = useRef(false); // a user turn happened: don't let late history overwrite it
  useEffect(() => { completeRef.current = onComplete; });

  useEffect(() => () => abortRef.current?.abort(), []);

  const patch = useCallback((id, fn) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...fn(m) } : m)));
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const { data } = await api.get('/chat/history');
      if (!touchedRef.current) {
        setMessages((data.messages || []).map((m) => ({ id: newId(), role: m.role, text: m.text || '', titles: m.titles || [] })));
      }
    } catch { /* an empty chat is fine; sending still works */ }
    setHistoryLoaded(true);
  }, []);

  const runTurn = useCallback(async (text, lang, botId) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setStreaming(true);
    const fail = (message) => patch(botId, () => ({ pending: false, error: message }));

    try {
      let res = await postChat(text, lang, controller.signal);
      if (res.status === 401) {
        try { await refreshSession(); } catch { fail(SIGN_IN_AGAIN); return; }
        res = await postChat(text, lang, controller.signal);
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (res.status === 401) fail(SIGN_IN_AGAIN);
        else fail(body.error || GENERIC_ERROR);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      const parse = createSSEParser();
      let full = '';
      let ended = false;

      const handle = ({ event, data }) => {
        if (event === 'token' && typeof data.text === 'string') {
          full += data.text;
          patch(botId, (m) => ({ pending: false, text: m.text + data.text }));
        } else if (event === 'titles' && Array.isArray(data.titles)) {
          patch(botId, (m) => ({ titles: mergeTitles(m.titles, data.titles) }));
        } else if (event === 'error') {
          ended = true;
          fail(data.message || GENERIC_ERROR);
        } else if (event === 'done') {
          ended = true;
          patch(botId, () => ({ pending: false }));
          if (full.trim()) completeRef.current?.(full);
        }
      };

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        parse(decoder.decode(value, { stream: true })).forEach(handle);
        if (ended) break;
      }
      if (!ended) fail(GENERIC_ERROR); // stream closed without `done`
      else reader.cancel().catch(() => {});
    } catch (err) {
      if (err.name === 'AbortError') patch(botId, (m) => ({ pending: false, stopped: true, text: m.text }));
      else fail('Can’t reach the server. Check your connection and try again.');
    } finally {
      if (abortRef.current === controller) { abortRef.current = null; setStreaming(false); }
    }
  }, [patch]);

  const send = useCallback((text, lang = 'auto') => {
    const message = text.trim().slice(0, 500);
    if (!message) return;
    touchedRef.current = true;
    lastRef.current = { message, lang };
    const botId = newId();
    setMessages((prev) => [
      ...prev,
      { id: newId(), role: 'user', text: message },
      { id: botId, role: 'bot', text: '', titles: [], pending: true },
    ]);
    runTurn(message, lang, botId);
  }, [runTurn]);

  // Re-run the last request in place of the failed bot bubble.
  const retry = useCallback(() => {
    if (!lastRef.current) return;
    const botId = newId();
    setMessages((prev) => {
      const next = [...prev];
      if (next.length && next[next.length - 1].error) next.pop();
      return [...next, { id: botId, role: 'bot', text: '', titles: [], pending: true }];
    });
    runTurn(lastRef.current.message, lastRef.current.lang, botId);
  }, [runTurn]);

  const stop = useCallback(() => abortRef.current?.abort(), []);

  const clear = useCallback(async () => {
    abortRef.current?.abort();
    touchedRef.current = true;
    setMessages([]);
    try { await api.delete('/chat'); } catch { /* local view is already cleared */ }
  }, []);

  return { messages, streaming, historyLoaded, loadHistory, send, retry, stop, clear };
}
