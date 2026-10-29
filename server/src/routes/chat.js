import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { redis } from '../cache/redis.js';
import { requireAuth } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../middleware/errors.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { geminiConfigured } from '../services/gemini.js';
import { clearMessages, loadMessages, saveExchange, toContents } from '../chat/memory.js';
import { runTurn } from '../chat/orchestrator.js';

const router = Router();
router.use(requireAuth);

const body = z.object({
  message: z.string().trim().min(1).max(500),
  lang: z.enum(['en', 'hi', 'auto']).default('auto'),
});

const LOCK_TTL_SECONDS = 90;
const dailyLimit = () => Number(process.env.CHAT_DAILY_LIMIT) || 100;
const heartbeatMs = () => Number(process.env.CHAT_HEARTBEAT_MS) || 15_000;
const lockKey = (userId) => `chat:lock:${userId}`;

// One active stream per user. Fails open if Redis is down (the limiter does too).
async function acquireLock(userId) {
  const token = randomUUID();
  try {
    return (await redis.set(lockKey(userId), token, 'EX', LOCK_TTL_SECONDS, 'NX')) === 'OK' ? token : null;
  } catch { return 'unlocked'; }
}
const releaseLock = (userId, token) => redis
  .eval("if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) end return 0", 1, lockKey(userId), token)
  .catch(() => {});

async function overDailyCap(userId) {
  const key = `chat:day:${userId}:${new Date().toISOString().slice(0, 10)}`;
  try {
    const n = await redis.incr(key);
    if (n === 1) await redis.expire(key, 25 * 3600);
    return n > dailyLimit();
  } catch { return false; }
}

router.post('/',
  (req, res, next) => (geminiConfigured() ? next() : next(new AppError(503, 'Chatbot is not configured'))),
  rateLimit('chat', 10, 60, (req) => req.userId),
  asyncHandler(async (req, res) => {
    const { message, lang } = body.parse(req.body);
    const userId = req.userId;

    const token = await acquireLock(userId);
    if (!token) throw new AppError(429, 'Filmy is still answering your last message');
    let ending = false;
    let heartbeat;
    const finish = () => { clearInterval(heartbeat); return releaseLock(userId, token); };
    try {
      if (await overDailyCap(userId)) {
        throw new AppError(429, "You've reached today's chat limit, please come back tomorrow");
      }
      const history = toContents(await loadMessages(userId));

      res.status(200).set({
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      });
      res.flushHeaders();

      const aborter = new AbortController();
      res.on('close', () => { if (!ending) aborter.abort(); finish(); });
      const open = () => !res.writableEnded && !res.destroyed;
      const emit = (event, data) => { if (open()) res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`); };
      heartbeat = setInterval(() => { if (open()) res.write(': ping\n\n'); }, heartbeatMs());

      const result = await runTurn({ userId, message, lang, history, emit, signal: aborter.signal, log: req.log });
      if (result.ok && !aborter.signal.aborted) {
        await saveExchange(userId, message, result.text, result.titles);
        emit('done', {});
      }
      ending = true;
      await finish();
      if (open()) res.end();
    } catch (err) {
      await finish();
      if (res.headersSent) { // already streaming: report in-band, never leak details
        if (!res.writableEnded) res.end('event: error\ndata: {"code":"internal","message":"Something went wrong on my side, please try again"}\n\n');
        return;
      }
      throw err; // before headers: normal JSON error via the shared handler
    }
  }));

router.get('/history', asyncHandler(async (req, res) => {
  res.json({ messages: await loadMessages(req.userId) });
}));

router.delete('/', asyncHandler(async (req, res) => {
  await clearMessages(req.userId);
  res.status(204).end();
}));

export default router;
