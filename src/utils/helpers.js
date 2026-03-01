import { BACKDROP_SIZES, POSTER_SIZES, PLACEHOLDER_BACKDROP, PLACEHOLDER_POSTER } from '../api/config';

/**
 * Get full TMDB backdrop image URL
 */
export const getBackdropUrl = (path, size = 'md') => {
  if (!path) return PLACEHOLDER_BACKDROP;
  return `${BACKDROP_SIZES[size]}${path}`;
};

/**
 * Get full TMDB poster image URL
 */
export const getPosterUrl = (path, size = 'lg') => {
  if (!path) return PLACEHOLDER_POSTER;
  return `${POSTER_SIZES[size]}${path}`;
};

/**
 * Format a date string to readable format
 */
export const formatDate = (dateStr) => {
  if (!dateStr) return 'Unknown';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

/**
 * Extract year from date string
 */
export const getYear = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).getFullYear();
};

/**
 * Truncate text to a max number of words
 */
export const truncateText = (text, maxWords = 30) => {
  if (!text) return '';
  const words = text.split(' ');
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(' ') + '…';
};

/**
 * Format runtime in minutes to "Xh Ym"
 */
export const formatRuntime = (minutes) => {
  if (!minutes) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
};

/**
 * Get Tailwind color class based on vote_average
 */
export const getRatingColor = (rating) => {
  if (rating >= 7.5) return 'text-green-400';
  if (rating >= 6) return 'text-yellow-400';
  return 'text-red-400';
};

/**
 * Get rating badge bg color
 */
export const getRatingBg = (rating) => {
  if (rating >= 7.5) return 'bg-green-500/20 text-green-400 border border-green-500/30';
  if (rating >= 6) return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
  return 'bg-red-500/20 text-red-400 border border-red-500/30';
};

/**
 * Get media title (movies use 'title', TV uses 'name')
 */
export const getTitle = (item) => item?.title || item?.name || 'Untitled';

/**
 * Get media release date (movies use 'release_date', TV uses 'first_air_date')
 */
export const getReleaseDate = (item) => item?.release_date || item?.first_air_date || '';

/**
 * Get media type label
 */
export const getMediaTypeLabel = (mediaType) => {
  const labels = { movie: 'Movie', tv: 'TV Show', person: 'Person' };
  return labels[mediaType] || mediaType;
};

/**
 * Extract YouTube trailer key from videos array
 */
export const getTrailerKey = (videos) => {
  if (!videos?.results?.length) return null;
  const trailer = videos.results.find(
    (v) => v.type === 'Trailer' && v.site === 'YouTube'
  );
  const teaser = videos.results.find(
    (v) => v.type === 'Teaser' && v.site === 'YouTube'
  );
  return trailer?.key || teaser?.key || videos.results[0]?.key || null;
};

/**
 * Format vote average to one decimal
 */
export const formatRating = (rating) => {
  if (!rating) return 'N/A';
  return rating.toFixed(1);
};

/**
 * Format number with K/M suffix
 */
export const formatCount = (count) => {
  if (!count) return '0';
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return count.toString();
};
