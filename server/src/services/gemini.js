import { env } from '../config/env.js';

const BASE = 'https://generativelanguage.googleapis.com/v1beta';
const BATCH = Number(process.env.GEMINI_EMBED_CHUNK) || 20; // free-tier limits are per minute (tokens too), so keep requests small
const RETRIES = 3;
const retryBaseMs = () => Number(process.env.GEMINI_RETRY_BASE_MS) || 1000;

export class GeminiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'GeminiError';
    this.status = status;   // upstream HTTP status (429 = quota / rate limit)
  }
}

export const geminiConfigured = () => Boolean(env.gemini.apiKey);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const isV2 = (model) => /embedding-2/.test(model);

/**
 * One embedContent request. gemini-embedding-2 has no task_type: the task goes in a text prefix
 * instead. gemini-embedding-001 takes taskType. Both accept a reduced output dimensionality.
 */
export function buildEmbedRequest(text, { kind = 'document', title, model, dims }) {
  const base = { model: `models/${model}`, outputDimensionality: dims };
  if (isV2(model)) {
    const input = kind === 'query' ? `task: search result | query: ${text}` : `title: ${title || 'none'} | text: ${text}`;
    return { ...base, content: { parts: [{ text: input }] } };
  }
  return {
    ...base,
    taskType: kind === 'query' ? 'RETRIEVAL_QUERY' : 'RETRIEVAL_DOCUMENT',
    content: { parts: [{ text }] },
  };
}

// Unit length, so cosine similarity is a plain dot product (also what the vector index expects).
export function normalize(v) {
  const norm = Math.hypot(...v) || 1;
  return v.map((x) => x / norm);
}

// Google's 429 body carries "retryDelay": "34s". Only that field is read; the body is never logged.
async function retryDelayMs(res) {
  try {
    const info = (await res.json())?.error?.details?.find((d) => d.retryDelay);
    return info ? Math.ceil(parseFloat(info.retryDelay) * 1000) || 0 : 0;
  } catch { return 0; }
}

/**
 * @param {{patient?: boolean}} opts patient = background work that can afford to wait out a per-minute
 *   rate limit (waits ~20s, 40s, 80s). Interactive calls (a user's question) give up quickly instead.
 */
async function post(path, body, { patient = false } = {}) {
  let lastErr;
  const base = retryBaseMs() * (patient ? 20 : 1);
  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    let res;
    try {
      res = await fetch(`${BASE}${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': env.gemini.apiKey },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(20_000),
      });
    } catch {
      lastErr = new GeminiError('Gemini unreachable', 504);
      await sleep(base * 2 ** attempt);
      continue;
    }
    if (res.ok) return res.json();
    // Never put the response body in the error: it can echo request content.
    lastErr = new GeminiError(`Gemini returned ${res.status}`, res.status);
    if (res.status !== 429 && res.status < 500) throw lastErr; // 4xx other than 429 won't fix itself
    const wait = Number(res.headers.get('retry-after')) * 1000 || (await retryDelayMs(res)) || base * 2 ** attempt;
    if (attempt < RETRIES) await sleep(Math.min(wait, 120_000));
  }
  throw lastErr;
}

/** @returns {Promise<number[][]>} one unit-length vector per input text, in order */
export async function embedTexts(texts, { kind = 'document', titles = [] } = {}) {
  if (!geminiConfigured()) throw new GeminiError('GEMINI_API_KEY is not set', 503);
  const { embedModel: model, embedDims: dims } = env.gemini;
  const out = [];
  for (let i = 0; i < texts.length; i += BATCH) {
    const requests = texts.slice(i, i + BATCH).map((text, j) =>
      buildEmbedRequest(text, { kind, title: titles[i + j], model, dims }));
    const data = await post(`/models/${model}:batchEmbedContents`, { requests }, { patient: kind === 'document' });
    const vectors = data.embeddings?.map((e) => e.values);
    if (!vectors || vectors.length !== requests.length || vectors.some((v) => !Array.isArray(v))) {
      throw new GeminiError('Unexpected embedding response', 502);
    }
    out.push(...vectors.map(normalize));
  }
  return out;
}
