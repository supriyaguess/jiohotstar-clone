import { tmdbAxios } from './config';

// ─── Trending ────────────────────────────────────────────────────────────────
export const getTrending = (mediaType = 'all', timeWindow = 'week') =>
  tmdbAxios.get(`/trending/${mediaType}/${timeWindow}`);

// ─── Movies ──────────────────────────────────────────────────────────────────
export const getPopularMovies = (page = 1) =>
  tmdbAxios.get('/movie/popular', { params: { page } });

export const getTopRatedMovies = (page = 1) =>
  tmdbAxios.get('/movie/top_rated', { params: { page } });

export const getUpcomingMovies = (page = 1) =>
  tmdbAxios.get('/movie/upcoming', { params: { page } });

export const getNowPlayingMovies = (page = 1) =>
  tmdbAxios.get('/movie/now_playing', { params: { page } });

export const getMovieDetails = (id) =>
  tmdbAxios.get(`/movie/${id}`, {
    params: { append_to_response: 'videos,credits,similar,images' },
  });

export const discoverMoviesByGenre = (genreId, page = 1) =>
  tmdbAxios.get('/discover/movie', {
    params: { with_genres: genreId, sort_by: 'popularity.desc', page },
  });

// ─── TV Shows ────────────────────────────────────────────────────────────────
export const getPopularTV = (page = 1) =>
  tmdbAxios.get('/tv/popular', { params: { page } });

export const getTopRatedTV = (page = 1) =>
  tmdbAxios.get('/tv/top_rated', { params: { page } });

export const getOnAirTV = (page = 1) =>
  tmdbAxios.get('/tv/on_the_air', { params: { page } });

export const getAiringTodayTV = (page = 1) =>
  tmdbAxios.get('/tv/airing_today', { params: { page } });

export const getTVDetails = (id) =>
  tmdbAxios.get(`/tv/${id}`, {
    params: { append_to_response: 'videos,credits,similar,images' },
  });

export const discoverTVByGenre = (genreId, page = 1) =>
  tmdbAxios.get('/discover/tv', {
    params: { with_genres: genreId, sort_by: 'popularity.desc', page },
  });

// ─── Genres ──────────────────────────────────────────────────────────────────
export const getMovieGenres = () => tmdbAxios.get('/genre/movie/list');
export const getTVGenres = () => tmdbAxios.get('/genre/tv/list');

// ─── Search ──────────────────────────────────────────────────────────────────
export const searchMulti = (query, page = 1) =>
  tmdbAxios.get('/search/multi', { params: { query, page, include_adult: false } });

export const searchMovies = (query, page = 1) =>
  tmdbAxios.get('/search/movie', { params: { query, page } });

export const searchTV = (query, page = 1) =>
  tmdbAxios.get('/search/tv', { params: { query, page } });
