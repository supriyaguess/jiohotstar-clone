// Catalog data is served by our backend (which proxies + caches TMDB), so no API key lives in the browser.
import { api } from './client';

const list = (type, name) => (page = 1) => api.get(`/catalog/list/${type}/${name}`, { params: { page } });
const title = (type) => (id) => api.get(`/catalog/title/${type}/${id}`);
const discover = (type) => (genre, page = 1) => api.get(`/catalog/discover/${type}`, { params: { genre, page } });

// ─── Trending ────────────────────────────────────────────────────────────────
export const getTrending = (mediaType = 'all', timeWindow = 'week') =>
  api.get(`/catalog/trending/${mediaType}/${timeWindow}`);

// ─── Movies ──────────────────────────────────────────────────────────────────
export const getPopularMovies = list('movie', 'popular');
export const getTopRatedMovies = list('movie', 'top_rated');
export const getUpcomingMovies = list('movie', 'upcoming');
export const getNowPlayingMovies = list('movie', 'now_playing');
export const getMovieDetails = title('movie');
export const discoverMoviesByGenre = discover('movie');

// ─── TV Shows ────────────────────────────────────────────────────────────────
export const getPopularTV = list('tv', 'popular');
export const getTopRatedTV = list('tv', 'top_rated');
export const getOnAirTV = list('tv', 'on_the_air');
export const getAiringTodayTV = list('tv', 'airing_today');
export const getTVDetails = title('tv');
export const discoverTVByGenre = discover('tv');

// ─── Genres ──────────────────────────────────────────────────────────────────
export const getMovieGenres = () => api.get('/catalog/genres/movie');
export const getTVGenres = () => api.get('/catalog/genres/tv');

// ─── Search ──────────────────────────────────────────────────────────────────
export const searchMulti = (query, page = 1) => api.get('/catalog/search', { params: { q: query, page } });
