# JioHotstar API

Express + MongoDB (Mongoose) + Redis. Auth: email/password and Google OAuth (code + PKCE). Catalog data is TMDB, proxied and cached in Redis.

## Run locally
```
cp .env.example .env   # fill MONGODB_URI, REDIS_URL, JWT_ACCESS_SECRET, TMDB_API_KEY (+ Google keys)
npm install
npm run dev            # http://localhost:4000, health at /health
npm test               # needs local Mongo + Redis; uses the hotstar_test DB and Redis db 1
```
Frontend dev server proxies `/api` here (see `vite.config.js`).

## Endpoints (all under `/api`)
| | |
|---|---|
| `POST /auth/signup`, `/auth/login` | email + password → `{accessToken, user}` + refresh cookie |
| `GET /auth/google` → `/auth/google/callback` | Google sign-in, redirects to `${FRONTEND_URL}/auth/callback` |
| `POST /auth/refresh`, `/auth/logout` | rotate / revoke the refresh cookie |
| `GET /catalog/trending/:all\|movie\|tv/:day\|week` | cached 1h |
| `GET /catalog/list/:movie\|tv/:list?page=` | popular, top_rated, upcoming, now_playing / on_the_air, airing_today |
| `GET /catalog/discover/:type?genre=&page=`, `/catalog/genres/:type`, `/catalog/search?q=`, `/catalog/title/:type/:id` | |
| `GET/POST /watchlist`, `POST /watchlist/bulk`, `DELETE /watchlist/:type/:id` | auth required |
| `GET/PUT /history`, `DELETE /history/:type/:id` | continue-watching; auth required |
| `GET/PATCH/DELETE /me`, `POST /me/avatar` | avatar needs `S3_BUCKET` |
| `GET /sports/matches` | placeholder data |

Protected routes take `Authorization: Bearer <accessToken>` (15 min). Refresh token is an httpOnly cookie (30 days, single-use).

## Design decisions
**Auth**
- Google OAuth uses the authorization-code flow with **PKCE** and a single-use `state` kept in Redis (10 min), so the callback can't be forged or replayed. The ID token is verified and the email must be Google-verified before an account is created or linked.
- Short-lived **access JWT (15 min)** in memory + long-lived **refresh token in an httpOnly cookie**, so XSS can't read the long-lived credential.
- Refresh tokens are stored **hashed** (SHA-256), **rotated on every use**, and **reuse-detected**: replaying an already-used token after a 10 s grace window revokes every session of that user (stolen-cookie defence). The grace window keeps two tabs refreshing at once from logging the user out.
- Cookie endpoints (`/refresh`, `/logout`) reject foreign `Origin` headers (CSRF); passwords are bcrypt (cost 12); login failures return one generic error to avoid account probing.

**Abuse protection**
- Redis-backed rate limiting shared across instances: global per-IP, a stricter auth bucket, and a **per-IP+account login limiter** against credential stuffing. The counter is an atomic Lua `INCR`+`PEXPIRE`, it emits standard `RateLimit-*` / `Retry-After` headers, and fails open if Redis is down.
- All input is validated with Zod (types are enforced, which also blocks NoSQL operator injection); JSON body capped at 100 kB; Helmet security headers.

**Performance**
- TMDB responses are cached in Redis with per-endpoint TTLs (trending 1 h, details 6 h, genres 24 h, search 10 min). Concurrent cache misses are **coalesced into one upstream call** (stampede protection). Redis errors degrade to direct upstream calls instead of failing requests.
- gzip compression; Mongo compound/unique indexes on `(userId, mediaType, tmdbId)`; TTL index removes expired refresh tokens.
- The TMDB key never reaches the browser.

**Operations**
- Structured JSON logs (pino) with request ids (`X-Request-Id`) and auth headers/cookies redacted; `/health` checks Mongo and Redis; graceful shutdown on SIGTERM/SIGINT.
- 18 integration tests (`npm test`) against real Mongo + Redis cover auth, rotation/theft detection, CSRF, rate limiting, watchlist/history, and cache coalescing. CI runs them plus the frontend build (`.github/workflows/ci.yml`).

## Production notes
- `NODE_ENV=production`, HTTPS required (refresh cookie is `Secure; SameSite=None`).
- Set `API_URL`, `FRONTEND_URL`, and add `${API_URL}/api/auth/google/callback` to the Google OAuth client.
- Frontend: set `VITE_API_URL=https://<api-host>/api`.
