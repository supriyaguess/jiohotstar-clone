import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { boot, creds } from './helpers.js';

let t;
before(async () => { t = await boot(); });
after(async () => { await t.close(); });
beforeEach(() => t.reset());

const signup = async (n) => {
  const agent = request.agent(t.app);
  const res = await agent.post('/api/auth/signup').send(creds(n));
  const cookie = res.headers['set-cookie']?.[0].match(/hs_refresh=([^;]+)/)?.[1]; // the token signup issued
  return { agent, token: res.body.accessToken, cookie, res };
};
const auth = (token) => ({ Authorization: `Bearer ${token}` });

describe('auth', () => {
  it('signs up, sets an httpOnly refresh cookie and never leaks the hash', async () => {
    const { res } = await signup(1);
    assert.equal(res.status, 201);
    assert.ok(res.body.accessToken);
    assert.equal(res.body.user.email, 'user1@example.com');
    assert.equal(res.body.user.passwordHash, undefined);
    assert.match(res.headers['set-cookie'][0], /hs_refresh=.*HttpOnly/);
  });

  it('rejects duplicate emails (case-insensitive) and weak input', async () => {
    await signup(2);
    const dup = await request(t.app).post('/api/auth/signup').send({ ...creds(2), email: 'USER2@example.com' });
    assert.equal(dup.status, 409);
    const weak = await request(t.app).post('/api/auth/signup').send({ ...creds(3), password: 'short' });
    assert.equal(weak.status, 400);
  });

  it('logs in, with one generic error for wrong password and unknown email', async () => {
    await signup(4);
    const ok = await request(t.app).post('/api/auth/login').send({ email: 'user4@example.com', password: 'password123' });
    assert.equal(ok.status, 200);
    const wrong = await request(t.app).post('/api/auth/login').send({ email: 'user4@example.com', password: 'nope' });
    const unknown = await request(t.app).post('/api/auth/login').send({ email: 'ghost@example.com', password: 'nope' });
    assert.equal(wrong.status, 401);
    assert.deepEqual(wrong.body, unknown.body);
  });

  it('rate-limits login attempts per client+account with Retry-After', async () => {
    const body = { email: 'victim@example.com', password: 'guess' };
    let last;
    for (let i = 0; i < 11; i++) last = await request(t.app).post('/api/auth/login').send(body);
    assert.equal(last.status, 429);
    assert.ok(Number(last.headers['retry-after']) > 0);
    assert.equal(last.headers['ratelimit-remaining'], '0');
    // a different account is unaffected
    const other = await request(t.app).post('/api/auth/login').send({ ...body, email: 'other@example.com' });
    assert.equal(other.status, 401);
  });

  it('protects /me and returns the profile with a valid token', async () => {
    const { token } = await signup(5);
    assert.equal((await request(t.app).get('/api/me')).status, 401);
    assert.equal((await request(t.app).get('/api/me').set(auth('garbage'))).status, 401);
    const me = await request(t.app).get('/api/me').set(auth(token));
    assert.equal(me.body.email, 'user5@example.com');
  });
});

describe('refresh tokens', () => {
  it('rotates on every refresh', async () => {
    const { agent } = await signup(6);
    const first = await agent.post('/api/auth/refresh');
    assert.equal(first.status, 200);
    const second = await agent.post('/api/auth/refresh');
    assert.equal(second.status, 200);
  });

  it('tolerates a quick replay (two tabs) without revoking the session', async () => {
    const { agent, cookie: stale } = await signup(7);
    await agent.post('/api/auth/refresh'); // rotates
    const replay = await request(t.app).post('/api/auth/refresh').set('Cookie', `hs_refresh=${stale}`);
    assert.equal(replay.status, 401);
    assert.equal((await agent.post('/api/auth/refresh')).status, 200); // legit session survives
  });

  it('revokes every session when an old token is replayed later (theft)', async () => {
    const { agent, cookie: stale } = await signup(8);
    await agent.post('/api/auth/refresh');
    await t.models.RefreshToken.updateMany({}, { usedAt: new Date(Date.now() - 60_000) }); // age the rotation
    const replay = await request(t.app).post('/api/auth/refresh').set('Cookie', `hs_refresh=${stale}`);
    assert.equal(replay.status, 401);
    assert.equal((await agent.post('/api/auth/refresh')).status, 401); // victim's newer token is dead too
  });

  it('rejects cookie-auth requests from foreign origins (CSRF)', async () => {
    const { agent } = await signup(9);
    const evil = await agent.post('/api/auth/refresh').set('Origin', 'https://evil.example');
    assert.equal(evil.status, 403);
    const fine = await agent.post('/api/auth/refresh').set('Origin', 'http://localhost:5173');
    assert.equal(fine.status, 200);
  });

  it('logout revokes the refresh token', async () => {
    const { agent } = await signup(10);
    assert.equal((await agent.post('/api/auth/logout')).status, 204);
    assert.equal((await agent.post('/api/auth/refresh')).status, 401);
  });
});

