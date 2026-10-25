import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { BsPlayFill, BsPlusLg, BsCheckLg, BsChevronRight } from 'react-icons/bs';
import { getMovieDetails, getTVDetails } from '../../api/tmdb';
import {
  getTrailerKey, getBackdropUrl, getTitle, getReleaseDate, getYear, truncateText, formatRating,
} from '../../utils/helpers';
import { MOVIE_GENRES, TV_GENRES } from '../../constants';
import { useApp } from '../../context/AppContext';
import { HeroSkeleton } from './LoadingSpinner';
import VideoModal from './VideoModal';

const AUTO_SLIDE_INTERVAL = 6000;
const THUMBS_VISIBLE = 6;
const GENRE_NAMES = Object.fromEntries([...MOVIE_GENRES, ...TV_GENRES].map((g) => [g.id, g.name]));

/**
 * Full-bleed hero (JioHotstar style): title + meta on the left, rotating thumbnail strip bottom-right.
 * On desktop it slides under the 96px sidebar rail, so the section is pulled left by the rail width.
 */
export default function HeroBanner({ items = [], loading = false }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [trailerKey, setTrailerKey] = useState(null);
  const [playLoading, setPlayLoading] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const timerRef = useRef(null);
  const navigate = useNavigate();
  const { requireAuth, toggleWatchlist, isInWatchlist } = useApp();

  const featuredItems = items.slice(0, 8);
  const current = featuredItems[currentIndex];

  const goTo = useCallback((index) => {
    setCurrentIndex(index);
    setImageLoaded(false);
  }, []);

  // Auto-rotate
  useEffect(() => {
    if (isPaused || featuredItems.length <= 1) return;
    timerRef.current = setInterval(() => goTo((currentIndex + 1) % featuredItems.length), AUTO_SLIDE_INTERVAL);
    return () => clearInterval(timerRef.current);
  }, [goTo, currentIndex, isPaused, featuredItems.length]);

  if (loading) return <HeroSkeleton />;
  if (!current) return null;

  const mediaType = current.media_type || (current.title ? 'movie' : 'tv');
  const title = getTitle(current);
  const year = getYear(getReleaseDate(current));
  const overview = truncateText(current.overview, 28);
  const rating = formatRating(current.vote_average);
  const genres = (current.genre_ids || []).map((id) => GENRE_NAMES[id]).filter(Boolean).slice(0, 3);
  const inList = isInWatchlist(current.id, mediaType);
  // Window of thumbnails that always contains the active one
  const thumbStart = Math.min(Math.max(0, currentIndex - 2), Math.max(0, featuredItems.length - THUMBS_VISIBLE));
  const thumbs = featuredItems.slice(thumbStart, thumbStart + THUMBS_VISIBLE);

  const handleDetail = () => navigate(`/detail/${mediaType}/${current.id}`);

  // Look up the real trailer; fall back to the detail page when there isn't one.
  const handlePlay = async () => {
    setPlayLoading(true);
    try {
      const { data } = await (mediaType === 'movie' ? getMovieDetails : getTVDetails)(current.id);
      const key = getTrailerKey(data.videos);
      if (key) setTrailerKey(key);
      else handleDetail();
    } catch {
      handleDetail();
    } finally {
      setPlayLoading(false);
    }
  };

  return (
    <section
      className="relative h-[78vh] sm:h-[85vh] min-h-[520px] max-h-[900px] overflow-hidden md:-ml-24 md:w-[calc(100%+6rem)]"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Backdrop */}
      <img
        key={current.id}
        src={getBackdropUrl(current.backdrop_path, 'lg')}
        alt=""
        className={`absolute inset-0 w-full h-full object-cover object-[70%_center] md:object-center transition-opacity duration-700 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setImageLoaded(true)}
      />
      {/* Scrims: left for text, bottom to melt into the page, top for the rail logo */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, #0f1014 0%, rgba(15,16,20,0.85) 22%, rgba(15,16,20,0.25) 55%, transparent 80%)' }} />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(0deg, #0f1014 0%, rgba(15,16,20,0.55) 22%, transparent 55%)' }} />
      <div className="absolute inset-x-0 top-0 h-32" style={{ background: 'linear-gradient(180deg, rgba(15,16,20,0.7), transparent)' }} />

      {/* Text + actions (padding matches the content rows below; md:pl-24 clears the rail we slid under) */}
      <div className="relative z-10 h-full flex flex-col justify-end pb-14 sm:pb-20 px-4 sm:px-8 lg:px-12 md:pl-[calc(6rem+2rem)] lg:pl-[calc(6rem+3rem)] animate-slide-up" key={`t-${current.id}`}>
        <div className="max-w-2xl">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-[1.05] mb-4 drop-shadow-lg line-clamp-3">
            {title}
          </h1>

          <p className="flex flex-wrap items-center gap-x-2 text-sm sm:text-base font-semibold text-white mb-3">
            {year && <span>{year}</span>}
            <span className="text-white/50">•</span>
            <span>{mediaType === 'tv' ? 'TV Show' : 'Movie'}</span>
            <span className="text-white/50">•</span>
            <span className="inline-flex items-center gap-1">★ {rating}</span>
          </p>

          <p className="text-[#c9ceda] text-sm sm:text-base leading-relaxed mb-3 max-w-xl line-clamp-3">{overview}</p>

          {genres.length > 0 && (
            <p className="text-sm sm:text-base font-semibold text-white mb-6">{genres.join(' | ')}</p>
          )}

          <div className="flex items-center gap-3">
            <button onClick={() => requireAuth(handlePlay)} disabled={playLoading} className="btn-watch">
              <BsPlayFill size={26} />
              {playLoading ? 'Loading...' : 'Watch Now'}
            </button>
            <button
              onClick={() => requireAuth(() => toggleWatchlist({ ...current, media_type: mediaType }))}
              className="btn-square"
              aria-label={inList ? 'Remove from My List' : 'Add to My List'}
              title={inList ? 'Remove from My List' : 'Add to My List'}
            >
              {inList ? <BsCheckLg size={22} /> : <BsPlusLg size={22} />}
            </button>
          </div>
        </div>
      </div>

      {/* Thumbnail strip: only where there is room beside the buttons (>= 1280px) */}
      {featuredItems.length > 1 && (
        <div className="hidden xl:flex absolute z-10 right-12 bottom-20 items-center gap-2">
          {thumbs.map((item, k) => (
            <button
              key={item.id}
              onClick={() => goTo(thumbStart + k)}
              aria-label={`Show ${getTitle(item)}`}
              className={`block w-[84px] h-[48px] rounded-md overflow-hidden transition-all duration-200 flex-shrink-0 ${
                thumbStart + k === currentIndex ? 'ring-2 ring-white scale-110' : 'opacity-70 hover:opacity-100'
              }`}
            >
              <img src={getBackdropUrl(item.backdrop_path, 'sm')} alt="" loading="lazy" className="w-full h-full object-cover" />
            </button>
          ))}
          <button
            onClick={() => goTo((currentIndex + 1) % featuredItems.length)}
            className="w-9 h-9 flex items-center justify-center text-white/80 hover:text-white"
            aria-label="Next"
          >
            <BsChevronRight size={20} />
          </button>
        </div>
      )}

      {/* Dots (below xl, where the strip is hidden) */}
      {featuredItems.length > 1 && (
        <div className="xl:hidden absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
          {featuredItems.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Slide ${i + 1}`}
              className={`h-1.5 rounded-full transition-all duration-300 ${i === currentIndex ? 'w-6 bg-white' : 'w-1.5 bg-white/40'}`}
            />
          ))}
        </div>
      )}

      {trailerKey && (
        <VideoModal
          videoKey={trailerKey}
          item={{ ...current, media_type: mediaType }}
          onClose={() => setTrailerKey(null)}
        />
      )}
    </section>
  );
}
