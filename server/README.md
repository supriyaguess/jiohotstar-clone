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

## Chatbot (RAG), phase 1: catalog index
The catalog (movies and series from TMDB) is embedded with Gemini and stored in the `titles` collection, so the chatbot can answer from real data instead of guessing.

| Piece | Where |
|---|---|
| Embedding client (retries, quota handling, unit-length vectors) | `src/services/gemini.js` |
| Title to record + embedded text + content hash | `src/rag/document.js` |
| Incremental sync (lists + TMDB "changes", budgeted, resumable, locked) | `src/rag/sync.js` |
| Atlas vector index + semantic search (with a brute-force fallback) | `src/rag/retrieve.js` |
| First-boot setup (create index, fill an empty catalog) | `src/rag/bootstrap.js` |
| Cron endpoint `POST /api/internal/sync`, header `X-Sync-Token` | `src/routes/internal.js` |
| Authenticated semantic search `GET /api/rag/search?q=` | `src/routes/rag.js` |

**Environment** (all optional; without `GEMINI_API_KEY` the chatbot endpoints answer 503 and nothing else changes):
`GEMINI_API_KEY` (free, from aistudio.google.com), `GEMINI_EMBED_MODEL` (default `gemini-embedding-2`; `gemini-embedding-001` also works), `GEMINI_CHAT_MODEL`, `GEMINI_EMBED_DIMS` (default 768), `SYNC_TOKEN` (32+ random chars), `SYNC_EMBED_BUDGET` (max embeddings per run, default 200).

**Keeping it fresh with no manual work**
- A cron service (e.g. cron-job.org) calls `POST /api/internal/sync` once a day. The endpoint checks the token in constant time, answers `202` at once and works in the background; `409` if a run is already in progress.
- Each run takes the first pages of TMDB's popular / top-rated / now-playing / upcoming / on-air lists plus trending, and re-checks titles TMDB reports as changed. Only titles whose embedded text actually changed (sha256 of text + model + dimensions) are re-embedded, and at most `SYNC_EMBED_BUDGET` per run, new titles first, so the free quota is never blown. Leftovers carry over to the next day.
- `lastSync` only advances after a complete run, so no change can be skipped after a quota error. A Redis lock stops overlapping runs.
- On boot the vector index is created if missing and an empty catalog starts filling by itself.
- `/health` reports `catalog: { titles, lastSync, stale }` (stale = no complete sync in 3 days).
- Manual run if ever needed: `npm run ingest`.

**Search** embeds the question (cached in Redis for a week), runs Atlas `$vectorSearch` with optional filters (type, year, genre), and falls back to an in-process cosine scan on plain MongoDB or while a new index is still building.

## Production notes
- `NODE_ENV=production`, HTTPS required (refresh cookie is `Secure; SameSite=None`).
- Set `API_URL`, `FRONTEND_URL`, and add `${API_URL}/api/auth/google/callback` to the Google OAuth client.
- Frontend: set `VITE_API_URL=https://<api-host>/api`.

## Chatbot (phase 2): "Filmy" chat API
Streaming chat over Server-Sent Events, backed by Gemini function calling. All routes need `Authorization: Bearer <accessToken>`.

- `POST /api/chat` body `{ message (1-500 chars), lang: "en"|"hi"|"auto" }`. Validation, auth and rate-limit errors are plain JSON (400/401/429, 503 `Chatbot is not configured` without `GEMINI_API_KEY`). Otherwise `200 text/event-stream` with frames `token {text}`, `titles {titles:[{tmdbId,mediaType,title,year,posterPath,rating}]}` (only titles a tool returned this turn, deduped, max 8), then `done {}`, or `error {code: busy|rate_limited|not_configured|internal, message}` (no `done`). A `: ping` comment is sent every ~15s. Closing the connection aborts the upstream call.
- `GET /api/chat/history` returns `{ messages: [{ role: "user"|"bot", text, titles? }] }` (last 20). `DELETE /api/chat` clears it (204).
- Tools the model can call: `search_catalog` (semantic search; falls back to live TMDB search/discover when the catalog is empty, the embedding quota is hit, or no match), `get_title_details`, `get_my_list`, `get_watch_history` (user id is taken from the token, never from model arguments), `get_sports_fixtures`. At most 4 model rounds per message.
- Limits: 10 requests/minute and `CHAT_DAILY_LIMIT` (default 100) messages/day per user, one active stream per user (Redis lock). Memory: last 20 messages per user in Redis for 2 hours (text and title cards only). `BOT_NAME` (default `Filmy`) renames the bot. `CHAT_HEARTBEAT_MS` tunes the ping interval.
- Privacy: no user id, name, email or token is sent to Gemini; message text, tool args and tool results are never logged.
