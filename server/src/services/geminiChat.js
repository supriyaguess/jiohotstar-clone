import { env } from '../config/env.js';
import { GeminiError, geminiConfigured } from './gemini.js';
import { decodeBody, parseSse } from '../chat/sse.js';

const BASE = 'https://generativelanguage.googleapis.com/v1beta';
const CALL_TIMEOUT_MS = 25_000;
const HEADERS_TIMEOUT_MS = 12_000;      // a model that is silent this long is skipped when another one is available
const QUOTA_COOLDOWN_MS = 5 * 60_000;   // 429: that model's free quota is spent, don't spend a call finding out again
const FAILURE_COOLDOWN_MS = 60_000;      // 5xx / timeout
const retryBaseMs = () => Number(process.env.GEMINI_RETRY_BASE_MS) || 500;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// model -> time until which it is skipped. Without this every request first burned a call on an exhausted model.
const cooldowns = new Map();
export const resetModelCooldowns = () => cooldowns.clear();
const coolDown = (model, status) => cooldowns.set(model, Date.now() + (status === 429 ? QUOTA_COOLDOWN_MS : FAILURE_COOLDOWN_MS));

async function openStream({ system, contents, tools, signal, retries, models, forceTool }) {
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: system }] },
    contents,
    tools: [{ functionDeclarations: tools }],
    // ANY = the model must call a function; AUTO = it may answer directly.
    toolConfig: { functionCallingConfig: { mode: forceTool ? 'ANY' : 'AUTO' } },
    // Thinking models spend part of this budget before answering; too small and the answer is cut off (MAX_TOKENS).
    generationConfig: { maxOutputTokens: 1500, temperature: 0.6 },
  });
  let lastErr;
  // Models in cooldown go last (never dropped: if all are cooling down, they are all still tried).
  const now = Date.now();
  models = [...models.filter((m) => (cooldowns.get(m) ?? 0) <= now), ...models.filter((m) => (cooldowns.get(m) ?? 0) > now)];
  // With fallback models available, one attempt per model: moving on beats waiting out an overloaded one.
  const attempts = models.length > 1 ? 1 : retries + 1;
  for (const [idx, model] of models.entries()) {
   for (let attempt = 0; attempt < attempts; attempt++) {
    if (signal.aborted) throw new GeminiError('aborted', 499);
    const headersGuard = new AbortController();
    const guardTimer = idx < models.length - 1 ? setTimeout(() => headersGuard.abort(), HEADERS_TIMEOUT_MS) : null;
    const callSignal = AbortSignal.any([signal, AbortSignal.timeout(CALL_TIMEOUT_MS), headersGuard.signal]);
    try {
      const res = await fetch(`${BASE}/models/${model}:streamGenerateContent?alt=sse`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': env.gemini.apiKey },
        body,
        signal: callSignal,
      });
      clearTimeout(guardTimer);
      if (res.ok && res.body) { cooldowns.delete(model); return { res, callSignal, model }; }
      // The upstream body is never read or surfaced: it can echo request content.
      await res.body?.cancel().catch(() => {});
      lastErr = new GeminiError(`Gemini returned ${res.status}`, res.status);
      if (res.status !== 429 && res.status < 500) throw lastErr;
      coolDown(model, res.status);
    } catch (err) {
      clearTimeout(guardTimer);
      if (err instanceof GeminiError && err.status !== 429 && err.status < 500) throw err;
      if (signal.aborted) throw new GeminiError('aborted', 499);
      if (!(err instanceof GeminiError)) { lastErr = new GeminiError('Gemini unreachable', 504); coolDown(model, 504); }
    }
    if (attempt < attempts - 1) await sleep(Math.min(retryBaseMs() * 2 ** attempt, 2000));
   }
  }
  throw lastErr;
}

/**
 * One model round. Yields { type: 'text', text, part } and { type: 'call', name, args, id, part }
 * as the stream arrives, then { type: 'end', finishReason, blocked }.
 * `part` is the raw part, to be echoed back verbatim (Gemini 3 needs its thoughtSignature).
 * Only the first round retries 429/5xx: this is interactive, so never wait out a per-minute limit.
 */
export async function* streamGenerate({ system, contents, tools, signal, retries = 0, model, forceTool = false }) {
  if (!geminiConfigured()) throw new GeminiError('GEMINI_API_KEY is not set', 503);
  // `model` pins one model (later rounds of a turn must reuse the first round's model: its thought signatures
  // are model-specific). Without it, the configured model is tried first, then the fallbacks.
  const models = model ? [model] : [env.gemini.chatModel, ...env.gemini.chatFallbackModels];
  const { res, callSignal, model: used } = await openStream({ system, contents, tools, signal, retries, models, forceTool });
  let finishReason = null;
  let blocked = false;
  try {
    for await (const ev of parseSse(decodeBody(res.body))) {
      if (ev.error) throw new GeminiError('Gemini stream error', Number(ev.error.code) || 502);
      if (ev.promptFeedback?.blockReason) blocked = true;
      const cand = ev.candidates?.[0];
      if (!cand) continue;
      for (const part of cand.content?.parts || []) {
        if (part.thought) continue; // thought summaries are never shown
        if (part.functionCall?.name) {
          yield { type: 'call', name: part.functionCall.name, args: part.functionCall.args || {}, id: part.functionCall.id, part };
        } else if (typeof part.text === 'string') {
          if (part.text) yield { type: 'text', text: part.text, part };
          else if (part.thoughtSignature) yield { type: 'text', text: '', part };
        }
      }
      if (cand.finishReason) finishReason = cand.finishReason;
    }
  } catch (err) {
    if (err instanceof GeminiError) throw err;
    if (signal.aborted) throw new GeminiError('aborted', 499);
    throw new GeminiError(callSignal.aborted ? 'Gemini timed out' : 'Gemini stream failed', 504);
  }
  yield { type: 'end', finishReason, blocked, model: used };
}
