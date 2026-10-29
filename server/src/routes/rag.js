import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../middleware/errors.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { GeminiError, geminiConfigured } from '../services/gemini.js';
import { searchCatalog } from '../rag/retrieve.js';

const router = Router();
router.use(requireAuth);

const query = z.object({
  q: z.string().trim().min(2).max(200),
  type: z.enum(['movie', 'tv']).optional(),
  year: z.coerce.number().int().min(1900).max(2100).optional(),
  genre: z.string().trim().max(40).optional(),
  limit: z.coerce.number().int().min(1).max(20).default(8),
});

// GET /api/rag/search?q=slow burn space thriller&type=movie&year=2015
// Semantic (meaning-based) search over the catalog; the chatbot's retrieval step, also usable directly.
router.get('/search', rateLimit('rag-search', 30, 60, (req) => req.userId), asyncHandler(async (req, res) => {
  const { q, type, year, genre, limit } = query.parse(req.query);
  if (!geminiConfigured()) throw new AppError(503, 'Search is not configured');
  try {
    res.json({ results: await searchCatalog(q, { mediaType: type, yearMin: year, genre, limit }) });
  } catch (err) {
    if (err instanceof GeminiError) throw new AppError(503, 'The AI service is busy, please try again shortly');
    throw err;
  }
}));

export default router;
