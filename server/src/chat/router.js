// Decide, from the message alone, which lookups to run on the server before the model is called. That makes the
// common case one model call instead of two (a tool round, then an answer round): half the wait and half the quota.

const LIST = /\b(?:my list|meri list|mere list|my watchlist|watchlist|continue watching|my history|watch history|meri history|saved)\b|मेरी लिस्ट|मेरी सूची/iu;
const SPORTS = /\b(?:match|matches|score|scores|fixture|fixtures|cricket|football|soccer|kabaddi|tennis|hockey|badminton|ipl|t20|odi|live)\b|मैच|क्रिकेट/iu;

/** @returns {{name: string, args: object}[]} */
export function pickLookups(message) {
  if (LIST.test(message)) return [{ name: 'get_my_list', args: {} }, { name: 'get_watch_history', args: {} }];
  if (SPORTS.test(message)) return [{ name: 'get_sports_fixtures', args: {} }];
  return [{ name: 'search_catalog', args: { query: message } }];
}
