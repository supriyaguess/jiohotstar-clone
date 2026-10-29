import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { Writable } from 'node:stream';
import request from 'supertest';
import { boot, creds } from './helpers.js';

// Must be set before the app (and src/config/env.js) is imported by boot().
process.env.GEMINI_API_KEY = 'test-gemini-key';
process.env.GEMINI_RETRY_BASE_MS = '1';
process.env.GEMINI_CHAT_MODEL = 'primary-model';
process.env.GEMINI_CHAT_FALLBACK_MODELS = '';   // fallback behaviour is switched on per test below
process.env.GEMINI_EMBED_DIMS = '4';

const realFetch = globalThis.fetch;

// ── fake upstreams ──────────────────────────────────────────────────────────────────────────────
const TMDB = {
  'movie/1': { id: 1, title: 'Orbit Heist', release_date: '2019-05-01', runtime: 121, poster_path: '/orbit.jpg', vote_average: 7.84, tagline: 'Steal the stars',
    genres: [{ name: 'Science Fiction' }], overview: 'A crew hijacks a spaceship. '.repeat(100),
    credits: { cast: Array.from({ length: 12 }, (_, i) => ({ name: `Actor ${i}` })), crew: [{ job: 'Director', name: 'Leo Park' }] } },
};
let script;            // queue of scripted Gemini responses
let defaultResp;       // used when the queue is empty
let geminiReqs;        // parsed bodies (+ headers) of chat requests
let tmdbPaths;
let embedCalls;
let embedStatus;       // when set, embedding requests fail with it
let observedAbort;

const part = (p) => ({ candidates: [{ content: { role: 'model', parts: [p] } }] });
const say = (text) => part({ text });
const call = (name, args = {}) => part({ functionCall: { name, args }, thoughtSignature: 'sig-1' });
const reply = (...chunks) => ({ chunks });

function sseBody(chunks, split = 7) {
  const bytes = new TextEncoder().encode(chunks.map((c) => `data: ${JSON.stringify(c)}\r\n\r\n`).join(''));
  return new ReadableStream({
    start(controller) {
      for (let i = 0; i < bytes.length; i += split) controller.enqueue(bytes.slice(i, i + split)); // splits mid-line and mid-UTF-8
      controller.close();
    },
  });
}

function geminiResponse(spec, signal) {
  if (spec.status) return new Response('UPSTREAM-SECRET-BODY', { status: spec.status });
  if (spec.hang) {
    return new Response(new ReadableStream({
      start(c) { signal?.addEventListener('abort', () => { observedAbort = true; c.error(new DOMException('Aborted', 'AbortError')); }); },
    }), { status: 200 });
  }
  return new Response(sseBody(spec.chunks), { status: 200, headers: { 'content-type': 'text/event-stream' } });
}

function installFakes() {
  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(String(input));
    if (url.hostname === 'generativelanguage.googleapis.com') {
      if (url.pathname.endsWith(':batchEmbedContents')) {
        embedCalls++;
        if (embedStatus) return new Response('{}', { status: embedStatus });
        const { requests } = JSON.parse(init.body);
        return new Response(JSON.stringify({ embeddings: requests.map(() => ({ values: [1, 0, 0, 0] })) }), { status: 200 });
      }
      assert.ok(url.pathname.endsWith(':streamGenerateContent') && url.searchParams.get('alt') === 'sse', 'streams over SSE');
      geminiReqs.push({ ...JSON.parse(init.body), _key: init.headers['x-goog-api-key'], _signal: init.signal, _model: url.pathname.match(/models\/([^:]+):/)[1] });
      const spec = script.length ? script.shift() : defaultResp;
      if (spec.gate) await spec.gate;
      return geminiResponse(spec, init.signal);
    }
    if (url.hostname === 'api.themoviedb.org') {
      const path = url.pathname.replace('/3/', '');
      tmdbPaths.push(path);
      const json = (o) => new Response(JSON.stringify(o), { status: 200 });
      if (path === 'search/multi') {
        return json({ results: [
          { id: 11, media_type: 'movie', title: 'Live Movie', release_date: '2020-01-01', vote_average: 6.5, poster_path: '/m.jpg', overview: 'x' },
          { id: 12, media_type: 'person', name: 'Some Actor' },
          { id: 13, media_type: 'tv', name: 'Live Show', first_air_date: '2018-02-02', vote_average: 0, poster_path: null },
        ] });
      }
      if (TMDB[path]) return json(TMDB[path]);
      return new Response('{}', { status: 404 });
    }
    if (url.hostname === 'www.thesportsdb.com') {
      return new Response(JSON.stringify({ events: [{ idEvent: '77', strTimestamp: '2026-10-29T10:00:00', strEvent: 'India vs Australia', strHomeTeam: 'India', strAwayTeam: 'Australia', strStatus: 'LIVE', strLeague: 'ODI' }] }), { status: 200 });
    }
    return realFetch(input, init);
  };
}

