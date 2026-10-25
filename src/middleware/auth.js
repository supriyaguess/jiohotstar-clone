import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from './errors.js';

/**
 * CSRF defence for the cookie-authenticated endpoints (refresh/logout): browsers always send
 * Origin on cross-site POSTs, so reject any that is not our frontend.
 */
export function requireTrustedOrigin(req, res, next) {
  const origin = req.headers.origin;
  if (origin && origin !== env.frontendUrl) return next(new AppError(403, 'Untrusted origin'));
  next();
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next(new AppError(401, 'Missing access token'));
  try {
    const payload = jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'] });
    req.userId = payload.sub;
    next();
  } catch {
    next(new AppError(401, 'Invalid or expired access token'));
  }
}
