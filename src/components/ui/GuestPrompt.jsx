import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AiOutlineClose } from 'react-icons/ai';
import { useApp } from '../../context/AppContext';
import { LogoMark } from './Logo';

const SHOW_AFTER_PX = 700;
const DISMISS_KEY = 'hs_guest_prompt_dismissed';

/** Soft nudge for guests: appears after they've scrolled through some content. Dismissible per session. */
export default function GuestPrompt() {
  const { user, authLoading } = useApp();
  const [scrolled, setScrolled] = useState(false);
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem(DISMISS_KEY) === '1');

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > SHOW_AFTER_PX);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (user || authLoading || dismissed || !scrolled) return null;

  const dismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  };

  return (
    <div className="fixed z-50 left-4 right-4 bottom-20 md:left-auto md:right-6 md:bottom-6 md:w-[380px] animate-fade-in">
      <div className="relative flex items-center gap-3 bg-[#18181b]/95 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-2xl">
        <LogoMark size={40} />
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-bold leading-tight">Log in for a better experience</p>
          <p className="text-gray-400 text-xs mt-0.5">Save titles to My List and continue watching on any device.</p>
          <div className="flex gap-2 mt-2.5">
            <Link
              to="/login"
              state={{ from: '/' }}
              className="px-4 py-1.5 rounded-lg text-white text-xs font-semibold"
              style={{ background: 'linear-gradient(92.7deg, #1492ff 0%, #0860c4 50%, #eb0066 100%)' }}
            >
              Log in
            </Link>
            <Link
              to="/signup"
              state={{ from: '/' }}
              className="px-4 py-1.5 rounded-lg bg-white/10 text-white text-xs font-semibold hover:bg-white/20 transition-colors"
            >
              Sign up
            </Link>
          </div>
        </div>
        <button onClick={dismiss} className="self-start text-gray-500 hover:text-white" aria-label="Dismiss">
          <AiOutlineClose size={16} />
        </button>
      </div>
    </div>
  );
}
