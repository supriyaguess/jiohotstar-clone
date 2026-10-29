import { GeminiError } from '../services/gemini.js';
import { streamGenerate } from '../services/geminiChat.js';
import { systemPrompt } from './persona.js';
import { TOOL_DECLARATIONS, executeTool } from './tools.js';
import { pickMentioned } from './mentions.js';

export const MAX_ROUNDS = 4;
const OVERALL_TIMEOUT_MS = 60_000;
const MAX_TITLES = 8;
const MAX_CANDIDATES = 24;

export const ERRORS = {
  busy: 'Filmy is busy right now, please try again in a minute',
  internal: 'Something went wrong on my side, please try again',
};

/**
 * Runs one chat turn: model rounds with tool execution until the model answers with text only.
 * `emit(event, data)` sends SSE frames. Returns { ok, text, titles } (ok=false after an error event,
 * and nothing is emitted if the client went away).
 */
export async function runTurn({ userId, message, lang, history, emit, signal, log }) {
  const overall = new AbortController();
  const timer = setTimeout(() => overall.abort(), OVERALL_TIMEOUT_MS);
  const abort = () => overall.abort();
  signal.addEventListener('abort', abort, { once: true });

  const contents = [...history, { role: 'user', parts: [{ text: message }] }];
  const system = systemPrompt(lang);
  const candidates = new Map(); // "movie:603" -> title card data, in the order tools returned them
  const toolNames = [];
  let text = '';
  const started = Date.now();
  let rounds = 0;
  let model; // set after round 1: every later round of this turn stays on the same model

  const fail = (code) => { if (!signal.aborted) emit('error', { code, message: ERRORS[code] }); return { ok: false }; };

  try {
    for (; rounds < MAX_ROUNDS; ) {
      rounds++;
      const parts = [];
      const calls = [];
      let roundText = false;
      let end = null;
      for await (const ev of streamGenerate({ system, contents, tools: TOOL_DECLARATIONS, signal: overall.signal, retries: rounds === 1 ? 2 : 0, model, forceTool: rounds === 1 })) {
        if (ev.type === 'end') { end = ev; model = ev.model; continue; }
        parts.push(ev.part);
        if (ev.type === 'call') { calls.push(ev); continue; }
        if (!ev.text) continue;
        if (!roundText && text && !/\s$/.test(text)) { text += ' '; emit('token', { text: ' ' }); }
        roundText = true;
        text += ev.text;
        emit('token', { text: ev.text });
      }

      if (!calls.length) {
        if (!text.trim()) {
          const fallback = end?.blocked || end?.finishReason === 'SAFETY'
            ? "Sorry, I can't help with that one. Ask me about movies, shows or sports instead!"
            : "Sorry, I couldn't come up with an answer. Could you rephrase that?";
          text = fallback;
          emit('token', { text: fallback });
        }
        // Cards only for titles the answer names, sent once at the end, just before `done`.
        const shown = pickMentioned(text, [...candidates.values()]).slice(0, MAX_TITLES);
        if (shown.length) emit('titles', { titles: shown });
        log?.info({ rounds, tools: toolNames, ms: Date.now() - started }, 'chat turn done');
        return { ok: true, text: text.trim(), titles: shown };
      }
      if (rounds >= MAX_ROUNDS) break;

      contents.push({ role: 'model', parts });
      const responses = [];
      for (const call of calls) {
        toolNames.push(call.name);
        const result = await executeTool(call.name, call.args, { userId });
        for (const t of result.titles) {
          const k = `${t.mediaType}:${t.tmdbId}`;
          if (!candidates.has(k) && candidates.size < MAX_CANDIDATES) candidates.set(k, t);
        }
        responses.push({ functionResponse: { name: call.name, ...(call.id && { id: call.id }), response: result.response } });
      }
      contents.push({ role: 'user', parts: responses });
    }
    log?.warn({ rounds, tools: toolNames }, 'chat tool loop cap reached');
    return fail('internal');
  } catch (err) {
    if (signal.aborted) return { ok: false };
    const status = err instanceof GeminiError ? err.status : null;
    log?.warn({ status, errName: err?.name, rounds, ms: Date.now() - started }, 'chat turn failed');
    return fail(err instanceof GeminiError ? 'busy' : 'internal');
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', abort);
  }
}
