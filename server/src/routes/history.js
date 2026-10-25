import { Router } from 'express';
import { z } from 'zod';
import { WatchHistory } from '../db/models.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errors.js';

const router = Router();
router.use(requireAuth);

const body = z.object({
  id: z.number().int().positive(),
  media_type: z.enum(['movie', 'tv']),
  title: z.string().min(1),
  poster_path: z.string().nullish(),
  backdrop_path: z.string().nullish(),
  progress_seconds: z.number().int().min(0),
  duration_seconds: z.number().int().positive().nullish(),
});

// "Continue watching" row: most recently touched first.
router.get('/', asyncHandler(async (req, res) => {
  const rows = await WatchHistory.find({ userId: req.userId }).sort({ updatedAt: -1 }).limit(30);
  res.json(rows.map((h) => ({
    id: h.tmdbId, media_type: h.mediaType, title: h.title, poster_path: h.posterPath,
    backdrop_path: h.backdropPath, progress_seconds: h.progressSeconds,
    duration_seconds: h.durationSeconds ?? null, updated_at: h.updatedAt,
  })));
}));

// Upsert progress; the player can call this every ~15s.
router.put('/', asyncHandler(async (req, res) => {
  const b = body.parse(req.body);
  const set = {
    title: b.title, posterPath: b.poster_path ?? null, backdropPath: b.backdrop_path ?? null,
    progressSeconds: b.progress_seconds,
  };
  if (b.duration_seconds) set.durationSeconds = b.duration_seconds;
  await WatchHistory.updateOne(
    { userId: req.userId, mediaType: b.media_type, tmdbId: b.id }, { $set: set }, { upsert: true }
  );
  res.status(204).end();
}));

router.delete('/:type/:id', asyncHandler(async (req, res) => {
  const t = z.enum(['movie', 'tv']).parse(req.params.type);
  const id = z.coerce.number().int().parse(req.params.id);
  await WatchHistory.deleteOne({ userId: req.userId, mediaType: t, tmdbId: id });
  res.status(204).end();
}));

export default router;
