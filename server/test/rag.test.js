import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { boot, creds } from './helpers.js';

// Must be set before the app (and src/config/env.js) is imported by boot().
process.env.GEMINI_API_KEY = 'test-gemini-key';
process.env.GEMINI_RETRY_BASE_MS = '1';
process.env.GEMINI_EMBED_DIMS = '32';
process.env.SYNC_TOKEN = 'sync-token-'.padEnd(40, 'x');
process.env.SYNC_EMBED_BUDGET = '2';
process.env.GEMINI_EMBED_CHUNK = '1';      // one text per request, so "quota hit midway" is testable
process.env.GEMINI_EMBED_PACE_MS = '0';

const SYNC_HEADER = { 'X-Sync-Token': process.env.SYNC_TOKEN };
const DIMS = 32;

// ── fakes for the two upstreams ─────────────────────────────────────────────────────────────────
const DETAILS = {
  'movie:1': { id: 1, title: 'Orbit Heist', release_date: '2019-05-01', original_language: 'en', runtime: 121, poster_path: '/orbit.jpg',
    genres: [{ name: 'Science Fiction' }, { name: 'Thriller' }], vote_average: 7.8, vote_count: 900,
    overview: 'A crew of astronauts hijacks a spaceship to cross the galaxy and steal a priceless relic.',
    credits: { cast: [{ name: 'Ava Stone' }], crew: [{ job: 'Director', name: 'Leo Park' }] } },
  'movie:2': { id: 2, title: 'Paris in Spring', release_date: '2023-03-10', original_language: 'fr', runtime: 98,
    genres: [{ name: 'Romance' }, { name: 'Comedy' }], vote_average: 6.9, vote_count: 300,
    overview: 'Two rival florists fall in love in Paris and plan a chaotic wedding before the spring festival.',
    credits: { cast: [{ name: 'Lea Martin' }], crew: [{ job: 'Director', name: 'Jean Roux' }] } },
  'tv:100': { id: 100, name: 'Dark Streets', first_air_date: '2021-01-01', original_language: 'en', episode_run_time: [45],
    genres: [{ name: 'Crime' }, { name: 'Drama' }], vote_average: 8.4, vote_count: 1200, created_by: [{ name: 'Mia Roe' }],
    overview: 'A weary detective investigates a string of murders in a rain-soaked city full of corrupt police.',
    credits: { cast: [{ name: 'Sam Reed' }] } },
};
const LISTS = { 'movie/popular': [1, 2], 'tv/popular': [100] };

// Bag-of-words into 32 buckets: texts sharing words land close together, which is all retrieval needs.
function fakeEmbedding(text) {
  const clean = text.replace(/^task: search result \| query: /, '').replace(/^title: .*? \| text: /s, '');
  const v = new Array(DIMS).fill(0);
  for (const w of clean.toLowerCase().match(/[a-z]{4,}/g) || []) {
    let h = 7;
    for (const c of w) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    v[h % DIMS] += 1;
  }
  return v;
}

const realFetch = globalThis.fetch;
const calls = { gemini: 0, tmdb: 0 };
let geminiFailStatus = null;
let geminiFailAfter = null;   // succeed this many Gemini calls, then answer 429

function installFakes() {
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    if (url.hostname === 'api.themoviedb.org') {
      calls.tmdb++;
      const path = url.pathname.replace('/3/', '');
      const json = (o) => new Response(JSON.stringify(o), { status: 200 });
      if (path === 'trending/all/week') return json({ results: [{ id: 1, media_type: 'movie' }] });
      if (path.endsWith('/changes')) return json({ results: path.startsWith('movie') ? [{ id: 2 }] : [], total_pages: 1 });
      if (LISTS[path] && url.searchParams.get('page') === '1') return json({ results: LISTS[path].map((id) => ({ id })) });
      const detail = DETAILS[path.replace('/', ':')];
      if (detail) return json(detail);
      return json({ results: [] });
    }
    return realFetch(input);
  };
}

// Gemini needs the request body to answer, so it gets its own handler wrapped around the TMDB fake above.
function installGemini() {
  const inner = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    if (url.hostname !== 'generativelanguage.googleapis.com') return inner(input, init);
    calls.gemini++;
    if (geminiFailStatus || (geminiFailAfter !== null && calls.gemini > geminiFailAfter)) {
      return new Response('{}', { status: geminiFailStatus || 429 });
    }
    const { requests } = JSON.parse(init.body);
    return new Response(JSON.stringify({
      embeddings: requests.map((r) => ({ values: fakeEmbedding(r.content.parts[0].text) })),
    }), { status: 200 });
  };
}

