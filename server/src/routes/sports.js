import { Router } from 'express';
import { z } from 'zod';
import { cached } from '../cache/redis.js';
import { asyncHandler } from '../middleware/errors.js';
import { SPORT_KEYS, getFixtures, getTitles } from '../services/sports.js';

const router = Router();
const sport = z.enum(SPORT_KEYS).optional();

// GET /api/sports/fixtures?sport=cricket  (real fixtures/results; day lookups are cached in the service)
router.get('/fixtures', asyncHandler(async (req, res) => {
  res.json(await getFixtures(sport.parse(req.query.sport)));
}));

// GET /api/sports/titles?sport=kabaddi  (TMDB documentaries/films/series for the video-style rows)
router.get('/titles', asyncHandler(async (req, res) => {
  const s = sport.parse(req.query.sport);
  const empty = { movies: [], shows: [] };
  // Throwing on an all-empty result keeps an upstream blip from being cached for 6 hours.
  const data = await cached(`sports:titles:${s || 'all'}`, 6 * 3600, async () => {
    const t = await getTitles(s);
    if (!t.movies.length && !t.shows.length) throw new Error('empty');
    return t;
  }).catch(() => empty);
  res.json(data);
}));

export default router;