// ── helpers ─────────────────────────────────────────────────────────────────────────────────────
let t;
let env;
before(async () => { t = await boot(); env = (await import('../src/config/env.js')).env; });
after(async () => { globalThis.fetch = realFetch; await t.close(); });
beforeEach(async () => {
  await t.reset();
  await t.models.Title.deleteMany({});
  await t.models.WatchlistItem.deleteMany({});
  await t.models.WatchHistory.deleteMany({});
  script = []; defaultResp = reply(say('ok')); geminiReqs = []; tmdbPaths = []; embedCalls = 0; embedStatus = null; observedAbort = false;
  env.gemini.apiKey = 'test-gemini-key';
  delete process.env.CHAT_DAILY_LIMIT; delete process.env.CHAT_HEARTBEAT_MS;
  installFakes();
});

const auth = (token) => ({ Authorization: `Bearer ${token}` });
const signup = async (n) => (await request(t.app).post('/api/auth/signup').send(creds(n))).body.accessToken;
const uid = (token) => JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()).sub;
const chat = (token, body = { message: 'hi' }) => request(t.app).post('/api/chat').set(auth(token)).send(body);

function frames(res) {
  return String(res.text).split('\n\n').filter(Boolean).filter((f) => !f.startsWith(':')).map((f) => {
    const [ev, data] = f.split('\n');
    return { event: ev.replace('event: ', ''), data: JSON.parse(data.replace('data: ', '')) };
  });
}
const of = (fs, name) => fs.filter((f) => f.event === name);
const lastResponse = (n = -1) => geminiReqs.at(n).contents.at(-1).parts[0].functionResponse.response;
const seedTitles = () => t.models.Title.create([
  { tmdbId: 1, mediaType: 'movie', title: 'Orbit Heist', year: 2019, genres: ['Science Fiction'], rating: 7.8, overview: 'space crew', posterPath: '/orbit.jpg', embedding: [1, 0, 0, 0] },
  { tmdbId: 2, mediaType: 'movie', title: 'Paris in Spring', year: 2023, genres: ['Romance'], rating: 6.9, overview: 'florists', embedding: [0, 1, 0, 0] },
]);

// ── tests ───────────────────────────────────────────────────────────────────────────────────────
describe('auth and validation', () => {
  it('requires auth on all three routes', async () => {
    assert.equal((await request(t.app).post('/api/chat').send({ message: 'hi' })).status, 401);
    assert.equal((await request(t.app).get('/api/chat/history')).status, 401);
    assert.equal((await request(t.app).delete('/api/chat')).status, 401);
    assert.equal(geminiReqs.length, 0);
  });

  it('rejects bad bodies with 400 JSON before streaming', async () => {
    const token = await signup(1);
    for (const body of [{}, { message: '' }, { message: '   ' }, { message: 'x'.repeat(501) }, { message: 42 }, { message: 'hi', lang: 'fr' }]) {
      const res = await chat(token, body);
      assert.equal(res.status, 400, JSON.stringify(body).slice(0, 40));
      assert.match(res.headers['content-type'], /json/);
    }
    assert.equal(geminiReqs.length, 0);
    assert.equal((await chat(token, { message: `  ${'y'.repeat(500)}  ` })).status, 200, '500 chars after trimming is fine');
  });

  it('answers 503 when Gemini is not configured, while history and clear still work', async () => {
    const token = await signup(2);
    env.gemini.apiKey = '';
    const res = await chat(token);
    assert.equal(res.status, 503);
    assert.equal(res.body.error, 'Chatbot is not configured');
    assert.equal((await request(t.app).get('/api/chat/history').set(auth(token))).status, 200);
    assert.equal((await request(t.app).delete('/api/chat').set(auth(token))).status, 204);
  });
});

