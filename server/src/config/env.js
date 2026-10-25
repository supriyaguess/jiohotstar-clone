const required = ['MONGODB_URI', 'REDIS_URL', 'JWT_ACCESS_SECRET', 'TMDB_API_KEY'];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`Missing env vars: ${missing.join(', ')} (see server/.env.example)`);
  process.exit(1);
}

const e = process.env;
if (e.NODE_ENV !== 'test' && (e.JWT_ACCESS_SECRET.length < 32 || /change-?me/i.test(e.JWT_ACCESS_SECRET))) {
  console.error('JWT_ACCESS_SECRET is too weak: use 32+ random chars (openssl rand -hex 32)');
  process.exit(1);
}
export const env = {
  port: Number(e.PORT) || 4000,
  isProd: e.NODE_ENV === 'production',
  frontendUrl: (e.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, ''),
  logLevel: e.LOG_LEVEL || 'info',
  // Number of reverse proxies in front of the API (0 = none). Trusting X-Forwarded-For when
  // there is no proxy would let anyone spoof their IP and dodge the rate limiter.
  trustProxy: Number(e.TRUST_PROXY) || 0,
  apiUrl: (e.API_URL || 'http://localhost:4000').replace(/\/+$/, ''), // no trailing slash: it is joined with /api/...
  mongoUri: e.MONGODB_URI,
  redisUrl: e.REDIS_URL,
  jwtSecret: e.JWT_ACCESS_SECRET,
  accessTtl: Number(e.ACCESS_TTL_SECONDS) || 900,
  refreshTtlDays: Number(e.REFRESH_TTL_DAYS) || 30,
  google: { clientId: e.GOOGLE_CLIENT_ID, clientSecret: e.GOOGLE_CLIENT_SECRET },
  tmdb: { key: e.TMDB_API_KEY, baseUrl: e.TMDB_BASE_URL || 'https://api.themoviedb.org/3' },
  aws: { region: e.AWS_REGION || 'ap-south-1', bucket: e.S3_BUCKET || '' },
};
