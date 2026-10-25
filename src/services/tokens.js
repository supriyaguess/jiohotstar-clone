import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { RefreshToken } from '../db/models.js';

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

export const signAccessToken = (userId) =>
  jwt.sign({ sub: String(userId) }, env.jwtSecret, { algorithm: 'HS256', expiresIn: env.accessTtl });

export async function issueRefreshToken(userId) {
  const raw = crypto.randomBytes(48).toString('base64url');
  await RefreshToken.create({
    userId,
    tokenHash: sha256(raw),
    expiresAt: new Date(Date.now() + env.refreshTtlDays * 86400_000),
  });
  return raw;
}

const REUSE_GRACE_MS = 10_000; // two tabs refreshing at once must not look like theft

/**
 * Rotation with reuse detection. A token works once; it is then kept (marked used) so that
 * a replay is recognised. Replaying outside the grace window means the cookie was likely
 * stolen, so every session of that user is revoked.
 */
export async function consumeRefreshToken(raw) {
  const tokenHash = sha256(raw);
  const now = new Date();
  const fresh = await RefreshToken.findOneAndUpdate(
    { tokenHash, usedAt: null, expiresAt: { $gt: now } }, { usedAt: now }
  );
  if (fresh) return fresh.userId;

  const replayed = await RefreshToken.findOne({ tokenHash });
  if (replayed?.usedAt && now - replayed.usedAt > REUSE_GRACE_MS) {
    await RefreshToken.deleteMany({ userId: replayed.userId });
  }
  return null;
}

export const revokeRefreshToken = (raw) => RefreshToken.deleteOne({ tokenHash: sha256(raw) });

export const refreshCookieOptions = {
  httpOnly: true,
  secure: env.isProd,
  sameSite: env.isProd ? 'none' : 'lax', // prod frontend is on a different domain
  path: '/api/auth',
  maxAge: env.refreshTtlDays * 86400_000,
};
