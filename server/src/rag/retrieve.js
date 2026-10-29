import { createHash } from 'node:crypto';
import { env } from '../config/env.js';
import { redis } from '../cache/redis.js';
import { Title } from '../db/models.js';
import { embedTexts } from '../services/gemini.js';

export const VECTOR_INDEX = 'titles_vector';
const QUERY_CACHE_SECONDS = 7 * 86400;
const BRUTE_FORCE_MAX = 5000;       // the fallback scan is only sensible for a catalog this small
const VECTOR_RETRY_AFTER_MS = 10 * 60_000;

let vectorSearchDownUntil = 0;      // after a $vectorSearch failure, skip it for a while

/** Create the Atlas vector index if it's missing. Safe to call on every boot. */
export async function ensureVectorIndex(log = () => {}) {
  try {
    const existing = await Title.collection.listSearchIndexes().toArray();
    if (existing.some((i) => i.name === VECTOR_INDEX)) return 'exists';
    await Title.collection.createSearchIndex({
      name: VECTOR_INDEX,
      type: 'vectorSearch',
      definition: {
        fields: [
          { type: 'vector', path: 'embedding', numDimensions: env.gemini.embedDims, similarity: 'cosine' },
          { type: 'filter', path: 'mediaType' },
          { type: 'filter', path: 'year' },
          { type: 'filter', path: 'genres' },
        ],
      },
    });
    return 'created';
  } catch (err) {
    log(`vector index unavailable (${err.codeName || err.message}); using the brute-force fallback`);
    return 'unavailable';
  }
}

async function embedQuery(query) {
  const key = `rag:q:${createHash('sha256').update(`${env.gemini.embedModel}|${env.gemini.embedDims}|${query}`).digest('hex')}`;
  try {
    const hit = await redis.get(key);
    if (hit) return JSON.parse(hit);
  } catch { /* cache is optional */ }
  const [vector] = await embedTexts([query], { kind: 'query' });
  redis.set(key, JSON.stringify(vector), 'EX', QUERY_CACHE_SECONDS).catch(() => {});
  return vector;
}

const toResult = (t, score) => ({
  tmdbId: t.tmdbId, mediaType: t.mediaType, title: t.title, year: t.year, genres: t.genres,
  rating: t.rating, overview: (t.overview || '').slice(0, 300), posterPath: t.posterPath, score: Number(score.toFixed(4)),
});

function mongoFilter({ mediaType, yearMin, genre }) {
  const f = {};
  if (mediaType) f.mediaType = mediaType;
  if (yearMin) f.year = { $gte: yearMin };
  if (genre) f.genres = genre;
  return f;
}

// $vectorSearch's pre-filter uses MQL operators and needs every field declared as a filter in the index.
function vectorFilter({ mediaType, yearMin, genre }) {
  const parts = [];
  if (mediaType) parts.push({ mediaType: { $eq: mediaType } });
  if (yearMin) parts.push({ year: { $gte: yearMin } });
  if (genre) parts.push({ genres: { $eq: genre } });
  return parts.length ? { $and: parts } : undefined;
}

async function viaAtlas(vector, filters, limit) {
  const filter = vectorFilter(filters);
  const rows = await Title.aggregate([
    { $vectorSearch: { index: VECTOR_INDEX, path: 'embedding', queryVector: vector, numCandidates: Math.max(100, limit * 15), limit, ...(filter && { filter }) } },
    { $project: { embedding: 0, text: 0, score: { $meta: 'vectorSearchScore' } } },
  ]);
  return rows.map((r) => toResult(r, r.score));
}

// Cosine similarity over stored vectors (they're unit length, so a dot product). Used on plain MongoDB
// without vector search (local dev, tests) and while a freshly created Atlas index is still building.
async function viaScan(vector, filters, limit) {
  const docs = await Title.find({ ...mongoFilter(filters), embedding: { $exists: true } })
    .select('+embedding').limit(BRUTE_FORCE_MAX).lean();
  return docs
    .map((d) => ({ d, score: d.embedding.reduce((sum, x, i) => sum + x * vector[i], 0) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ d, score }) => toResult(d, score));
}

/**
 * Semantic search over the catalog.
 * @param {string} query natural-language description ("slow-burn space thriller with a twist")
 * @param {{mediaType?: 'movie'|'tv', yearMin?: number, genre?: string, limit?: number}} [opts]
 */
export async function searchCatalog(query, { limit = 8, ...filters } = {}) {
  const vector = await embedQuery(query);
  if (Date.now() >= vectorSearchDownUntil) {
    try {
      const hits = await viaAtlas(vector, filters, limit);
      if (hits.length) return hits;
    } catch {
      vectorSearchDownUntil = Date.now() + VECTOR_RETRY_AFTER_MS;
    }
  }
  return viaScan(vector, filters, limit);
}