let t;
let sync;
let retrieve;
let gemini;
let document;
before(async () => {
  t = await boot();
  sync = await import('../src/rag/sync.js');
  retrieve = await import('../src/rag/retrieve.js');
  gemini = await import('../src/services/gemini.js');
  document = await import('../src/rag/document.js');
});
after(async () => { globalThis.fetch = realFetch; await t.close(); });
beforeEach(async () => {
  await t.reset();
  await t.models.Title.deleteMany({});
  await t.models.SyncState.deleteMany({});
  calls.gemini = 0; calls.tmdb = 0; geminiFailStatus = null; geminiFailAfter = null;
  installFakes(); installGemini();
});

const auth = (token) => ({ Authorization: `Bearer ${token}` });
const signup = async (n) => (await request(t.app).post('/api/auth/signup').send(creds(n))).body.accessToken;

describe('embedding requests', () => {
  it('uses text prefixes (no taskType) for embedding-2 and taskType for embedding-001', () => {
    const v2 = gemini.buildEmbedRequest('space thriller', { kind: 'query', model: 'gemini-embedding-2', dims: 768 });
    assert.equal(v2.taskType, undefined);
    assert.equal(v2.content.parts[0].text, 'task: search result | query: space thriller');
    assert.equal(v2.outputDimensionality, 768);

    const doc = gemini.buildEmbedRequest('plot', { kind: 'document', title: 'Dune', model: 'gemini-embedding-2', dims: 768 });
    assert.equal(doc.content.parts[0].text, 'title: Dune | text: plot');

    const v1 = gemini.buildEmbedRequest('plot', { kind: 'document', model: 'gemini-embedding-001', dims: 768 });
    assert.equal(v1.taskType, 'RETRIEVAL_DOCUMENT');
    assert.equal(v1.content.parts[0].text, 'plot');
  });

  it('normalises vectors to unit length', () => {
    const v = gemini.normalize([3, 4]);
    assert.ok(Math.abs(Math.hypot(...v) - 1) < 1e-9);
  });

  it('builds a record, skips titles with no overview, and re-hashes when the text changes', () => {
    const rec = document.toTitleRecord('movie', DETAILS['movie:1']);
    assert.equal(rec.director, 'Leo Park');
    assert.deepEqual(rec.genres, ['Science Fiction', 'Thriller']);
    assert.match(rec.text, /Directed by Leo Park/);
    assert.equal(document.toTitleRecord('movie', { ...DETAILS['movie:1'], overview: '' }), null);
    const changed = document.toTitleRecord('movie', { ...DETAILS['movie:1'], overview: `${DETAILS['movie:1'].overview} Now with a sequel.` });
    assert.notEqual(changed.textHash, rec.textHash);
  });
});

describe('catalog sync', () => {
  it('respects the embedding budget, finishes on the next run, and only then moves lastSync', async () => {
    const first = await sync.syncCatalog(); // budget 2, three titles exist
    assert.equal(first.embedded, 2);
    assert.equal(first.deferred, 1);
    assert.equal((await sync.syncStatus()).lastSync, undefined, 'an incomplete run must not advance lastSync');

    const second = await sync.syncCatalog();
    assert.equal(second.embedded, 1);
    assert.equal(second.deferred, 0);
    const status = await sync.syncStatus();
    assert.equal(status.titles, 3);
    assert.ok(status.lastSync);
  });

  it('does not re-embed unchanged titles (hash match) even when TMDB reports a change', async () => {
    await sync.syncCatalog({ budget: 50 });
    const before = calls.gemini;
    const again = await sync.syncCatalog({ budget: 50 }); // TMDB "changes" lists movie 2
    assert.equal(again.embedded, 0);
    assert.ok(again.unchanged >= 1);
    assert.equal(calls.gemini, before, 'no Gemini call for unchanged text');
  });

  it('re-embeds a title whose text changed', async () => {
    await sync.syncCatalog({ budget: 50 });
    DETAILS['movie:2'].overview += ' A surprise twist reveals a secret twin.';
    try {
      const run = await sync.syncCatalog({ budget: 50 });
      assert.equal(run.updated, 1);
      assert.equal(run.embedded, 1);
    } finally {
      DETAILS['movie:2'].overview = DETAILS['movie:2'].overview.replace(' A surprise twist reveals a secret twin.', '');
    }
  });

  it('stops cleanly when the Gemini quota is exhausted and retries on the next run', async () => {
    geminiFailStatus = 429;
    const run = await sync.syncCatalog({ budget: 50 });
    assert.equal(run.partial, true);
    assert.equal(run.error, 'gemini quota exhausted');
    assert.equal((await sync.syncStatus()).lastSync, undefined);
    assert.equal(await t.models.Title.countDocuments(), 0);

    geminiFailStatus = null;
    const recovered = await sync.syncCatalog({ budget: 50 });
    assert.equal(recovered.embedded, 3);
    assert.ok((await sync.syncStatus()).lastSync);
  });

  it('keeps the chunks it already saved when the quota runs out midway', async () => {
    geminiFailAfter = 1; // chunk size is 1: the first title embeds, the second hits 429
    const run = await sync.syncCatalog({ budget: 50 });
    assert.equal(run.embedded, 1);
    assert.equal(run.partial, true);
    assert.equal(run.deferred, 2);
    assert.equal(await t.models.Title.countDocuments({ embeddedAt: { $exists: true } }), 1);
    assert.equal((await sync.syncStatus()).lastSync, undefined);

    geminiFailAfter = null;
    const next = await sync.syncCatalog({ budget: 50 });
    assert.equal(next.embedded, 2, 'only the missing two are embedded on the next run');
    assert.ok((await sync.syncStatus()).lastSync);
  });

  it('refuses to run twice at once', async () => {
    await t.redis.set('rag:sync:lock', 'someone-else', 'EX', 60);
    await assert.rejects(() => sync.syncCatalog(), { name: 'SyncBusyError' });
  });
});

