import { useEffect, useCallback, useRef } from 'react';
import { AiOutlineClose } from 'react-icons/ai';
import { api } from '../../api/client';
import { useApp } from '../../context/AppContext';
import { getTitle } from '../../utils/helpers';

const SAVE_EVERY_SECONDS = 15;

/**
 * YouTube trailer modal overlay
 * @param {string} videoKey - YouTube video key
 * @param {Function} onClose - close handler
 * @param {object} [item] - TMDB item; when given and the user is signed in, watch time is saved to history
 */
export default function VideoModal({ videoKey, onClose, item }) {
  const { user } = useApp();
  const watched = useRef(0);

  // Count seconds with the modal open and save to "Continue Watching" every 15s and on close.
  useEffect(() => {
    if (!user || !item || !videoKey) return;
    const save = () => {
      if (watched.current < 3) return;
      api.put('/history', {
        id: item.id,
        media_type: item.media_type,
        title: getTitle(item),
        poster_path: item.poster_path ?? null,
        backdrop_path: item.backdrop_path ?? null,
        progress_seconds: watched.current,
        duration_seconds: item.runtime ? item.runtime * 60 : null,
      }).catch(() => {});
    };
    const timer = setInterval(() => {
      watched.current += 1;
      if (watched.current % SAVE_EVERY_SECONDS === 0) save();
    }, 1000);
    return () => { clearInterval(timer); save(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- callers pass a fresh object each render
  }, [user, videoKey, item?.id, item?.media_type]);

  // Close on Escape key
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [handleKeyDown]);

  if (!videoKey) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl mx-4 aspect-video"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white transition-colors"
          aria-label="Close trailer"
        >
          <AiOutlineClose size={28} />
        </button>

        {/* YouTube iframe */}
        <iframe
          className="w-full h-full rounded-xl shadow-2xl"
          src={`https://www.youtube.com/embed/${videoKey}?autoplay=1&rel=0&modestbranding=1`}
          title="Video Player"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </div>
  );
}
