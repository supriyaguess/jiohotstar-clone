import { redis } from '../cache/redis.js';
import { AppError } from './errors.js';

// INCR + PEXPIRE in one atomic step, so a crash can never leave a counter without a TTL.
redis.defineCommand('hit', {
  numberOfKeys: 1,
  lua: `
    local c = redis.call('INCR', KEYS[1])
    if c == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
    return { c, redis.call('PTTL', KEYS[1]) }
  `,
});

/**
 * Fixed-window limiter backed by Redis, shared across all server instances.
 * Sends RateLimit-* headers and Retry-After; fails open if Redis is down.
 * @param {string} name   bucket name
 * @param {number} max    requests allowed per window
 * @param {number} windowSeconds
 * @param {(req) => string} [keyFn] defaults to the client IP
 */
export const rateLimit = (name, max, windowSeconds, keyFn = (req) => req.ip) => async (req, res, next) => {
  try {
    const [count, ttlMs] = await redis.hit(`rl:${name}:${keyFn(req)}`, windowSeconds * 1000);
    const resetSeconds = Math.max(1, Math.ceil(ttlMs / 1000));
    res.set({
      'RateLimit-Limit': String(max),
      'RateLimit-Remaining': String(Math.max(0, max - count)),
      'RateLimit-Reset': String(resetSeconds),
    });
    if (count > max) {
      res.set('Retry-After', String(resetSeconds));
      return next(new AppError(429, 'Too many requests, slow down'));
    }
  } catch { /* fail open */ }
  next();
};
