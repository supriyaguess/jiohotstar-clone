import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';
import { redis } from '../cache/redis.js';
import { Title, SyncState } from '../db/models.js';
import { tmdb } from '../services/tmdb.js';
import { embedTexts, GeminiError } from '../services/gemini.js';
import { toTitleRecord } from './document.js';

const LOCK_KEY = 'rag:sync:lock';
const LOCK_SECONDS = 30 * 60;
const STALE_DAYS = 30;          // re-check titles that haven't been refreshed in this long
const DETAIL_CONCURRENCY = 5;

const LISTS = {
  movie: ['popular', 'top_rated', 'now_playing', 'upcoming'],
  tv: ['popular', 'top_rated', 'on_the_air', 'airing_today'],
};

class NothingToEmbed extends Error {}

export class SyncBusyError extends Error {
  constructor() { super('A catalog sync is already running'); this.name = 'SyncBusyError'; }
}

const log = (level, msg, extra = {}) => {
  if (env.logLevel !== 'silent') console[level](JSON.stringify({ level, msg, ...extra }));
};

async function mapPool(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  }));
  return out;
}

// ── lock: the cron service may fire twice, and a deploy may overlap a run ─────────────────────
async function acquireLock() {
  const token = randomUUID();
  return (await redis.set(LOCK_KEY, token, 'EX', LOCK_SECONDS, 'NX')) === 'OK' ? token : null;
}
async function releaseLock(token) {
  if ((await redis.get(LOCK_KEY).catch(() => null)) === token) await redis.del(LOCK_KEY).catch(() => {});
}

const getState = async () => (await SyncState.findOne({ key: 'catalog' }).lean())?.value ?? {};
const setState = (patch) => getState().then((cur) =>
  SyncState.updateOne({ key: 'catalog' }, { $set: { value: { ...cur, ...patch } } }, { upsert: true }));

export const syncStatus = async () => ({
  titles: await Title.estimatedDocumentCount(),
  running: Boolean(await redis.get(LOCK_KEY).catch(() => null)),
  ...(await getState()),
});

// ── candidate discovery ───────────────────────────────────────────────────────────────────────
async function discover(pages) {
  const found = new Map(); // "movie:603" -> { mediaType, id }
  const add = (mediaType, results = []) => results.forEach((r) => {
    if (r.id && (mediaType === 'movie' || mediaType === 'tv')) found.set(`${mediaType}:${r.id}`, { mediaType, id: r.id });
  });

  const jobs = [];
  for (const [mediaType, lists] of Object.entries(LISTS)) {
    for (const list of lists) for (let page = 1; page <= pages; page++) {
      jobs.push(() => tmdb(`/${mediaType}/${list}`, { page }).then((d) => add(mediaType, d.results)));
    }
  }
  jobs.push(() => tmdb('/trending/all/week').then((d) => (d.results || []).forEach((r) => add(r.media_type, [r]))));
  // A failing list shouldn't sink the whole run.
  await mapPool(jobs, 4, (job) => job().catch((err) => log('warn', 'discover failed', { err: err.message })));
  return found;
}

// Titles TMDB says changed since the last sync (only ones we already hold are worth re-checking).
async function changedSince(sinceIso) {
  const maxRange = Date.now() - 13 * 86400_000; // TMDB allows at most a 14-day window
  const start = new Date(Math.max(new Date(sinceIso).getTime(), maxRange)).toISOString().slice(0, 10);
  const ids = new Set();
  for (const mediaType of ['movie', 'tv']) {
    for (let page = 1; page <= 3; page++) {
      const d = await tmdb(`/${mediaType}/changes`, { start_date: start, page }).catch(() => null);
      (d?.results || []).forEach((r) => ids.add(`${mediaType}:${r.id}`));
      if (!d || page >= (d.total_pages || 1)) break;
    }
  }
  return ids;
}