describe('POST /api/internal/sync', () => {
  it('rejects missing or wrong tokens', async () => {
    assert.equal((await request(t.app).post('/api/internal/sync')).status, 401);
    assert.equal((await request(t.app).post('/api/internal/sync').set('X-Sync-Token', 'nope')).status, 401);
    assert.equal((await request(t.app).get('/api/internal/sync/status')).status, 401);
  });

  it('accepts the token, answers 202 immediately, and finishes in the background', async () => {
    const res = await request(t.app).post('/api/internal/sync').set(SYNC_HEADER);
    assert.equal(res.status, 202);

    let status;
    for (let i = 0; i < 50; i++) {
      status = (await request(t.app).get('/api/internal/sync/status').set(SYNC_HEADER)).body;
      if (!status.running && status.lastRun) break;
      await new Promise((r) => setTimeout(r, 100));
    }
    assert.equal(status.running, false);
    assert.equal(status.titles, 2, 'budget of 2 applied');
  });

  it('answers 409 while a sync is running', async () => {
    await t.redis.set('rag:sync:lock', 'someone-else', 'EX', 60);
    assert.equal((await request(t.app).post('/api/internal/sync').set(SYNC_HEADER)).status, 409);
  });
});

describe('semantic search', () => {
  beforeEach(() => sync.syncCatalog({ budget: 50 }));

  it('ranks by meaning and honours filters', async () => {
    const hits = await retrieve.searchCatalog('astronauts on a spaceship crossing the galaxy');
    assert.equal(hits[0].title, 'Orbit Heist');
    assert.equal(hits[0].embedding, undefined);
    assert.equal(hits[0].text, undefined);

    const crime = await retrieve.searchCatalog('detective investigating murders', { mediaType: 'tv' });
    assert.deepEqual(crime.map((h) => h.title), ['Dark Streets']);

    const romance = await retrieve.searchCatalog('love and a wedding', { genre: 'Romance', yearMin: 2020 });
    assert.deepEqual(romance.map((h) => h.title), ['Paris in Spring']);
    assert.deepEqual(await retrieve.searchCatalog('love and a wedding', { yearMin: 2030 }), []);
  });

  it('caches query embeddings so a repeated question costs no Gemini call', async () => {
    await retrieve.searchCatalog('florists planning a chaotic wedding');
    const before = calls.gemini;
    await retrieve.searchCatalog('florists planning a chaotic wedding');
    assert.equal(calls.gemini, before);
  });
});

describe('GET /api/rag/search', () => {
  beforeEach(() => sync.syncCatalog({ budget: 50 }));

  it('requires a signed-in user and validates input', async () => {
    assert.equal((await request(t.app).get('/api/rag/search?q=space')).status, 401);
    const token = await signup(40);
    assert.equal((await request(t.app).get('/api/rag/search?q=a').set(auth(token))).status, 400);
    assert.equal((await request(t.app).get('/api/rag/search?q=space&type=book').set(auth(token))).status, 400);
  });

  it('returns matches for a signed-in user', async () => {
    const token = await signup(41);
    const res = await request(t.app).get('/api/rag/search').query({ q: 'astronauts hijack a spaceship' }).set(auth(token));
    assert.equal(res.status, 200);
    assert.equal(res.body.results[0].title, 'Orbit Heist');
  });

  it('degrades to a friendly 503 when Gemini is down', async () => {
    const token = await signup(42);
    geminiFailStatus = 500;
    const res = await request(t.app).get('/api/rag/search').query({ q: 'something never searched before' }).set(auth(token));
    assert.equal(res.status, 503);
    assert.match(res.body.error, /busy/i);
  });
});

describe('/ping', () => {
  it('answers "pong" without touching the database or cache', async () => {
    const res = await request(t.app).get('/ping');
    assert.equal(res.status, 200);
    assert.equal(res.text, 'pong');
    assert.match(res.headers['cache-control'], /no-store/);
  });
});

describe('health', () => {
  it('reports catalog freshness once the chatbot is configured', async () => {
    await sync.syncCatalog({ budget: 50 });
    const res = await request(t.app).get('/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.catalog.titles, 3);
    assert.equal(res.body.catalog.stale, false);
  });
});
