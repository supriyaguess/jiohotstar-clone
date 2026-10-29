import { createHash, timingSafeEqual } from 'node:crypto';
import { Router } from 'express';
import { env } from '../config/env.js';
import { AppError, asyncHandler } from '../middleware/errors.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { geminiConfigured } from '../services/gemini.js';
import { startSync, syncStatus } from '../rag/sync.js';

const router = Router();
router.use(rateLimit('internal', 20, 3600));

const digest = (s) => createHash('sha256').update(s).digest();

// Shared-secret check for the cron service. Digests are compared in constant time, so neither the
// token's content nor its length leaks through response timing.
function requireSyncToken(req, res, next) {
  if (env.sync.token.length < 32) return next(new AppError(503, 'Sync is not configured'));
  const given = req.get('x-sync-token') || '';
  if (!timingSafeEqual(digest(given), digest(env.sync.token))) return next(new AppError(401, 'Invalid sync token'));
  next();
}

// POST /api/internal/sync: refresh the chatbot's catalog index. Returns at once; the work runs in the background.
router.post('/sync', requireSyncToken, asyncHandler(async (req, res) => {
  if (!geminiConfigured()) throw new AppError(503, 'Gemini is not configured');
  const { started } = await startSync();
  if (!started) throw new AppError(409, 'A sync is already running');
  res.status(202).json({ status: 'started' });
}));

router.get('/sync/status', requireSyncToken, asyncHandler(async (req, res) => {
  res.json(await syncStatus());
}));

export default router;
