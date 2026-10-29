import { useState, useRef, useCallback, useEffect } from 'react';

const KEY = 'hs_chat_voice';
const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined;

// Plain text for the speech engine: no markdown, links or emoji.
export function toSpeakable(text) {
  return text
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\*\*/g, '')
    .replace(/^\s*[-*•]\s+/gm, '')
    .replace(/[*_`#>]/g, '')
    .replace(/[\p{Extended_Pictographic}️‍]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Reads bot answers aloud with the browser's speechSynthesis; the on/off choice is persisted. */
export function useSpeechSynthesis() {
  const supported = !!synth && typeof window.SpeechSynthesisUtterance === 'function';
  const [enabled, setEnabled] = useState(() => localStorage.getItem(KEY) === '1');
  const [speaking, setSpeaking] = useState(false);
  const voicesRef = useRef([]);

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
    synth.cancel();
    setSpeaking(false);
  }, [supported]);

  const speak = useCallback((text) => {
    if (!supported) return;
    const clean = toSpeakable(text);
    if (!clean) return;
    synth.cancel();
    const hindi = /[ऀ-ॿ]/.test(clean);
    const wanted = hindi ? ['hi-IN', 'hi'] : ['en-IN', 'en-US', 'en'];
    const voices = voicesRef.current;
    const voice = wanted.map((l) => voices.find((v) => v.lang === l || v.lang.startsWith(`${l}-`))).find(Boolean);
    const u = new window.SpeechSynthesisUtterance(clean);
    u.lang = voice?.lang || wanted[0];
    if (voice) u.voice = voice;
    u.onstart = () => setSpeaking(true);
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    synth.speak(u);
  }, [supported]);

  const toggle = useCallback(() => {
    setEnabled((on) => {
      localStorage.setItem(KEY, on ? '0' : '1');
      return !on;
    });
    cancel();
  }, [cancel]);

  return { supported, enabled, speaking, speak, cancel, toggle };
}