// ── the sync itself ───────────────────────────────────────────────────────────────────────────
async function doSync({ budget = env.sync.embedBudget, pages = 2 } = {}) {
  const started = Date.now();
  const stats = { candidates: 0, created: 0, updated: 0, unchanged: 0, embedded: 0, deferred: 0, errors: 0, partial: false };
  const state = await getState();

  const found = await discover(pages);
  const existing = await Title.find({}, 'tmdbId mediaType textHash embeddedAt').lean();
  const have = new Map(existing.map((t) => [`${t.mediaType}:${t.tmdbId}`, t]));

  const changed = state.lastSync ? await changedSince(state.lastSync) : new Set();
  const staleBefore = Date.now() - STALE_DAYS * 86400_000;
  const todo = [];
  for (const [key, ref] of found) {
    const row = have.get(key);
    if (!row) todo.push({ ...ref, isNew: true });
    else if (changed.has(key) || !row.embeddedAt || row.embeddedAt.getTime() < staleBefore) todo.push({ ...ref, isNew: false });
  }
  for (const key of changed) { // changed titles we hold, even if they weren't in today's lists
    const [mediaType, id] = key.split(':');
    if (have.has(key) && !found.has(key)) todo.push({ mediaType, id: Number(id), isNew: false });
  }
  stats.candidates = todo.length;

  // Fetch details (with cast and crew), build records, split into "needs embedding" vs "unchanged".
  const records = (await mapPool(todo, DETAIL_CONCURRENCY, async (ref) => {
    try {
      const d = await tmdb(`/${ref.mediaType}/${ref.id}`, { append_to_response: 'credits' });
      const rec = toTitleRecord(ref.mediaType, d);
      return rec && { rec, isNew: ref.isNew };
    } catch (err) {
      stats.errors++;
      log('warn', 'details failed', { mediaType: ref.mediaType, id: ref.id, err: err.message });
      return null;
    }
  })).filter(Boolean);

  const needEmbed = [];
  for (const { rec, isNew } of records) {
    const row = have.get(`${rec.mediaType}:${rec.tmdbId}`);
    if (row && row.textHash === rec.textHash && row.embeddedAt) {
      const { text, textHash, ...meta } = rec; // text unchanged: refresh metadata (rating etc.), keep the embedding
      await Title.updateOne({ mediaType: rec.mediaType, tmdbId: rec.tmdbId }, { $set: { ...meta, embeddedAt: new Date() } });
      stats.unchanged++;
    } else needEmbed.push({ rec, isNew });
  }

  // New titles first: they matter most for "what's new" questions. The rest waits for tomorrow if over budget.
  needEmbed.sort((a, b) => Number(b.isNew) - Number(a.isNew));
  const batch = needEmbed.slice(0, budget);
  stats.deferred = needEmbed.length - batch.length;

  try {
    if (!batch.length) throw new NothingToEmbed();
    const vectors = await embedTexts(batch.map((b) => b.rec.text), { kind: 'document', titles: batch.map((b) => b.rec.title) });
    await Title.bulkWrite(batch.map(({ rec }, i) => ({
      updateOne: {
        filter: { mediaType: rec.mediaType, tmdbId: rec.tmdbId },
        update: { $set: { ...rec, embedding: vectors[i], embeddedAt: new Date() } },
        upsert: true,
      },
    })));
    batch.forEach(({ isNew }) => (isNew ? stats.created++ : stats.updated++));
    stats.embedded = batch.length;
  } catch (err) {
    if (err instanceof NothingToEmbed) { /* everything was unchanged */ }
    else if (!(err instanceof GeminiError)) throw err;
    else {
    // Quota or outage: keep what's already saved, retry the rest on the next run.
      stats.partial = true;
      stats.deferred += batch.length;
      stats.error = err.status === 429 ? 'gemini quota exhausted' : `gemini error ${err.status}`;
      log('warn', 'embedding stopped', { status: err.status });
    }
  }

  stats.ms = Date.now() - started;
  // Only move the "last sync" marker forward after a complete run, so no change is ever skipped.
  const complete = !stats.partial && stats.deferred === 0;
  await setState({ ...(complete ? { lastSync: new Date(started).toISOString() } : {}), lastRun: new Date().toISOString(), lastResult: stats });
  log('info', 'catalog sync finished', stats);
  return stats;
}

/** Run a sync and wait for it (CLI and tests). Throws SyncBusyError if one is already running. */
export async function syncCatalog(opts) {
  const lock = await acquireLock();
  if (!lock) throw new SyncBusyError();
  try { return await doSync(opts); } finally { await releaseLock(lock); }
}

/** Start a sync in the background and return immediately (cron endpoint). */
export async function startSync(opts) {
  const lock = await acquireLock();
  if (!lock) return { started: false };
  doSync(opts)
    .catch(async (err) => {
      log('error', 'catalog sync crashed', { err: err.message });
      await setState({ lastRun: new Date().toISOString(), lastResult: { error: err.message } }).catch(() => {});
    })
    .finally(() => releaseLock(lock));
  return { started: true };
}