describe('streaming', () => {
  it('streams tokens in order, then done last, with the right headers', async () => {
    const token = await signup(3);
    script = [reply(say('Hel'), say('lo, '), say('नमस्ते '), say('friend'))];
    const res = await chat(token, { message: 'hello', lang: 'en' });
    assert.equal(res.status, 200);
    assert.match(res.headers['content-type'], /^text\/event-stream; charset=utf-8/);
    assert.match(res.headers['cache-control'], /no-cache, no-transform/);
    assert.equal(res.headers['x-accel-buffering'], 'no');
    const fs = frames(res);
    assert.deepEqual(of(fs, 'token').map((f) => f.data.text).join(''), 'Hello, नमस्ते friend');
    assert.deepEqual(fs.map((f) => f.event), ['token', 'token', 'token', 'token', 'done']);
    assert.deepEqual(fs.at(-1).data, {});
    assert.equal(of(fs, 'error').length, 0);
  });

  it('sends the persona, tools and config upstream, and nothing identifying the user', async () => {
    const token = await signup(4);
    await chat(token, { message: 'hello', lang: 'hi' });
    const [req] = geminiReqs;
    assert.equal(req._key, 'test-gemini-key');
    const sys = req.systemInstruction.parts[0].text;
    assert.match(sys, /You are Filmy/);
    assert.match(sys, /Hindi \(Devanagari/);
    assert.deepEqual(req.tools[0].functionDeclarations.map((f) => f.name),
      ['no_lookup_needed', 'search_catalog', 'get_title_details', 'get_my_list', 'get_watch_history', 'get_sports_fixtures']);
    assert.equal(req.generationConfig.maxOutputTokens, 1500);
    assert.equal(req._model, 'primary-model');
    const raw = JSON.stringify(req);
    for (const secret of ['user4@example.com', 'User 4', uid(token), token]) assert.ok(!raw.includes(secret));
  });

  it('forces a tool call in round 1 (so nothing is recommended from memory) and lets the model answer freely afterwards', async () => {
    const token = await signup(64);
    await seedTitles();
    script = [reply(call('search_catalog', { query: 'space' })), reply(say('Try **Orbit Heist**.'))];
    await chat(token);
    assert.equal(geminiReqs[0].toolConfig.functionCallingConfig.mode, 'ANY');
    assert.equal(geminiReqs[1].toolConfig.functionCallingConfig.mode, 'AUTO');
  });

  it('no_lookup_needed lets greetings through without touching any data source', async () => {
    const token = await signup(65);
    script = [reply(call('no_lookup_needed')), reply(say('Hi! Ask me about movies, shows or sports.'))];
    const fs = frames(await chat(token, { message: 'hello' }));
    assert.equal(fs.at(-1).event, 'done');
    assert.equal(of(fs, 'titles').length, 0);
    assert.equal(embedCalls, 0);
    assert.deepEqual(tmdbPaths, []);
    assert.equal(lastResponse(1).data.ok, true);
  });

  it('sends SSE comment pings while waiting', async () => {
    const token = await signup(5);
    process.env.CHAT_HEARTBEAT_MS = '15';
    script = [{ gate: new Promise((r) => setTimeout(r, 120)), ...reply(say('late')) }];
    const res = await chat(token);
    assert.match(res.text, /: ping\n\n/);
    assert.equal(frames(res).at(-1).event, 'done');
  });
});

describe('tools', () => {
  it('search_catalog: titles come from tool results only; model-typed ids are never emitted', async () => {
    const token = await signup(6);
    await seedTitles();
    script = [
      reply(say('Let me look.'), call('search_catalog', { query: 'space heist', mediaType: 'movie' })),
      reply(say('Try **Orbit Heist**. Also tmdb id 999999 ('), say('made up).')),
    ];
    const fs = frames(await chat(token, { message: 'space movies?' }));
    const titles = of(fs, 'titles');
    assert.equal(titles.length, 1);
    const ids = titles[0].data.titles.map((x) => x.tmdbId);
    assert.deepEqual(ids, [1], 'only the title the answer names gets a card (Paris in Spring was returned but not mentioned)');
    assert.ok(!ids.includes(999999));
    assert.deepEqual(Object.keys(titles[0].data.titles[0]).sort(), ['mediaType', 'posterPath', 'rating', 'title', 'tmdbId', 'year']);
    assert.equal(of(fs, 'token').map((f) => f.data.text).join(''), 'Let me look. Try **Orbit Heist**. Also tmdb id 999999 (made up).');
    assert.equal(fs.at(-1).event, 'done');
    // the model got the data wrapped, with the echoed functionCall turn (thought signature preserved)
    const resp = lastResponse(1);
    assert.match(resp.note, /untrusted/);
    assert.equal(resp.data[0].title, 'Orbit Heist');
    assert.equal(geminiReqs[1].contents.at(-2).parts.at(-1).thoughtSignature, 'sig-1');
    assert.equal(embedCalls, 1);
  });

  it('dedupes titles across tool calls in one turn', async () => {
    const token = await signup(7);
    await seedTitles();
    script = [reply(call('search_catalog', { query: 'space' }), call('search_catalog', { query: 'space' })), reply(say('Try **Orbit Heist** or **Paris in Spring**.'))];
    const fs = frames(await chat(token));
    assert.equal(of(fs, 'titles').length, 1);
    assert.deepEqual(of(fs, 'titles')[0].data.titles.map((x) => x.tmdbId), [1, 2]);
  });

  it('falls back to live TMDB (movies and series only) when the catalog is empty', async () => {
    const token = await signup(8);
    script = [reply(call('search_catalog', { query: 'something' })), reply(say('Try **Live Movie** or the series **Live Show**.'))];
    const fs = frames(await chat(token));
    assert.deepEqual(of(fs, 'titles')[0].data.titles.map((x) => [x.tmdbId, x.mediaType, x.rating]), [[11, 'movie', 6.5], [13, 'tv', null]]);
    assert.ok(tmdbPaths.includes('search/multi'));
    assert.equal(embedCalls, 0, 'an empty catalog costs no embedding');
  });

  it('falls back to live TMDB when the query embedding is rate limited', async () => {
    const token = await signup(9);
    await seedTitles();
    embedStatus = 429;
    script = [reply(call('search_catalog', { query: 'never embedded before' })), reply(say('Try **Live Movie** or **Live Show**.'))];
    const fs = frames(await chat(token));
    assert.deepEqual(of(fs, 'titles')[0].data.titles.map((x) => x.tmdbId), [11, 13]);
    assert.equal(fs.at(-1).event, 'done');
  });

  it('get_title_details trims the payload and emits a card from the TMDB response', async () => {
    const token = await signup(10);
    script = [reply(call('get_title_details', { tmdbId: 1, mediaType: 'movie' })), reply(say('ok'))];
    const fs = frames(await chat(token));
    assert.equal(of(fs, 'titles')[0].data.titles[0].rating, 7.8);
    const { data } = lastResponse(1);
    assert.equal(data.director, 'Leo Park');
    assert.equal(data.cast.length, 8);
    assert.ok(data.overview.length <= 700);
    assert.ok(tmdbPaths.includes('movie/1'));
  });

  it('shows cards only for titles the answer names (bold or plain), and ignores look-alike ordinary words', async () => {
    const token = await signup(63);
    await t.models.Title.create({ tmdbId: 3, mediaType: 'movie', title: 'Hope', year: 2026, genres: ['Drama'], rating: 6.8, overview: 'a village', embedding: [0, 0, 1, 0] });
    await seedTitles();
    script = [reply(call('search_catalog', { query: 'anything' })), reply(say('I hope you like **Orbit Heist (2019)**; Paris in Spring is lighter.'))];
    let fs = frames(await chat(token));
    assert.deepEqual(of(fs, 'titles')[0].data.titles.map((x) => x.tmdbId).sort(), [1, 2], '"hope" in a sentence is not the movie Hope');

    script = [reply(call('search_catalog', { query: 'anything' })), reply(say('Maybe the drama **Hope** tonight.'))];
    fs = frames(await chat(token));
    assert.deepEqual(of(fs, 'titles')[0].data.titles.map((x) => x.tmdbId), [3]);

    script = [reply(call('search_catalog', { query: 'anything' })), reply(say('Nothing here matches that mood.'))];
    fs = frames(await chat(token));
    assert.equal(of(fs, 'titles').length, 0, 'results the answer never names are not shown');
    assert.equal(fs.at(-1).event, 'done');
  });

  it('unknown tools, bad args and unknown ids become error results, not crashes', async () => {
    const token = await signup(11);
    script = [
      reply(call('drop_database', { x: 1 }), call('get_title_details', { tmdbId: 'abc', mediaType: 'movie' }), call('get_title_details', { tmdbId: 424242, mediaType: 'tv' })),
      reply(say('sorry')),
    ];
    const fs = frames(await chat(token));
    assert.equal(fs.at(-1).event, 'done');
    assert.equal(of(fs, 'titles').length, 0);
    const parts = geminiReqs[1].contents.at(-1).parts.map((p) => p.functionResponse.response);
    assert.deepEqual(parts.map((p) => p.error), ['unknown tool', 'invalid arguments', 'not found']);
  });

  it('get_my_list and get_watch_history only ever return the caller\'s data, whatever args the model passes', async () => {
    const a = await signup(12);
    const b = await signup(13);
    const row = (token, title, id) => ({ userId: uid(token), tmdbId: id, mediaType: 'movie', title });
    await t.models.WatchlistItem.create([row(a, 'Alice Secret List', 101), row(b, 'Bob List', 201)]);
    await t.models.WatchHistory.create([{ ...row(a, 'Alice Secret Watch', 102), progressSeconds: 30, durationSeconds: 60 }, { ...row(b, 'Bob Watch', 202), progressSeconds: 30, durationSeconds: 60 }]);
    const evil = { userId: uid(a), user_id: uid(a), email: 'user12@example.com' };

    script = [reply(call('get_my_list', evil), call('get_watch_history', evil)), reply(say('ok'))];
    assert.equal(frames(await chat(b)).at(-1).event, 'done');
    const [list, hist] = geminiReqs[1].contents.at(-1).parts.map((p) => p.functionResponse.response.data);
    assert.deepEqual(list.map((x) => x.title), ['Bob List']);
    assert.deepEqual(hist.map((x) => [x.title, x.percentWatched]), [['Bob Watch', 50]]);
    assert.ok(!JSON.stringify(geminiReqs[1]).includes('Alice'));

    script = [reply(call('get_my_list', { userId: uid(b) })), reply(say('ok'))];
    await chat(a);
    assert.deepEqual(lastResponse(-1).data.map((x) => x.title), ['Alice Secret List']);
  });

  it('get_sports_fixtures returns a small normalised list', async () => {
    const token = await signup(14);
    script = [reply(call('get_sports_fixtures', { sport: 'cricket' })), reply(say('ok'))];
    await chat(token);
    const { data } = lastResponse(1);
    assert.equal(data.fixtures[0].title, 'India vs Australia');
    assert.equal(data.fixtures[0].status, 'live');
    assert.ok(data.fixtures.length <= 10);
  });
});

describe('failure handling', () => {
  it('stops after 4 model rounds when the model only ever calls tools', async () => {
    const token = await signup(15);
    defaultResp = reply(call('get_my_list'));
    const fs = frames(await chat(token));
    assert.equal(geminiReqs.length, 4);
    assert.deepEqual(fs.map((f) => f.event), ['error']);
    assert.equal(fs[0].data.code, 'internal');
    assert.equal((await request(t.app).get('/api/chat/history').set(auth(token))).body.messages.length, 0);
  });

  it('maps Gemini 429 to a busy error after two quick retries, without leaking the upstream body', async () => {
    const token = await signup(16);
    defaultResp = { status: 429 };
    const res = await chat(token);
    assert.equal(res.status, 200);
    const fs = frames(res);
    assert.deepEqual(fs.map((f) => f.event), ['error']);
    assert.equal(fs[0].data.code, 'busy');
    assert.match(fs[0].data.message, /busy/);
    assert.ok(!res.text.includes('UPSTREAM-SECRET-BODY'));
    assert.equal(geminiReqs.length, 3, '1 try + 2 retries');
  });

  describe('model fallback', () => {
    let env;
    before(async () => { ({ env } = await import('../src/config/env.js')); });
    beforeEach(() => { env.gemini.chatFallbackModels = ['backup-model']; });
    after(() => { env.gemini.chatFallbackModels = []; });

    it('moves to the fallback model when the primary is overloaded, instead of retrying it', async () => {
      const token = await signup(60);
      script = [{ status: 503 }, reply(say('Hello from the backup'))];
      const fs = frames(await chat(token));
      assert.deepEqual(geminiReqs.map((r) => r._model), ['primary-model', 'backup-model']);
      assert.equal(fs.filter((f) => f.event === 'token').map((f) => f.data.text).join(''), 'Hello from the backup');
      assert.equal(fs.at(-1).event, 'done');
    });

    it('keeps every round of one turn on the same model (thought signatures are model-specific)', async () => {
      const token = await signup(61);
      script = [{ status: 503 }, reply(call('get_my_list')), reply(say('Done'))];
      const fs = frames(await chat(token));
      assert.deepEqual(geminiReqs.map((r) => r._model), ['primary-model', 'backup-model', 'backup-model']);
      assert.equal(fs.at(-1).event, 'done');
    });

    it('still reports busy when every model is overloaded', async () => {
      const token = await signup(62);
      defaultResp = { status: 503 };
      const fs = frames(await chat(token));
      assert.deepEqual(geminiReqs.map((r) => r._model), ['primary-model', 'backup-model']);
      assert.equal(fs[0].data.code, 'busy');
    });
  });

  it('does not retry later rounds, and a 400 is not retried at all', async () => {
    const token = await signup(17);
    script = [reply(call('get_my_list')), { status: 503 }];
    const fs = frames(await chat(token));
    assert.equal(geminiReqs.length, 2);
    assert.equal(fs.at(-1).data.code, 'busy');

    geminiReqs = []; defaultResp = { status: 400 };
    await t.reset();
    const fs2 = frames(await chat(token));
    assert.equal(geminiReqs.length, 1);
    assert.equal(fs2.at(-1).event, 'error');
  });

  it('survives an empty model answer with a polite fallback', async () => {
    const token = await signup(18);
    script = [reply({ candidates: [{ finishReason: 'SAFETY' }] })];
    const fs = frames(await chat(token));
    assert.equal(of(fs, 'token').length, 1);
    assert.equal(fs.at(-1).event, 'done');
  });
});

describe('memory', () => {
  it('stores text and cards, feeds history back to the model, and clears', async () => {
    const a = await signup(19);
    const b = await signup(20);
    await seedTitles();
    script = [reply(call('search_catalog', { query: 'space' })), reply(say('Try Orbit Heist.'))];
    await chat(a, { message: 'recommend' });
    const { messages } = (await request(t.app).get('/api/chat/history').set(auth(a))).body;
    assert.deepEqual(messages.map((m) => [m.role, m.text]), [['user', 'recommend'], ['bot', 'Try Orbit Heist.']]);
    assert.equal(messages[0].titles, undefined);
    assert.deepEqual(messages[1].titles.map((x) => x.tmdbId), [1], 'history keeps only the cards that were shown');
    assert.ok(!JSON.stringify(messages).includes('untrusted'), 'no raw tool payloads stored');

    await chat(a, { message: 'and another?' });
    assert.deepEqual(geminiReqs.at(-1).contents.map((c) => [c.role, c.parts[0].text]),
      [['user', 'recommend'], ['model', 'Try Orbit Heist.'], ['user', 'and another?']]);

    assert.deepEqual((await request(t.app).get('/api/chat/history').set(auth(b))).body, { messages: [] });
    assert.equal((await request(t.app).delete('/api/chat').set(auth(a))).status, 204);
    assert.deepEqual((await request(t.app).get('/api/chat/history').set(auth(a))).body, { messages: [] });
    assert.ok((await t.redis.ttl(`chat:conv:${uid(a)}`)) === -2);
  });

  it('keeps at most 20 messages and sets a ~2h TTL', async () => {
    const token = await signup(21);
    for (let i = 0; i < 12; i++) { await chat(token, { message: `m${i}` }); await t.redis.del(`rl:chat:${uid(token)}`); }
    const { messages } = (await request(t.app).get('/api/chat/history').set(auth(token))).body;
    assert.equal(messages.length, 20);
    assert.equal(messages[0].text, 'm2');
    const ttl = await t.redis.ttl(`chat:conv:${uid(token)}`);
    assert.ok(ttl > 7000 && ttl <= 7200);
  });
});

describe('limits', () => {
  it('rate limits to 10 requests a minute per user', async () => {
    const a = await signup(22);
    const b = await signup(23);
    for (let i = 0; i < 10; i++) assert.equal((await chat(a)).status, 200);
    const res = await chat(a);
    assert.equal(res.status, 429);
    assert.ok(res.headers['retry-after']);
    assert.equal((await chat(b)).status, 200, 'other users are unaffected');
  });

  it('caps messages per day', async () => {
    const token = await signup(24);
    process.env.CHAT_DAILY_LIMIT = '2';
    assert.equal((await chat(token)).status, 200);
    assert.equal((await chat(token)).status, 200);
    const res = await chat(token);
    assert.equal(res.status, 429);
    assert.match(res.body.error, /today/);
    assert.ok(await t.redis.get(`chat:day:${uid(token)}:${new Date().toISOString().slice(0, 10)}`));
    assert.equal(await t.redis.get(`chat:lock:${uid(token)}`), null, 'lock released after the cap rejection');
  });

  it('allows one active stream per user and releases the lock afterwards', async () => {
    const token = await signup(25);
    let open;
    script = [{ gate: new Promise((r) => { open = r; }), ...reply(say('first')) }];
    const first = chat(token, { message: 'one' }).then((r) => r);
    while (!geminiReqs.length) await new Promise((r) => setTimeout(r, 5));
    const second = await chat(token, { message: 'two' });
    assert.equal(second.status, 429);
    assert.match(second.body.error, /still answering/);
    open();
    assert.equal(frames(await first).at(-1).event, 'done');
    assert.equal(await t.redis.get(`chat:lock:${uid(token)}`), null);
    assert.equal((await chat(token)).status, 200, 'usable again');
  });

  it('aborts the upstream call and releases the lock when the client disconnects', async () => {
    const token = await signup(26);
    const server = t.app.listen(0);
    try {
      script = [{ hang: true }];
      const req = http.request({ port: server.address().port, path: '/api/chat', method: 'POST', headers: { ...auth(token), 'content-type': 'application/json' } });
      req.on('error', () => {});
      const gotHeaders = new Promise((r) => req.on('response', r));
      req.end(JSON.stringify({ message: 'hello' }));
      const res = await gotHeaders;
      assert.equal(res.statusCode, 200);
      assert.ok(await t.redis.get(`chat:lock:${uid(token)}`), 'lock held while streaming');
      req.destroy();
      for (let i = 0; i < 100 && (await t.redis.get(`chat:lock:${uid(token)}`)); i++) await new Promise((r) => setTimeout(r, 20));
      assert.equal(await t.redis.get(`chat:lock:${uid(token)}`), null);
      assert.ok(observedAbort, 'upstream fetch was aborted');
      assert.equal((await request(t.app).get('/api/chat/history').set(auth(token))).body.messages.length, 0, 'aborted turns are not saved');
    } finally { server.close(); }
  });
});

describe('privacy', () => {
  it('never logs message text, tool args or tool results', async () => {
    const { createApp } = await import('../src/app.js');
    const lines = [];
    const sink = new Writable({ write(chunk, _enc, cb) { lines.push(chunk.toString()); cb(); } });
    env.logLevel = 'info';
    let app;
    try { app = createApp(sink); } finally { env.logLevel = 'silent'; }
    const token = await signup(27);
    await seedTitles();
    script = [reply(call('search_catalog', { query: 'ZXQ-tool-arg-phrase' })), reply(say('ANSWER-ZXQ'))];
    const res = await request(app).post('/api/chat').set(auth(token)).send({ message: 'MSG-ZXQ-secret-phrase' });
    assert.equal(frames(res).at(-1).event, 'done');
    defaultResp = { status: 429 };
    await request(app).post('/api/chat').set(auth(token)).send({ message: 'MSG-ZXQ-second' });
    const logs = lines.join('');
    assert.ok(lines.length >= 2, 'requests are logged');
    for (const s of ['ZXQ', 'Orbit Heist', 'space crew', 'Bearer', token, 'UPSTREAM-SECRET-BODY', 'test-gemini-key']) assert.ok(!logs.includes(s), `log leaks ${s}`);
    assert.match(logs, /chat turn done/);
  });
});
