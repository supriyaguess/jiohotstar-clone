import axios from 'axios';

export const TMDB_BASE_URL = import.meta.env.VITE_TMDB_BASE_URL || 'https://api.themoviedb.org/3';
export const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY || '';
export const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

export const BACKDROP_SIZES = {
  sm: `${IMAGE_BASE_URL}/w780`,
  md: `${IMAGE_BASE_URL}/w1280`,
  lg: `${IMAGE_BASE_URL}/original`,
};

export const POSTER_SIZES = {
  sm: `${IMAGE_BASE_URL}/w185`,
  md: `${IMAGE_BASE_URL}/w342`,
  lg: `${IMAGE_BASE_URL}/w500`,
  xl: `${IMAGE_BASE_URL}/w780`,
};

export const PROFILE_SIZES = {
  sm: `${IMAGE_BASE_URL}/w45`,
  md: `${IMAGE_BASE_URL}/w185`,
};

export const tmdbAxios = axios.create({
  baseURL: TMDB_BASE_URL,
  params: {
    api_key: TMDB_API_KEY,
    language: 'en-US',
  },
});

export const PLACEHOLDER_BACKDROP = 'https://via.placeholder.com/1280x720/1a1a2e/7c3aed?text=No+Image';
export const PLACEHOLDER_POSTER = 'https://via.placeholder.com/500x750/1a1a2e/7c3aed?text=No+Poster';
