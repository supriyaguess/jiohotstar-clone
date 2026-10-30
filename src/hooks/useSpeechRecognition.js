import { useState, useRef, useCallback, useEffect } from 'react';

const Recognition = typeof window !== 'undefined'
  ? window.SpeechRecognition || window.webkitSpeechRecognition
  : undefined;

const ERRORS = {
  'no-speech': 'I didn’t catch anything. Tap the mic and try again.',
  network: 'Voice recognition needs a network connection. Try typing instead.',
  'audio-capture': 'No microphone found.',
};

// "Not allowed" has several causes that need different fixes, so say which one it is.
export async function explainBlockedMic() {
  if (typeof window !== 'undefined' && window.isSecureContext === false) {
    return 'Voice input needs a secure connection. Open the site with https:// (or on localhost).';
  }
  // The page's own Permissions-Policy header can switch the microphone off, whatever the user allows.
  const policy = document.permissionsPolicy || document.featurePolicy; // newer and older Chrome name for the same API
  if (policy && !policy.allowsFeature('microphone')) {
    return 'Voice input is switched off by this site’s configuration, not by your browser. Please report it.';
  }
  try {
    const status = await navigator.permissions.query({ name: 'microphone' });
    if (status.state === 'denied') {
      return 'The microphone is blocked for this site. Click the lock icon next to the address bar, set Microphone to Allow, then reload the page.';
    }
  } catch { /* the Permissions API doesn't cover the microphone everywhere */ }
  return 'Microphone permission is needed. Allow it when your browser asks, or via the lock icon next to the address bar.';
}

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
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') explainBlockedMic().then(setError);
      else if (e.error !== 'aborted') setError(ERRORS[e.error] || 'Voice input failed. Try again or type instead.');
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
