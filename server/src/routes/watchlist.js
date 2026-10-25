import { Router } from 'express';
import { z } from 'zod';
import { WatchlistItem } from '../db/models.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errors.js';

const router = Router();
router.use(requireAuth);

const mediaType = z.enum(['movie', 'tv']);
// Accepts the TMDB-shaped objects the frontend already holds (title|name, release_date|first_air_date).
const item = z.object({
  id: z.number().int().positive(),
  media_type: mediaType,
  title: z.string().optional(),
  name: z.string().optional(),
  poster_path: z.string().nullish(),
  backdrop_path: z.string().nullish(),
  vote_average: z.number().nullish(),
  release_date: z.string().nullish(),
  first_air_date: z.string().nullish(),
});

// Insert only if missing, so re-adding never reorders or overwrites.
const insert = (userId, i) => {
  const doc = {
    userId,
    tmdbId: i.id,
    mediaType: i.media_type,
    title: i.title || i.name || 'Untitled',
    posterPath: i.poster_path ?? null,
    backdropPath: i.backdrop_path ?? null,
    voteAverage: i.vote_average ?? null,
    releaseDate: i.release_date || i.first_air_date || null,
  };
  return WatchlistItem.updateOne(
    { userId, mediaType: doc.mediaType, tmdbId: doc.tmdbId }, { $setOnInsert: doc }, { upsert: true }
  );
};

// TMDB-shaped output so existing cards can render it unchanged.
const out = (w) => ({
  id: w.tmdbId, media_type: w.mediaType, title: w.title, poster_path: w.posterPath,
  backdrop_path: w.backdropPath, vote_average: w.voteAverage, release_date: w.releaseDate,
});

router.get('/', asyncHandler(async (req, res) => {
  const rows = await WatchlistItem.find({ userId: req.userId }).sort({ createdAt: -1 });
  res.json(rows.map(out));
}));

router.post('/', asyncHandler(async (req, res) => {
  await insert(req.userId, item.parse(req.body));
  res.status(201).end();
}));

// One-time import of the old localStorage watchlist after first login.
router.post('/bulk', asyncHandler(async (req, res) => {
  const items = z.array(item).max(500).parse(req.body);
  for (const i of items) await insert(req.userId, i);
  res.status(201).json({ imported: items.length });
}));

router.delete('/:type/:id', asyncHandler(async (req, res) => {
  const t = mediaType.parse(req.params.type);
  const id = z.coerce.number().int().parse(req.params.id);
  await WatchlistItem.deleteOne({ userId: req.userId, mediaType: t, tmdbId: id });
  res.status(204).end();
}));

export default router;
