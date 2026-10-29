import { redis } from '../cache/redis.js';

const TTL_SECONDS = 2 * 3600;
const MAX_MESSAGES = 20;      // 10 turns (user + bot), used both for the model window and for /history
const key = (userId) => `chat:conv:${userId}`;

const isTitle = (t) => t && Number.isInteger(t.tmdbId) && (t.mediaType === 'movie' || t.mediaType === 'tv') && typeof t.title === 'string';

function clean(m) {
  if (!m || (m.role !== 'user' && m.role !== 'bot') || typeof m.text !== 'string') return null;
  const out = { role: m.role, text: m.text.slice(0, 4000) };
  if (m.role === 'bot' && Array.isArray(m.titles) && m.titles.length) out.titles = m.titles.filter(isTitle).slice(0, 8);
  return out;
}

/** Display messages, oldest first. Redis trouble means "no memory", never a failed request. */
export async function loadMessages(userId) {
  try {
    const raw = await redis.get(key(userId));
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.map(clean).filter(Boolean).slice(-MAX_MESSAGES) : [];
  } catch { return []; }
}

/** Append one finished exchange (text and title cards only, never tool payloads), trimmed on write. */
export async function saveExchange(userId, userText, botText, titles = []) {
  const messages = await loadMessages(userId);
  messages.push({ role: 'user', text: userText }, { role: 'bot', text: botText, ...(titles.length && { titles }) });
  const trimmed = messages.map(clean).filter(Boolean).slice(-MAX_MESSAGES);
  try { await redis.set(key(userId), JSON.stringify(trimmed), 'EX', TTL_SECONDS); } catch { /* memory is best effort */ }
}

export const clearMessages = (userId) => redis.del(key(userId));

/** Gemini `contents` for the stored history (text only). */
export function toContents(messages) {
  return messages.map((m) => ({ role: m.role === 'bot' ? 'model' : 'user', parts: [{ text: m.text }] }));
}
