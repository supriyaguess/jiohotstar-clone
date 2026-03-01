import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { BsPlayFill, BsBookmark, BsBookmarkFill, BsArrowLeft } from 'react-icons/bs';
import { AiFillStar } from 'react-icons/ai';
import { MdAccessTime } from 'react-icons/md';
import { getMovieDetails, getTVDetails } from '../api/tmdb';
import {
  getBackdropUrl, getPosterUrl, formatDate, formatRuntime,
  getTitle, getReleaseDate, getYear, truncateText, getTrailerKey, formatRating, getRatingBg,
} from '../utils/helpers';
import ContentRow from '../components/ui/ContentRow';
import VideoModal from '../components/ui/VideoModal';
import { PageLoader } from '../components/ui/LoadingSpinner';
import { useApp } from '../context/AppContext';
import { PROFILE_SIZES, IMAGE_BASE_URL } from '../api/config';

export default function Detail() {
  const { type, id } = useParams();
  const navigate = useNavigate();
  const { toggleWatchlist, isInWatchlist } = useApp();
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showTrailer, setShowTrailer] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setDetails(null);
    const fetchFn = type === 'movie' ? getMovieDetails : getTVDetails;
    fetchFn(id)
      .then((res) => setDetails(res.data))
      .catch((err) => setError(err?.response?.data?.status_message || 'Failed to load content'))
      .finally(() => setLoading(false));
  }, [type, id]);

  if (loading) return <PageLoader />;
  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-hotstar-bg">
      <div className="text-center">
        <p className="text-red-400 text-xl mb-4">{error}</p>
        <button onClick={() => navigate(-1)} className="btn-subscribe px-6 py-2">Go Back</button>
      </div>
    </div>
  );
  if (!details) return null;

  const title = getTitle(details);
  const year = getYear(getReleaseDate(details));
  const trailerKey = getTrailerKey(details.videos);
  const inWatchlist = isInWatchlist(details.id, type);
  const rating = formatRating(details.vote_average);
  const cast = details.credits?.cast?.slice(0, 12) || [];
  const similar = details.similar?.results?.slice(0, 12).map((m) => ({ ...m, media_type: type })) || [];
  const genres = details.genres || [];
  const runtime = type === 'movie' ? formatRuntime(details.runtime) : null;
  const seasons = type === 'tv' ? `${details.number_of_seasons} Season${details.number_of_seasons !== 1 ? 's' : ''}` : null;

  return (
    <main className="min-h-screen bg-hotstar-bg">
      {/* Backdrop hero */}
      <div className="relative w-full h-[55vh] sm:h-[65vh] min-h-[400px]">
        <img
          src={imgError ? getPosterUrl(details.poster_path, 'xl') : getBackdropUrl(details.backdrop_path, 'lg')}
          alt={title}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
        {/* Overlay */}
        <div className="absolute inset-0 hero-overlay" />
        <div className="absolute inset-0 hero-overlay-bottom" />
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-20 left-4 sm:left-8 flex items-center gap-2 text-white/80 hover:text-white transition-colors bg-black/40 backdrop-blur-sm px-3 py-2 rounded-full"
        >
          <BsArrowLeft size={18} />
          <span className="text-sm">Back</span>
        </button>
      </div>

      {/* Detail content */}
      <div className="px-4 sm:px-8 lg:px-16 -mt-32 relative z-10 pb-20">
        <div className="flex flex-col sm:flex-row gap-6 sm:gap-10">
          {/* Poster */}
          <div className="flex-shrink-0 w-32 sm:w-44 md:w-52 self-start">
            <img
              src={getPosterUrl(details.poster_path, 'lg')}
              alt={title}
              className="w-full rounded-xl shadow-2xl border border-white/10"
            />
          </div>

          {/* Info */}
          <div className="flex-1 pt-2 sm:pt-36">
            {/* Genres */}
            <div className="flex flex-wrap gap-2 mb-3">
              {genres.map((g) => (
                <span key={g.id} className="genre-badge">{g.name}</span>
              ))}
            </div>

            {/* Title */}
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white mb-3 leading-tight">
              {title}
            </h1>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-3 mb-4 text-sm text-gray-400">
              {year && <span>{year}</span>}
              {runtime && (
                <span className="flex items-center gap-1">
                  <MdAccessTime size={14} />
                  {runtime}
                </span>
              )}
              {seasons && <span>{seasons}</span>}
              {details.vote_count > 0 && (
                <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold ${getRatingBg(details.vote_average)}`}>
                  <AiFillStar size={11} />
                  {rating} / 10
                </span>
              )}
              {details.status && (
                <span className="px-2 py-0.5 bg-white/10 rounded text-xs">{details.status}</span>
              )}
            </div>

            {/* Tagline */}
            {details.tagline && (
              <p className="text-gray-400 italic text-sm mb-3">"{details.tagline}"</p>
            )}

            {/* Overview */}
            <p className="text-gray-300 text-sm sm:text-base leading-relaxed mb-6 max-w-2xl">
              {details.overview || 'No description available.'}
            </p>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
              {trailerKey ? (
                <button onClick={() => setShowTrailer(true)} className="btn-play">
                  <BsPlayFill size={22} />
                  Watch Trailer
                </button>
              ) : (
                <button className="btn-play opacity-60 cursor-not-allowed" disabled>
                  <BsPlayFill size={22} />
                  No Trailer
                </button>
              )}
              <button
                onClick={() => toggleWatchlist({ ...details, media_type: type })}
                className="btn-info gap-2"
              >
                {inWatchlist ? <BsBookmarkFill size={18} className="text-purple-400" /> : <BsBookmark size={18} />}
                {inWatchlist ? 'Saved' : 'Save'}
              </button>
            </div>

            {/* Additional info */}
            {type === 'movie' && details.budget > 0 && (
              <div className="flex gap-6 text-sm">
                <div>
                  <span className="text-gray-500">Budget: </span>
                  <span className="text-gray-300">${(details.budget / 1e6).toFixed(0)}M</span>
                </div>
                {details.revenue > 0 && (
                  <div>
                    <span className="text-gray-500">Revenue: </span>
                    <span className="text-gray-300">${(details.revenue / 1e6).toFixed(0)}M</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Cast */}
        {cast.length > 0 && (
          <div className="mt-12">
            <h2 className="text-xl font-bold text-white mb-4">Cast</h2>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {cast.map((person) => (
                <div key={person.id} className="flex-shrink-0 w-20 sm:w-24 text-center">
                  <img
                    src={
                      person.profile_path
                        ? `${IMAGE_BASE_URL}/w185${person.profile_path}`
                        : `https://via.placeholder.com/100x150/1a1a2e/a1a1aa?text=${person.name[0]}`
                    }
                    alt={person.name}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover mx-auto mb-2 border-2 border-white/10"
                  />
                  <p className="text-white text-xs font-medium line-clamp-1">{person.name}</p>
                  <p className="text-gray-500 text-xs line-clamp-1">{person.character}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Similar content */}
        {similar.length > 0 && (
          <div className="mt-12 -mx-4 sm:-mx-8 lg:-mx-16">
            <ContentRow
              title="Similar Content"
              items={similar}
              cardVariant="poster"
            />
          </div>
        )}
      </div>

      {/* Trailer modal */}
      {showTrailer && trailerKey && (
        <VideoModal videoKey={trailerKey} onClose={() => setShowTrailer(false)} />
      )}
    </main>
  );
}
