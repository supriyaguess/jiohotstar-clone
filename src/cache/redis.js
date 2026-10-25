import Redis from 'ioredis';
import { env } from '../config/env.js';

export const redis = new Redis(env.redisUrl, { maxRetriesPerRequest: 2 });
redis.on('error', (err) => console.error('[redis]', err.message));

const inflight = new Map();

/**
 * Read-through cache. Redis failures never break the request, and concurrent misses for the
 * same key share one upstream call (prevents a cache stampede on TMDB when an entry expires).
 */
export async function cached(key, ttlSeconds, loader) {
  try {
    const hit = await redis.get(key);
    if (hit) return JSON.parse(hit);
  } catch { /* fall through to loader */ }

  if (!inflight.has(key)) {
    const load = loader()
      .then((value) => {
        redis.set(key, JSON.stringify(value), 'EX', ttlSeconds).catch(() => {});
        return value;
      })
      .finally(() => inflight.delete(key));
    inflight.set(key, load);
  }
  return inflight.get(key);
}
