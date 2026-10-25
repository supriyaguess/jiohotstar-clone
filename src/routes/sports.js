import { Router } from 'express';
import { cached } from '../cache/redis.js';
import { asyncHandler } from '../middleware/errors.js';
import { getMatches } from '../services/sports.js';

const router = Router();
router.get('/matches', asyncHandler(async (req, res) => {
  res.json(await cached('sports:matches', 30, getMatches));
}));
export default router;
