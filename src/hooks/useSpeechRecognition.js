import { useState, useRef, useCallback, useEffect } from 'react';

const Recognition = typeof window !== 'undefined'
  ? window.SpeechRecognition || window.webkitSpeechRecognition
  : undefined;

const ERRORS = {
  'not-allowed': 'Microphone permission is blocked. Allow it in your browser settings to talk to me.',
  'service-not-allowed': 'Microphone permission is blocked. Allow it in your browser settings to talk to me.',
  'no-speech': 'I didn’t catch anything. Tap the mic and try again.',
  network: 'Voice recognition needs a network connection. Try typing instead.',
  'audio-capture': 'No microphone found.',
};

/**
 * Browser speech-to-text. `onInterim(text)` streams the live transcript; `onFinal(text)` fires once
 * per session with the final transcript (on the final result, or when the session ends with text).
 */
export function useSpeechRecognition({ lang, onInterim, onFinal }) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState('');
  const recRef = useRef(null);
  const cb = useRef({ onInterim, onFinal });
  useEffect(() => { cb.current = { onInterim, onFinal }; });
  useEffect(() => () => recRef.current?.abort?.(), []);

  const stop = useCallback(() => recRef.current?.stop(), []);

  const start = useCallback(() => {
    if (!Recognition || recRef.current) return;
    setError('');
    const rec = new Recognition();
    rec.lang = lang === 'hi' ? 'hi-IN' : 'en-IN';
    rec.interimResults = true;
    rec.continuous = false;
    let transcript = '';
    let sent = false;
    const finish = () => {
      if (sent) return;
      sent = true;
      if (transcript.trim()) cb.current.onFinal(transcript.trim());
    };
    rec.onresult = (e) => {
      let text = '';
      let isFinal = false;
      for (let i = 0; i < e.results.length; i++) {
        text += e.results[i][0].transcript;
        if (e.results[i].isFinal) isFinal = true;
      }
      transcript = text;
      cb.current.onInterim(text);
      if (isFinal) finish();
    };
    rec.onerror = (e) => {
      if (e.error !== 'aborted') setError(ERRORS[e.error] || 'Voice input failed. Try again or type instead.');
      if (e.error !== 'no-speech') transcript = '';
    };
    rec.onend = () => {
      recRef.current = null;
      setListening(false);
      finish();
    };
    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      recRef.current = null;
    }
  }, [lang]);

  return { supported: !!Recognition, listening, error, clearError: () => setError(''), start, stop };
}
