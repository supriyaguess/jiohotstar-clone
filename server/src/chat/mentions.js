// Decide which title cards to show: only the ones the answer actually names. Tool results can hold six
// matches while the model recommends one, and a row of unrelated posters under a one-title answer looks wrong.

const norm = (s) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function isMentioned(text, title, bold, haystack) {
  const n = norm(title);
  if (!n) return false;
  if (bold.has(n)) return true;
  // One-word titles ("Hope", "Colony") are ordinary words, so require the exact capitalised form
  // as a whole word: "I hope you like it" must not pull in the movie "Hope".
  if (!n.includes(' ')) return new RegExp(`(?<![\\p{L}\\p{N}])${escapeRe(title)}(?![\\p{L}\\p{N}])`, 'u').test(text);
  return haystack.includes(` ${n} `);
}

/** @returns titles (in tool-result order) that appear in `text`; a lone candidate is kept (a details lookup). */
export function pickMentioned(text, candidates) {
  const bold = new Set([...text.matchAll(/\*\*(.+?)\*\*/g)].map((m) => norm(m[1].replace(/\(\d{4}\)\s*$/, ''))));
  const haystack = ` ${norm(text)} `;
  const hits = candidates.filter((t) => isMentioned(text, t.title, bold, haystack));
  return hits.length || candidates.length !== 1 ? hits : candidates;
}
