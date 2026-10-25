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

// Inline SVGs: no third-party placeholder service to go down.
const placeholder = (w, h, label) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="100%" height="100%" fill="#1a1c24"/><text x="50%" y="50%" fill="#4b5060" font-family="sans-serif" font-size="${Math.round(w / 18)}" text-anchor="middle" dominant-baseline="middle">${label}</text></svg>`
  )}`;

export const PLACEHOLDER_BACKDROP = placeholder(1280, 720, 'No image');
export const PLACEHOLDER_POSTER = placeholder(500, 750, 'No poster');
