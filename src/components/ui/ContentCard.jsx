import { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { BsPlayFill, BsBookmark, BsBookmarkFill, BsPlusLg } from 'react-icons/bs';
import { AiFillStar } from 'react-icons/ai';
import { MdInfoOutline } from 'react-icons/md';
import {
  getPosterUrl, getBackdropUrl,
  getTitle, getReleaseDate, getYear, formatRating, truncateText,
} from '../../utils/helpers';
import { useApp } from '../../context/AppContext';

const HOVER_DELAY = 450; // ms before popup appears
const POPUP_WIDTH = 320;

/** Expanded hover popup — rendered via portal to escape overflow clipping */
function HoverPopup({ item, anchorRect, onClose }) {
  const navigate = useNavigate();
  const { toggleWatchlist, isInWatchlist } = useApp();

  const mediaType = item.media_type || (item.title ? 'movie' : 'tv');
  const title = getTitle(item);
  const year = getYear(getReleaseDate(item));
  const rating = formatRating(item.vote_average);
  const overview = truncateText(item.overview, 18);
  const inWatchlist = isInWatchlist(item.id, mediaType);

  // Smart positioning: center on card, clamp to viewport, open above if no room below
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let left = anchorRect.left + anchorRect.width / 2 - POPUP_WIDTH / 2;
  left = Math.max(12, Math.min(left, vw - POPUP_WIDTH - 12));

  const POPUP_H_ESTIMATE = 310;
  const spaceBelow = vh - anchorRect.bottom - 8;
  const top =
    spaceBelow >= POPUP_H_ESTIMATE
      ? anchorRect.bottom + 8
      : anchorRect.top - POPUP_H_ESTIMATE - 8;

  const goDetail = () => {
    navigate(`/detail/${mediaType}/${item.id}`);
    onClose();
  };

  return createPortal(
    <div
      className="fixed z-[500]"
      style={{ top: Math.max(8, top), left, width: POPUP_WIDTH }}
      onMouseLeave={onClose}
    >
      <div
        className="rounded-xl overflow-hidden shadow-2xl border border-white/10 animate-slide-up"
        style={{ background: '#18181b' }}
      >
        {/* Backdrop / thumbnail */}
        <div className="relative" style={{ aspectRatio: '16/9' }}>
          <img
            src={
              item.backdrop_path
                ? getBackdropUrl(item.backdrop_path, 'sm')
                : getPosterUrl(item.poster_path, 'lg')
            }
            alt={title}
            className="w-full h-full object-cover"
          />
          {/* gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#18181b] via-transparent to-transparent" />

          {/* Centered play button */}
          <button
            onClick={goDetail}
            className="absolute inset-0 flex items-center justify-center group/play"
          >
            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-xl transition-transform duration-150 group-hover/play:scale-110">
              <BsPlayFill size={26} className="text-black ml-1" />
            </div>
          </button>

          {/* Premium badge */}
          {item.vote_average >= 7.5 && (
            <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-yellow-500 text-black">
              PREMIUM
            </span>
          )}
        </div>

        {/* Info section */}
        <div className="p-3">
          {/* Title row */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="text-white font-bold text-sm leading-snug line-clamp-2 flex-1">
              {title}
            </h3>
          </div>

          {/* Meta */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {year && (
              <span className="text-gray-400 text-xs">{year}</span>
            )}
            {item.vote_average > 0 && (
              <span className="flex items-center gap-0.5 text-yellow-400 text-xs font-semibold">
                <AiFillStar size={11} />
                {rating}
              </span>
            )}
            <span className="text-[10px] px-1.5 py-0.5 border border-white/20 rounded text-gray-400 uppercase tracking-wide">
              {mediaType === 'tv' ? 'Series' : 'Movie'}
            </span>
          </div>

          {/* Overview */}
          {overview && (
            <p className="text-gray-400 text-[11px] leading-relaxed mb-3 line-clamp-2">
              {overview}
            </p>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={goDetail}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-white text-xs font-semibold transition-opacity hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #2563eb)' }}
            >
              <BsPlayFill size={14} />
              Play
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); toggleWatchlist({ ...item, media_type: mediaType }); }}
              className="flex items-center justify-center p-2 rounded-lg bg-white/8 border border-white/10 text-white hover:bg-white/15 transition-colors"
              title={inWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
            >
              {inWatchlist ? <BsBookmarkFill size={13} className="text-purple-400" /> : <BsPlusLg size={13} />}
            </button>
            <button
              onClick={goDetail}
              className="flex items-center justify-center p-2 rounded-lg bg-white/8 border border-white/10 text-white hover:bg-white/15 transition-colors"
              title="More info"
            >
              <MdInfoOutline size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

/**
 * Reusable content card with hover-expand popup (like Hotstar/Netflix).
 */
export default function ContentCard({ item, variant = 'poster' }) {
  const [imageError, setImageError] = useState(false);
  const [hoverPopup, setHoverPopup] = useState(false);
  const [anchorRect, setAnchorRect] = useState(null);
  const cardRef = useRef(null);
  const timerRef = useRef(null);
  const navigate = useNavigate();

  if (!item) return null;

  const mediaType = item.media_type || (item.title ? 'movie' : 'tv');
  const title = getTitle(item);
  const isPremium = item.vote_average >= 7.5;

  const imgSrc = variant === 'backdrop'
    ? getBackdropUrl(item.backdrop_path, 'sm')
    : getPosterUrl(item.poster_path, 'md');

  const handleMouseEnter = useCallback(() => {
    timerRef.current = setTimeout(() => {
      if (cardRef.current) {
        setAnchorRect(cardRef.current.getBoundingClientRect());
        setHoverPopup(true);
      }
    }, HOVER_DELAY);
  }, []);

  const handleMouseLeave = useCallback(() => {
    clearTimeout(timerRef.current);
    // Don't close immediately — let the popup's own onMouseLeave handle it
    // (small delay so mouse can travel to popup without it disappearing)
    timerRef.current = setTimeout(() => setHoverPopup(false), 80);
  }, []);

  const handlePopupClose = useCallback(() => {
    clearTimeout(timerRef.current);
    setHoverPopup(false);
  }, []);

  return (
    <>
      <div
        ref={cardRef}
        className="relative cursor-pointer select-none rounded-lg overflow-hidden group"
        style={{ aspectRatio: variant === 'backdrop' ? '16/9' : '2/3' }}
        onClick={() => navigate(`/detail/${mediaType}/${item.id}`)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        title={title}
      >
        {/* Poster / backdrop image */}
        <img
          src={imageError ? (variant === 'backdrop' ? getBackdropUrl(null) : getPosterUrl(null)) : imgSrc}
          alt={title}
          className="w-full h-full object-cover rounded-lg transition-transform duration-500 group-hover:scale-105 group-hover:brightness-75"
          loading="lazy"
          onError={() => setImageError(true)}
        />

        {/* Premium badge */}
        {isPremium && (
          <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-yellow-500/90 text-black">
            PREMIUM
          </div>
        )}

        {/* Bottom gradient + title (always visible on small screens, hidden on hover for desktop) */}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent rounded-b-lg pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-2">
          <p className="text-white text-[11px] font-semibold line-clamp-1">{title}</p>
        </div>
      </div>

      {/* Hover popup portal */}
      {hoverPopup && anchorRect && (
        <HoverPopup item={item} anchorRect={anchorRect} onClose={handlePopupClose} />
      )}
    </>
  );
}
