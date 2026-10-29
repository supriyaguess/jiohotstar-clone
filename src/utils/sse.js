// Incremental Server-Sent Events parser. Feed it decoded text chunks; it returns the complete
// events seen so far and keeps any partial frame buffered for the next chunk.
export function createSSEParser() {
  let buffer = '';

  const parseFrame = (frame) => {
    let name = 'message';
    const data = [];
    for (const line of frame.split('\n')) {
      if (!line || line.startsWith(':')) continue; // blank or comment (heartbeat)
      const i = line.indexOf(':');
      const field = i === -1 ? line : line.slice(0, i);
      const value = i === -1 ? '' : line.slice(i + 1).replace(/^ /, '');
      if (field === 'event') name = value;
      else if (field === 'data') data.push(value);
    }
    if (!data.length) return null;
    try {
      return { event: name, data: JSON.parse(data.join('\n')) };
    } catch {
      return null; // malformed JSON: skip the frame rather than break the stream
    }
  };

  return function push(chunk) {
    buffer += chunk;
    // Normalise CRLF / lone CR; a trailing CR may be half of a CRLF split across chunks, so keep it.
    const tail = buffer.endsWith('\r') ? '\r' : '';
    buffer = buffer.slice(0, buffer.length - tail.length).replace(/\r\n?/g, '\n') + tail;
    const events = [];
    let idx;
    while ((idx = buffer.indexOf('\n\n')) !== -1) {
      const ev = parseFrame(buffer.slice(0, idx));
      buffer = buffer.slice(idx + 2);
      if (ev) events.push(ev);
    }
    return events;
  };
}
