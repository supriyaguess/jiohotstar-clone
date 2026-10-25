import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AiOutlineClose } from 'react-icons/ai';
import { useApp } from '../../context/AppContext';
import { LogoMark } from './Logo';

/** "Sign up to watch" gate shown when a guest tries to play something. */
export default function AuthPrompt() {
  const { authPromptOpen, closeAuthPrompt } = useApp();
  const location = useLocation();
  const from = location.pathname + location.search;

  useEffect(() => {
    if (!authPromptOpen) return;
    const onKey = (e) => e.key === 'Escape' && closeAuthPrompt();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [authPromptOpen, closeAuthPrompt]);

  if (!authPromptOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4 animate-fade-in"
      onClick={closeAuthPrompt}
    >
      <div
        className="relative w-full max-w-sm bg-[#18181b] border border-white/10 rounded-2xl p-8 text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Sign up to watch"
      >
        <button onClick={closeAuthPrompt} className="absolute top-4 right-4 text-gray-500 hover:text-white" aria-label="Close">
          <AiOutlineClose size={20} />
        </button>
        <div className="flex justify-center mb-4"><LogoMark size={48} /></div>
        <h2 className="text-xl font-black text-white mb-2">Sign up to start watching</h2>
        <p className="text-gray-400 text-sm mb-6">Create a free account to play trailers, save your list and continue where you left off.</p>
        <Link
          to="/signup"
          state={{ from }}
          onClick={closeAuthPrompt}
          className="block w-full py-3 rounded-xl text-white font-semibold text-sm mb-3"
          style={{ background: 'linear-gradient(92.7deg, #1492ff 0%, #0860c4 50%, #eb0066 100%)' }}
        >
          Sign up free
        </Link>
        <Link
          to="/login"
          state={{ from }}
          onClick={closeAuthPrompt}
          className="block w-full py-3 rounded-xl bg-white/10 text-white font-semibold text-sm hover:bg-white/20 transition-colors"
        >
          I already have an account
        </Link>
      </div>
    </div>
  );
}
