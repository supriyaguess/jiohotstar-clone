import { forwardRef } from 'react';
import { BsStars } from 'react-icons/bs';
import { BOT_NAME } from '../../constants';

/** The floating "Ask Filmy" pill. Bottom-right; on small screens it sits above the bottom nav. */
const ChatLauncher = forwardRef(function ChatLauncher({ onClick, pulse = false }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      aria-label={`Ask ${BOT_NAME}`}
      className="fixed z-40 right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] md:right-6 md:bottom-6 h-12 min-w-12 sm:px-5 px-3 rounded-full bg-hotstar-gradient text-white font-semibold text-sm inline-flex items-center justify-center gap-2 shadow-lg shadow-black/50 hover:brightness-110 transition outline-none focus-visible:ring-2 focus-visible:ring-white"
    >
      {pulse && <span aria-hidden="true" className="motion-safe:animate-ping absolute inset-0 rounded-full bg-hotstar-gradient opacity-40" style={{ animationIterationCount: 3 }} />}
      <BsStars size={18} className="relative" />
      <span className="relative hidden sm:inline">Ask {BOT_NAME}</span>
    </button>
  );
});

export default ChatLauncher;
