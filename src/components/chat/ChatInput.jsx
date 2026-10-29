import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { BsMicFill, BsSendFill, BsStopFill } from 'react-icons/bs';
import { BOT_NAME } from '../../constants';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';

const MAX_LEN = 500;
const COUNTER_AT = 400;
const LANG_KEY = 'hs_chat_lang';

export default function ChatInput({ streaming, onSend, onStop, onMicStart, inputRef }) {
  const [value, setValue] = useState('');
  const [lang, setLang] = useState(() => (localStorage.getItem(LANG_KEY) === 'hi' ? 'hi' : 'en'));
  const [fromVoice, setFromVoice] = useState(false);
  const taRef = useRef(null);

  const submit = (text, language) => {
    const t = text.trim();
    if (!t || streaming) return;
    onSend(t, language);
    setValue('');
    setFromVoice(false);
  };

  const mic = useSpeechRecognition({
    lang,
    onInterim: (t) => setValue(t.slice(0, MAX_LEN)),
    onFinal: (t) => submit(t, lang),
  });

  useEffect(() => { localStorage.setItem(LANG_KEY, lang); }, [lang]);

  // Auto-grow up to ~4 rows.
  useLayoutEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 104)}px`;
  }, [value]);

  const toggleMic = () => {
    if (mic.listening) { mic.stop(); return; }
    onMicStart?.(); // barge-in: stop speaking before listening
    setValue('');
    setFromVoice(true);
    mic.start();
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit(value, fromVoice ? lang : 'auto');
    }
  };

  const canSend = value.trim() && !streaming;

  return (
    <div className="px-3 pt-2 pb-3 border-t border-white/10">
      {mic.error && <p role="alert" className="text-xs text-red-300 mb-2 px-1">{mic.error}</p>}
      {mic.listening && (
        <p className="flex items-center gap-2 text-xs text-pink-300 mb-2 px-1" role="status">
          <span className="relative flex w-2 h-2"><span className="absolute inset-0 rounded-full bg-pink-500 animate-ping" /><span className="relative w-2 h-2 rounded-full bg-pink-500" /></span>
          Listening…
        </p>
      )}
      <div className="flex items-end gap-2">
        <div className="flex-1 min-w-0 flex items-end bg-white/[0.07] border border-white/10 rounded-2xl focus-within:border-white/30 transition-colors">
          <textarea
            ref={(el) => { taRef.current = el; if (inputRef) inputRef.current = el; }}
            value={value}
            rows={1}
            maxLength={MAX_LEN}
            onChange={(e) => { setValue(e.target.value); setFromVoice(false); }}
            onKeyDown={onKeyDown}
            placeholder={mic.listening ? 'Listening…' : `Ask ${BOT_NAME} anything…`}
            aria-label={`Message ${BOT_NAME}`}
            className="flex-1 min-w-0 bg-transparent resize-none outline-none text-sm text-white placeholder-gray-500 px-3.5 py-2.5 max-h-[104px]"
          />
          {mic.supported && (
            <div className="flex items-center gap-1 pr-1.5 pb-1.5">
              <button
                type="button"
                onClick={() => setLang((l) => (l === 'en' ? 'hi' : 'en'))}
                disabled={mic.listening}
                aria-label={`Voice language: ${lang === 'en' ? 'English' : 'Hindi'}. Tap to switch.`}
                className="h-8 px-1.5 rounded-md text-[11px] font-semibold text-hotstar-gray hover:text-white disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <span className={lang === 'en' ? 'text-white' : ''}>EN</span> | <span className={lang === 'hi' ? 'text-white' : ''}>हि</span>
              </button>
              <button
                type="button"
                onClick={toggleMic}
                disabled={streaming && !mic.listening}
                aria-label={mic.listening ? 'Stop listening' : 'Speak your question'}
                aria-pressed={mic.listening}
                className={`w-8 h-8 rounded-full flex items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-white transition-colors ${mic.listening ? 'bg-pink-600 text-white animate-pulse' : 'text-gray-300 hover:bg-white/10 disabled:opacity-40'}`}
              >
                <BsMicFill size={15} />
              </button>
            </div>
          )}
        </div>
        {streaming ? (
          <button type="button" onClick={onStop} aria-label="Stop answering" className="w-10 h-10 flex-shrink-0 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-white">
            <BsStopFill size={20} />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => submit(value, fromVoice ? lang : 'auto')}
            disabled={!canSend}
            aria-label="Send message"
            className="btn-watch !w-10 !h-10 !p-0 flex-shrink-0 !rounded-full disabled:!opacity-40 disabled:!cursor-not-allowed"
          >
            <BsSendFill size={15} />
          </button>
        )}
      </div>
      {value.length >= COUNTER_AT && (
        <p className={`text-[11px] text-right mt-1 pr-1 ${value.length >= MAX_LEN ? 'text-red-300' : 'text-hotstar-gray'}`}>{value.length}/{MAX_LEN}</p>
      )}
    </div>
  );
}
