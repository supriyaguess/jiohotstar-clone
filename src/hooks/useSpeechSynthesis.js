import { useState, useRef, useCallback, useEffect } from 'react';

const KEY = 'hs_chat_voice';
const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined;

const SENTENCE_PAUSE = 300;   // ms of silence after a sentence
const ITEM_PAUSE = 600;       // after a paragraph or a list item
const CLAUSE_PAUSE = 150;     // between pieces of one very long sentence
const MAX_CHUNK = 170;        // browsers cut off (or stumble on) very long utterances

// Plain text for the speech engine: no markdown, links or emoji.
const stripMarkup = (text) => text
  .replace(/https?:\/\/\S+/g, '')
  .replace(/\*\*/g, '')
  .replace(/[*_`#>]/g, '')
  .replace(/[\p{Extended_Pictographic}️‍]/gu, '')
  .replace(/[ \t]+/g, ' ')
  .trim();

// A very long sentence is split at commas and similar, so each piece stays short enough to be spoken cleanly.
function chunkLong(sentence) {
  if (sentence.length <= MAX_CHUNK) return [sentence];
  const parts = sentence.split(/(?<=[,;:])\s+|\s+[–—-]\s+/);
  const out = [];
  let cur = '';
  for (const part of parts) {
    if (cur && (cur + ' ' + part).length > MAX_CHUNK) { out.push(cur); cur = part; }
    else cur = cur ? `${cur} ${part}` : part;
  }
  if (cur) out.push(cur);
  return out;
}

/**
 * Splits an answer into short utterances, each with the silence to leave after it.
 * One long utterance is spoken in a single breath with no pauses, and bullets ran together; speaking
 * sentence by sentence, with a longer gap between paragraphs and list items, sounds like a person.
 * @returns {{text: string, pause: number}[]}
 */
export function toSpeechSegments(text) {
  const segments = [];
  for (const rawLine of text.split(/\n+/)) {
    const line = stripMarkup(rawLine.replace(/^\s*[-*•]\s+/, '').replace(/^\s*\d+[.)]\s+/, ''));
    if (!line) continue;
    // Split after . ! ? । … when whitespace follows, so "8.6" stays whole.
    const sentences = line.replace(/([.!?।…]+)\s+/g, '$1\u0001').split('\u0001').filter(Boolean);
    sentences.forEach((sentence, i) => {
      const lastOfLine = i === sentences.length - 1;
      // A list item rarely ends with punctuation, which makes the engine drop its voice and rush on.
      const end = /[ऀ-ॿ]/.test(sentence) ? '।' : '.';
      const spoken = lastOfLine && !/[.!?।…:;]$/.test(sentence) ? `${sentence}${end}` : sentence;
      const chunks = chunkLong(spoken);
      chunks.forEach((chunk, j) => {
        const lastChunk = j === chunks.length - 1;
        segments.push({ text: chunk, pause: !lastChunk ? CLAUSE_PAUSE : lastOfLine ? ITEM_PAUSE : SENTENCE_PAUSE });
      });
    });
  }
  if (segments.length) segments[segments.length - 1].pause = 0;
  return segments;
}

/** Reads bot answers aloud with the browser's speechSynthesis; the on/off choice is persisted. */
export function useSpeechSynthesis() {
  const supported = !!synth && typeof window.SpeechSynthesisUtterance === 'function';
  const [enabled, setEnabled] = useState(() => localStorage.getItem(KEY) === '1');
  const [speaking, setSpeaking] = useState(false);
  const voicesRef = useRef([]);
  const runRef = useRef(0);       // bumped by every cancel/speak: stale callbacks see a different value and stop
  const timerRef = useRef(null);

  useEffect(() => {
    if (!supported) return undefined;
    const load = () => { voicesRef.current = synth.getVoices(); }; // voices load async in some browsers
    load();
    synth.addEventListener?.('voiceschanged', load);
    const stopAll = () => synth.cancel();
    window.addEventListener('pagehide', stopAll);
    window.addEventListener('beforeunload', stopAll);
    return () => {
      synth.removeEventListener?.('voiceschanged', load);
      window.removeEventListener('pagehide', stopAll);
      window.removeEventListener('beforeunload', stopAll);
      synth.cancel();
    };
  }, [supported]);

  const cancel = useCallback(() => {
    if (!supported) return;
    runRef.current += 1;
    clearTimeout(timerRef.current);
    synth.cancel();
    setSpeaking(false);
  }, [supported]);

  const speak = useCallback((text) => {
    if (!supported) return;
    const segments = toSpeechSegments(text);
    if (!segments.length) return;
    cancel();
    const run = runRef.current;
    const hindi = /[ऀ-ॿ]/.test(text);
    const wanted = hindi ? ['hi-IN', 'hi'] : ['en-IN', 'en-US', 'en'];
    const voices = voicesRef.current;
    const voice = wanted.map((l) => voices.find((v) => v.lang === l || v.lang.startsWith(`${l}-`))).find(Boolean);

    const playFrom = (i) => {
      if (run !== runRef.current) return; // cancelled, or a newer answer took over
      const seg = segments[i];
      if (!seg) { setSpeaking(false); return; }
      const u = new window.SpeechSynthesisUtterance(seg.text);
      u.lang = voice?.lang || wanted[0];
      if (voice) u.voice = voice;
      u.rate = 0.96;
      u.onstart = () => { if (run === runRef.current) setSpeaking(true); };
      u.onend = () => {
        if (run !== runRef.current) return;
        timerRef.current = setTimeout(() => playFrom(i + 1), seg.pause);
      };
      u.onerror = () => { if (run === runRef.current) setSpeaking(false); };
      synth.speak(u);
    };
    playFrom(0);
  }, [supported, cancel]);

  const toggle = useCallback(() => {
    setEnabled((on) => {
      localStorage.setItem(KEY, on ? '0' : '1');
      return !on;
    });
    cancel();
  }, [cancel]);

  return { supported, enabled, speaking, speak, cancel, toggle };
}
