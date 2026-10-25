import crypto from 'node:crypto';
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { OAuth2Client, CodeChallengeMethod } from 'google-auth-library';
import { env } from '../config/env.js';
import { User } from '../db/models.js';
import { redis } from '../cache/redis.js';
import { AppError, asyncHandler } from '../middleware/errors.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { requireTrustedOrigin } from '../middleware/auth.js';
import { findById, findByEmail, publicUser, upsertGoogleUser } from '../services/users.js';
import {
  signAccessToken, issueRefreshToken, consumeRefreshToken, revokeRefreshToken, refreshCookieOptions,
} from '../services/tokens.js';

const router = Router();
router.use(rateLimit('auth', 30, 60));

const COOKIE = 'hs_refresh';

async function startSession(res, user) {
  const refresh = await issueRefreshToken(user._id);
  res.cookie(COOKIE, refresh, refreshCookieOptions);
  return { accessToken: signAccessToken(user._id), user: await publicUser(user) };
}

// ── Email + password ────────────────────────────────────────────────────────
// bcrypt only reads the first 72 bytes, so longer passwords would be silently truncated.
const password = z.string().min(8).refine((p) => Buffer.byteLength(p) <= 72, 'Password must be at most 72 bytes');

// Compared against when the email is unknown so response time doesn't reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12);

const signupSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(254),
  password,
});

router.post('/signup', asyncHandler(async (req, res) => {
  const { name, email, password } = signupSchema.parse(req.body);
  if (await findByEmail(email)) throw new AppError(409, 'An account with this email already exists');
  const hash = await bcrypt.hash(password, 12);
  const user = await User.create({ email, name, passwordHash: hash });
  res.status(201).json(await startSession(res, user));
}));

const loginSchema = z.object({ email: z.string().trim().email(), password: z.string().min(1) });

// Brute-force guard: per client+account, on top of the per-IP limit above.
const loginLimit = rateLimit('login', 10, 900, (req) => `${req.ip}:${String(req.body?.email ?? '').toLowerCase()}`);

router.post('/login', loginLimit, asyncHandler(async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  const user = await findByEmail(email);
  // Same error for unknown email / Google-only account / wrong password.
  const matches = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user?.passwordHash || !matches) throw new AppError(401, 'Invalid email or password');
  res.json(await startSession(res, user));
}));

// ── Google OAuth (authorization code + PKCE) ────────────────────────────────
const googleClient = () => {
  if (!env.google.clientId || !env.google.clientSecret) throw new AppError(501, 'Google login is not configured');
  return new OAuth2Client(env.google.clientId, env.google.clientSecret, `${env.apiUrl}/api/auth/google/callback`);
};

router.get('/google', asyncHandler(async (req, res) => {
  const client = googleClient();
  const state = crypto.randomBytes(24).toString('base64url');
  const { codeVerifier, codeChallenge } = await client.generateCodeVerifierAsync();
  await redis.set(`oauth:${state}`, codeVerifier, 'EX', 600);
  res.redirect(client.generateAuthUrl({
    scope: ['openid', 'email', 'profile'],
    state,
    code_challenge: codeChallenge,
    code_challenge_method: CodeChallengeMethod.S256,
    prompt: 'select_account',
  }));
}));

router.get('/google/callback', asyncHandler(async (req, res) => {
  const fail = (reason) => res.redirect(`${env.frontendUrl}/login?error=${reason}`);
  const { code, state, error } = req.query;
  if (error || typeof code !== 'string' || typeof state !== 'string') return fail('google_denied');

  const verifier = await redis.getdel(`oauth:${state}`); // single-use state
  if (!verifier) return fail('invalid_state');

  const client = googleClient();
  try {
    const { tokens } = await client.getToken({ code, codeVerifier: verifier });
    const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: env.google.clientId });
    const p = ticket.getPayload();
    if (!p?.email || !p.email_verified) return fail('email_unverified');
    const user = await upsertGoogleUser({ sub: p.sub, email: p.email, name: p.name, picture: p.picture });
    res.cookie(COOKIE, await issueRefreshToken(user._id), refreshCookieOptions);
  } catch (err) {
    req.log.error({ err: err.message }, 'google oauth failed');
    return fail('google_failed');
  }
  // Frontend lands here, then calls POST /api/auth/refresh to get its access token.
  res.redirect(`${env.frontendUrl}/auth/callback`);
}));

// ── Session ─────────────────────────────────────────────────────────────────
router.post('/refresh', requireTrustedOrigin, asyncHandler(async (req, res) => {
  const raw = req.cookies[COOKIE];
  const userId = raw && (await consumeRefreshToken(raw));
  const user = userId && (await findById(userId));
  if (!user) {
    res.clearCookie(COOKIE, { ...refreshCookieOptions, maxAge: undefined });
    throw new AppError(401, 'Session expired');
  }
  res.json(await startSession(res, user)); // rotates the refresh token
}));

router.post('/logout', requireTrustedOrigin, asyncHandler(async (req, res) => {
  const raw = req.cookies[COOKIE];
  if (raw) await revokeRefreshToken(raw);
  res.clearCookie(COOKIE, { ...refreshCookieOptions, maxAge: undefined });
  res.status(204).end();
}));

export default router;
