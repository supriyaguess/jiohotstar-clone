import { Router } from 'express';
import { z } from 'zod';
import { cached } from '../cache/redis.js';
import { asyncHandler, AppError } from '../middleware/errors.js';
import { tmdb } from '../services/tmdb.js';

const router = Router();

const HOUR = 3600;
const LISTS = {
  movie: ['popular', 'top_rated', 'upcoming', 'now_playing'],
  tv: ['popular', 'top_rated', 'on_the_air', 'airing_today'],
};
const type = z.enum(['movie', 'tv']);
const page = z.coerce.number().int().min(1).max(500).default(1);
const id = z.coerce.number().int().positive();

const proxy = (key, ttl, path, params) => cached(`tmdb:${key}`, ttl, () => tmdb(path, params));

// GET /api/catalog/trending/all/week
router.get('/trending/:mediaType/:window', asyncHandler(async (req, res) => {
  const mediaType = z.enum(['all', 'movie', 'tv']).parse(req.params.mediaType);
  const window = z.enum(['day', 'week']).parse(req.params.window);
  res.json(await proxy(`trending:${mediaType}:${window}`, HOUR, `/trending/${mediaType}/${window}`));
}));

// GET /api/catalog/list/movie/popular?page=1
router.get('/list/:type/:list', asyncHandler(async (req, res) => {
  const t = type.parse(req.params.type);
  const list = req.params.list;
  if (!LISTS[t].includes(list)) throw new AppError(404, 'Unknown list');
  const p = page.parse(req.query.page);
  res.json(await proxy(`list:${t}:${list}:${p}`, HOUR, `/${t}/${list}`, { page: p }));
}));

// GET /api/catalog/discover/movie?genre=28&page=1
router.get('/discover/:type', asyncHandler(async (req, res) => {
  const t = type.parse(req.params.type);
  const genre = id.parse(req.query.genre);
  const p = page.parse(req.query.page);
  res.json(await proxy(`discover:${t}:${genre}:${p}`, HOUR, `/discover/${t}`, {
    with_genres: genre, sort_by: 'popularity.desc', page: p,
  }));
}));

router.get('/genres/:type', asyncHandler(async (req, res) => {
  const t = type.parse(req.params.type);
  res.json(await proxy(`genres:${t}`, 24 * HOUR, `/genre/${t}/list`));
}));

// GET /api/catalog/search?q=inception&page=1
router.get('/search', asyncHandler(async (req, res) => {
  const q = z.string().trim().min(1).max(100).parse(req.query.q);
  const p = page.parse(req.query.page);
  res.json(await proxy(`search:${q.toLowerCase()}:${p}`, 10 * 60, '/search/multi', {
    query: q, page: p, include_adult: false,
  }));
}));

// GET /api/catalog/title/movie/603  (details + videos, credits, similar, images)
router.get('/title/:type/:id', asyncHandler(async (req, res) => {
  const t = type.parse(req.params.type);
  const tid = id.parse(req.params.id);
  res.json(await proxy(`title:${t}:${tid}`, 6 * HOUR, `/${t}/${tid}`, {
    append_to_response: 'videos,credits,similar,images',
  }));
}));

export default router;
