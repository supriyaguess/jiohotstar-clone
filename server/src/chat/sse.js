/**
 * Incremental Server-Sent Events parser. Feed it string chunks (which may split mid-line or
 * mid-event); it yields the parsed JSON `data` of each complete event.
 */
export async function* parseSse(chunks) {
  let buf = '';
  const flush = function* (block) {
    const data = block.split(/\r?\n/).filter((l) => l.startsWith('data:')).map((l) => l.slice(5).replace(/^ /, '')).join('\n');
    if (!data || data === '[DONE]') return;
    try { yield JSON.parse(data); } catch { /* ignore a malformed event */ }
  };
  for await (const chunk of chunks) {
    buf += chunk;
    let m;
    while ((m = /\r?\n\r?\n/.exec(buf))) {
      const block = buf.slice(0, m.index);
      buf = buf.slice(m.index + m[0].length);
      yield* flush(block);
    }
  }
  if (buf.trim()) yield* flush(buf);
}

/** Decode a fetch Response body (web ReadableStream) into strings, keeping multi-byte chars intact. */
export async function* decodeBody(body) {
  const dec = new TextDecoder();
  for await (const bytes of body) yield dec.decode(bytes, { stream: true });
  const rest = dec.decode();
  if (rest) yield rest;
}
