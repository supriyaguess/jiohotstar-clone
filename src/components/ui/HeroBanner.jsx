import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { BsPlayFill } from 'react-icons/bs';
import { AiOutlineInfoCircle } from 'react-icons/ai';
import { MdVolumeOff, MdVolumeUp } from 'react-icons/md';
import { getBackdropUrl, getTitle, getReleaseDate, getYear, truncateText, formatRating } from '../../utils/helpers';
import { HeroSkeleton } from './LoadingSpinner';
import VideoModal from './VideoModal';

const AUTO_SLIDE_INTERVAL = 6000;

/**
 * Full-screen hero banner with auto-rotating featured content.
 * @param {Array} items - trending/featured items
 * @param {boolean} loading
 */
export default function HeroBanner({ items = [], loading = false }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const timerRef = useRef(null);
  const navigate = useNavigate();

  const featuredItems = items.slice(0, 8);
  const current = featuredItems[currentIndex];

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % featuredItems.length);
    setImageLoaded(false);
  }, [featuredItems.length]);

  // Auto-rotate
  useEffect(() => {
    if (isPaused || featuredItems.length <= 1) return;
    timerRef.current = setInterval(goToNext, AUTO_SLIDE_INTERVAL);
    return () => clearInterval(timerRef.current);
  }, [goToNext, isPaused, featuredItems.length]);

  if (loading) return <HeroSkeleton />;
  if (!current) return null;

  const mediaType = current.media_type || (current.title ? 'movie' : 'tv');
  const title = getTitle(current);
  const year = getYear(getReleaseDate(current));
  const overview = truncateText(current.overview, 25);
  const rating = formatRating(current.vote_average);
  const backdropUrl = getBackdropUrl(current.backdrop_path, 'lg');
  const genres = current.genre_ids?.slice(0, 3) || [];

  const handleDetail = () => navigate(`/detail/${mediaType}/${current.id}`);

  return (
    <section
      className="relative w-full h-[70vh] sm:h-[80vh] min-h-[500px] overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Background image */}
      <div className="absolute inset-0">
        <img
          key={current.id}
          src={backdropUrl}
          alt={title}
          className={`w-full h-full object-cover transition-opacity duration-700 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setImageLoaded(true)}
        />
        {/* Overlay gradients */}
        <div className="hero-overlay absolute inset-0" />
        <div className="hero-overlay-bottom absolute inset-0" />
      </div>

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col justify-end pb-16 px-6 sm:px-12 lg:px-20 max-w-3xl animate-slide-up">
        {/* Meta */}
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <span className="px-2 py-0.5 rounded text-xs font-bold text-black bg-yellow-400">
            {rating} ★
          </span>
          {year && <span className="text-gray-300 text-sm">{year}</span>}
          <span className="text-gray-400 text-sm capitalize">
            {mediaType === 'tv' ? 'TV Show' : 'Movie'}
          </span>
        </div>

        {/* Title */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white leading-tight mb-3 drop-shadow-lg">
          {title}
        </h1>

        {/* Overview */}
        <p className="text-gray-300 text-sm sm:text-base leading-relaxed mb-6 max-w-xl">
          {overview}
        </p>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowTrailer(true)}
            className="btn-play text-sm sm:text-base"
          >
            <BsPlayFill size={22} />
            Play Now
          </button>
          <button onClick={handleDetail} className="btn-info text-sm sm:text-base">
            <AiOutlineInfoCircle size={20} />
            More Info
          </button>
        </div>
      </div>

      {/* Slide indicators */}
      {featuredItems.length > 1 && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
          {featuredItems.map((_, i) => (
            <button
              key={i}
              onClick={() => { setCurrentIndex(i); setImageLoaded(false); }}
              className={`transition-all duration-300 rounded-full ${
                i === currentIndex
                  ? 'w-6 h-2 bg-purple-500'
                  : 'w-2 h-2 bg-white/30 hover:bg-white/60'
              }`}
            />
          ))}
        </div>
      )}

      {/* Trailer modal */}
      {showTrailer && (
        <VideoModal
          videoKey={null}
          onClose={() => setShowTrailer(false)}
        />
      )}
    </section>
  );
}
