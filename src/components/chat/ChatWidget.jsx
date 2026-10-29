import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BsX, BsTrash3, BsVolumeUpFill, BsVolumeMuteFill } from 'react-icons/bs';
import { BOT_NAME } from '../../constants';
import { useChat } from '../../hooks/useChat';
import { useSpeechSynthesis } from '../../hooks/useSpeechSynthesis';
import { LogoMark } from '../ui/Logo';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import ChatLauncher from './ChatLauncher';

const SEEN_KEY = 'hs_chat_seen';
const SUGGESTIONS = ['Suggest a thriller', 'Something like my list', 'What’s new this week?', 'Any matches today?'];
const FOCUSABLE = 'button:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';
const isMobile = () => window.matchMedia('(max-width: 767px)').matches;

/** Floating "Ask Filmy" button + chat panel. Mounted for signed-in users only (guests get GuestChatButton). */
export default function ChatWidget() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [pulse] = useState(() => !localStorage.getItem(SEEN_KEY)); // gentle attention ring on first view only
  const voice = useSpeechSynthesis();
  const chat = useChat({ onComplete: (text) => { if (voice.enabled) voice.speak(text); } });
  const { messages, streaming, historyLoaded, loadHistory, send, retry, stop, clear } = chat;
  const buttonRef = useRef(null);
  const panelRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const wasOpen = useRef(false);

  useEffect(() => { localStorage.setItem(SEEN_KEY, '1'); }, []);

  const close = useCallback(() => {
    voice.cancel();
    setOpen(false);
  }, [voice]);

  // Restore the previous conversation the first time the panel opens.
  useEffect(() => { if (open && !historyLoaded) loadHistory(); }, [open, historyLoaded, loadHistory]);

  // Focus: into the input on open, back to the button on close.
  useEffect(() => {
    if (open) inputRef.current?.focus();
    else if (wasOpen.current) buttonRef.current?.focus();
    wasOpen.current = open;
  }, [open]);

  // Mobile sheet is full-screen: stop the page scrolling behind it.
  useEffect(() => {
    if (!open || !isMobile()) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Keep the newest content in view while it streams.
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, open]);

  const onKeyDown = (e) => {
    if (e.key === 'Escape') { e.stopPropagation(); close(); return; }
    if (e.key !== 'Tab') return;
    const items = [...panelRef.current.querySelectorAll(FOCUSABLE)];
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };

  const handleSend = (text, lang) => { voice.cancel(); send(text, lang); };
  const handleStop = () => { voice.cancel(); stop(); };
  const handleClear = () => { voice.cancel(); clear(); };
  const openTitle = (t) => {
    navigate(`/detail/${t.mediaType}/${t.tmdbId}`);
    if (isMobile()) close();
  };

  const lastIdx = messages.length - 1;

  return (
    <>
      {!open && <ChatLauncher ref={buttonRef} pulse={pulse} onClick={() => setOpen(true)} />}

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label={`${BOT_NAME} chat`}
          onKeyDown={onKeyDown}
          className="fixed z-[60] inset-0 md:inset-auto md:top-6 md:bottom-6 md:right-6 md:w-[400px] flex flex-col bg-[#14151a] md:bg-[#14151a]/95 md:backdrop-blur-xl md:rounded-2xl md:border border-white/10 md:shadow-2xl md:shadow-black/60 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] md:p-0 animate-fade-in"
        >
          <header className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
            <LogoMark size={36} />
            <div className="flex-1 min-w-0">
              <h2 className="text-white font-bold leading-tight">{BOT_NAME}</h2>
              <p className="text-xs text-hotstar-gray truncate">
                {voice.speaking ? <span className="text-pink-300">Speaking…</span> : 'Your movie & show buddy'}
              </p>
            </div>
            {voice.supported && (
              <button
                type="button"
                onClick={voice.toggle}
                aria-pressed={voice.enabled}
                aria-label={voice.enabled ? `Turn off ${BOT_NAME}'s voice` : `Turn on ${BOT_NAME}'s voice`}
                className={`w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/10 outline-none focus-visible:ring-2 focus-visible:ring-white ${voice.enabled ? 'text-white' : 'text-gray-500'}`}
              >
                {voice.enabled ? <BsVolumeUpFill size={18} className={voice.speaking ? 'animate-pulse text-pink-300' : ''} /> : <BsVolumeMuteFill size={18} />}
              </button>
            )}
            <button
              type="button"
              onClick={handleClear}
              disabled={!messages.length}
              aria-label="Clear chat"
              title="Clear chat"
              className="w-9 h-9 rounded-full flex items-center justify-center text-gray-300 hover:bg-white/10 disabled:opacity-30 outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <BsTrash3 size={16} />
            </button>
            <button
              type="button"
              onClick={close}
              aria-label="Close chat"
              className="w-9 h-9 rounded-full flex items-center justify-center text-gray-300 hover:bg-white/10 outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <BsX size={26} />
            </button>
          </header>

          <div ref={listRef} aria-live="polite" aria-label="Conversation" className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 space-y-3">
            {!messages.length ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-2">
                <LogoMark size={56} />
                <h3 className="mt-4 text-lg font-bold text-white">Hi, I'm {BOT_NAME}!</h3>
                <p className="mt-1 text-sm text-hotstar-gray max-w-[260px]">Tell me what you're in the mood for and I'll find something to watch.</p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => handleSend(s, 'auto')}
                      className="px-3.5 py-2 rounded-full text-sm text-white bg-white/[0.07] border border-white/10 hover:bg-white/15 outline-none focus-visible:ring-2 focus-visible:ring-white transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : messages.map((m, i) => (
              <ChatMessage key={m.id} message={m} onOpenTitle={openTitle} onRetry={retry} canRetry={i === lastIdx && !streaming} />
            ))}
          </div>

          <ChatInput streaming={streaming} onSend={handleSend} onStop={handleStop} onMicStart={voice.cancel} inputRef={inputRef} />
        </div>
      )}
    </>
  );
}