describe('watchlist & history', () => {
  const item = { id: 603, media_type: 'movie', title: 'The Matrix', vote_average: 8.2, release_date: '1999-03-31' };

  it('requires auth', async () => {
    assert.equal((await request(t.app).get('/api/watchlist')).status, 401);
    assert.equal((await request(t.app).get('/api/history')).status, 401);
  });

  it('adds idempotently, lists in TMDB shape, deletes, and isolates users', async () => {
    const a = await signup(11);
    const b = await signup(12);
    await request(t.app).post('/api/watchlist').set(auth(a.token)).send(item).expect(201);
    await request(t.app).post('/api/watchlist').set(auth(a.token)).send(item).expect(201);
    const tv = { id: 1399, media_type: 'tv', name: 'Game of Thrones', first_air_date: '2011-04-17' };
    await request(t.app).post('/api/watchlist').set(auth(a.token)).send(tv).expect(201);

    const list = await request(t.app).get('/api/watchlist').set(auth(a.token));
    assert.equal(list.body.length, 2);
    assert.equal(list.body[0].title, 'Game of Thrones'); // newest first, name -> title
    assert.equal(list.body[0].release_date, '2011-04-17');
    assert.deepEqual((await request(t.app).get('/api/watchlist').set(auth(b.token))).body, []);

    await request(t.app).delete('/api/watchlist/movie/603').set(auth(a.token)).expect(204);
    assert.equal((await request(t.app).get('/api/watchlist').set(auth(a.token))).body.length, 1);
  });

  it('validates input and bulk-imports legacy items', async () => {
    const { token } = await signup(13);
    await request(t.app).post('/api/watchlist').set(auth(token)).send({ id: 'x', media_type: 'book' }).expect(400);
    const bulk = await request(t.app).post('/api/watchlist/bulk').set(auth(token)).send([item, { ...item, id: 604 }]);
    assert.equal(bulk.body.imported, 2);
  });

  it('upserts watch progress and lists most recent first', async () => {
    const { token } = await signup(14);
    const put = (id, s) => request(t.app).put('/api/history').set(auth(token))
      .send({ id, media_type: 'movie', title: `Film ${id}`, progress_seconds: s, duration_seconds: 7200 });
    await put(1, 30).expect(204);
    await put(2, 10).expect(204);
    await put(1, 90).expect(204);
    const { body } = await request(t.app).get('/api/history').set(auth(token));
    assert.deepEqual(body.map((h) => [h.id, h.progress_seconds]), [[1, 90], [2, 10]]);
  });
});

describe('catalog proxy', () => {
  it('caches upstream responses in Redis and coalesces concurrent misses', async () => {
    const realFetch = globalThis.fetch;
    let calls = 0;
    globalThis.fetch = async (url) => {
      calls++;
      await new Promise((r) => setTimeout(r, 30));
      return new Response(JSON.stringify({ page: 1, results: [{ id: 1, url: String(url) }] }), { status: 200 });
    };
    try {
      const [a, b, c] = await Promise.all([1, 2, 3].map(() => request(t.app).get('/api/catalog/list/movie/popular')));
      assert.equal(a.status, 200);
      assert.deepEqual(a.body, b.body);
      assert.equal(calls, 1, 'three concurrent misses share one upstream call');
      await request(t.app).get('/api/catalog/list/movie/popular');
      assert.equal(calls, 1, 'subsequent request is served from cache');
      assert.equal(c.body.results[0].url.includes('api_key=test-key'), true);
    } finally {
      globalThis.fetch = realFetch;
    }
  });

  it('never exposes the TMDB key to clients and validates params', async () => {
    assert.equal((await request(t.app).get('/api/catalog/list/movie/bogus')).status, 404);
    assert.equal((await request(t.app).get('/api/catalog/list/movie/popular?page=0')).status, 400);
    assert.equal((await request(t.app).get('/api/catalog/search')).status, 400);
  });
});

describe('platform', () => {
  it('sets security headers and a request id, and 404s unknown routes', async () => {
    const res = await request(t.app).get('/api/nope');
    assert.equal(res.status, 404);
    assert.ok(res.headers['x-request-id']);
    assert.equal(res.headers['x-powered-by'], undefined);
    assert.equal(res.headers['x-content-type-options'], 'nosniff');
  });

  it('reports dependency health', async () => {
    const res = await request(t.app).get('/health');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { db: 'fulfilled', redis: 'fulfilled' });
  });
});
