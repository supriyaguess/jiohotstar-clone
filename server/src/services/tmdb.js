import { env } from '../config/env.js';
import { AppError } from '../middleware/errors.js';

export async function tmdb(path, params = {}) {
  const url = new URL(env.tmdb.baseUrl + path);
  url.search = new URLSearchParams({ api_key: env.tmdb.key, language: 'en-US', ...params }).toString();
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) }).catch(() => null);
  if (!res) throw new AppError(504, 'Catalog provider unreachable');
  if (res.status === 404) throw new AppError(404, 'Not found');
  if (!res.ok) throw new AppError(502, 'Catalog provider error');
  return res.json();
}
