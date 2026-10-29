import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import pinoHttp from 'pino-http';
import { randomUUID } from 'node:crypto';
import { env } from './config/env.js';
import mongoose from 'mongoose';
import { redis } from './cache/redis.js';
import { errorHandler, notFound } from './middleware/errors.js';
import { rateLimit } from './middleware/rateLimit.js';
import authRoutes from './routes/auth.js';
import catalogRoutes from './routes/catalog.js';
import meRoutes from './routes/me.js';
import watchlistRoutes from './routes/watchlist.js';
import historyRoutes from './routes/history.js';
import sportsRoutes from './routes/sports.js';
import internalRoutes from './routes/internal.js';
import ragRoutes from './routes/rag.js';
import { geminiConfigured } from './services/gemini.js';
import { syncStatus } from './rag/sync.js';

export function createApp(logStream) {
const app = express();
app.set('trust proxy', env.trustProxy);
// Logs carry method, path and status only: no headers (Authorization/cookies/Set-Cookie),
// no query string (the Google callback URL holds the OAuth code + state), no bodies (passwords).
app.use(pinoHttp({
  level: env.logLevel,
  genReqId: (req, res) => {
    const id = req.headers['x-request-id'] || randomUUID();
    res.setHeader('X-Request-Id', id);
    return id;
  },
  autoLogging: { ignore: (req) => req.url === '/health' },
  serializers: {
    req: (req) => ({ id: req.id, method: req.method, url: req.url.split('?')[0], ip: req.remoteAddress }),
    res: (res) => ({ statusCode: res.statusCode }),
  },
  redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'], // belt and braces
}, logStream));
app.use(helmet());
app.use(compression());
app.use(cors({ origin: env.frontendUrl, credentials: true }));
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

app.get('/health', async (req, res) => {
  const [db, cache] = await Promise.allSettled([mongoose.connection.db.admin().ping(), redis.ping()]);
  const ok = db.status === 'fulfilled' && cache.status === 'fulfilled';
  const body = { db: db.status, redis: cache.status };
  if (ok && geminiConfigured()) { // chatbot index freshness: "stale" if the daily sync hasn't completed in 3 days
    const s = await syncStatus().catch(() => null);
    if (s) body.catalog = { titles: s.titles, lastSync: s.lastSync ?? null, stale: !s.lastSync || Date.now() - new Date(s.lastSync) > 3 * 86400_000 };
  }
  res.status(ok ? 200 : 503).json(body);
});

app.use('/api', rateLimit('global', 300, 60));
app.use('/api/auth', authRoutes);
app.use('/api/catalog', catalogRoutes);
app.use('/api/me', meRoutes);
app.use('/api/watchlist', watchlistRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/sports', sportsRoutes);
app.use('/api/rag', ragRoutes);
app.use('/api/internal', internalRoutes);

app.use(notFound);
app.use(errorHandler);
return app;
}

export const app = createApp();
