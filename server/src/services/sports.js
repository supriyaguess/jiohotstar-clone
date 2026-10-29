import { cached } from '../cache/redis.js';
import { tmdb } from './tmdb.js';

const SPORTSDB = 'https://www.thesportsdb.com/api/v1/json/123';
const MINUTE = 60;
const HOUR = 3600;

// Our sport keys -> provider sport names (fixtures) and TMDB keyword ids (titles).
// TheSportsDB has no Kabaddi data, so it simply never produces fixtures (the UI shows an empty state).
export const SPORTS = {
  cricket: { label: 'Cricket', fixtures: ['Cricket'], keywords: '5719' },
  football: { label: 'Football', fixtures: ['Soccer'], keywords: '13042' },
  kabaddi: { label: 'Kabaddi', fixtures: [], keywords: '235329|231213' },
  hockey: { label: 'Hockey', fixtures: ['Field Hockey'], keywords: '289584|236564|6483' },
  tennis: { label: 'Tennis', fixtures: ['Tennis'], keywords: '1488' },
  badminton: { label: 'Badminton', fixtures: ['Badminton'], keywords: '206334' },
};
export const SPORT_KEYS = Object.keys(SPORTS);

// The free provider key allows only ~10 requests/minute, so day lookups are cached individually and
// we back off for a minute as soon as it starts refusing us.
let cooldownUntil = 0;

const day = (offset) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);

const LIVE = new Set(['1H', '2H', 'HT', 'ET', 'BT', 'P', 'LIVE', 'IN PROGRESS', 'INT']);
const FINISHED = new Set(['FT', 'AET', 'PEN', 'AOT', 'AP', 'MATCH FINISHED', 'FINISHED']);
const OFF = new Set(['PST', 'CANC', 'ABD', 'AWD', 'WO', 'POSTPONED', 'CANCELLED', 'ABANDONED']);

function eventStatus(raw, startsAt) {
  const s = String(raw || '').trim().toUpperCase();
  if (LIVE.has(s)) return 'live';
  if (FINISHED.has(s)) return 'finished';
  if (OFF.has(s)) return 'off';
  if (s === 'NS' || s === 'NOT STARTED') return 'upcoming';
  // Provider gave no status (common for cricket): only claim what the clock tells us.
  return Date.parse(startsAt) > Date.now() ? 'upcoming' : 'started';
}

const score = (v) => (v === null || v === undefined || v === '' || Number.isNaN(Number(v)) ? null : Number(v));

// Provider shape -> our shape. Nothing outside this file knows about TheSportsDB field names.
export function normaliseEvent(e, sportKey) {
  if (!e?.idEvent || !e.strTimestamp) return null;
  const startsAt = `${e.strTimestamp}Z`; // provider timestamps are UTC without a zone suffix
  if (Number.isNaN(Date.parse(startsAt))) return null;
  return {
    id: String(e.idEvent),
    sport: sportKey,
    league: e.strLeague || null,
    title: e.strEvent || [e.strHomeTeam, e.strAwayTeam].filter(Boolean).join(' vs '),
    home: e.strHomeTeam || null,
    away: e.strAwayTeam || null,
    homeScore: score(e.intHomeScore),
    awayScore: score(e.intAwayScore),
    startsAt,
    status: eventStatus(e.strStatus, startsAt),
    venue: e.strVenue || null,
  };
}

async function fetchDay(providerSport, date) {
  if (Date.now() < cooldownUntil) throw new Error('Fixtures provider cooling down');
  const url = `${SPORTSDB}/eventsday.php?d=${date}&s=${encodeURIComponent(providerSport)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) }).catch(() => null);
  const body = res?.ok ? await res.json().catch(() => null) : null;
  if (!body) {
    // Non-JSON / non-2xx is how the provider signals rate limiting.
    cooldownUntil = Date.now() + MINUTE * 1000;
    throw new Error('Fixtures provider unavailable');
  }
  return body.events || [];
}

// Never throws: returns what it could get and flags the rest as partial.
export async function getFixtures(sport) {
  const keys = sport ? [sport] : SPORT_KEYS;
  const pairs = [];
  // Today first, then tomorrow (upcoming), then yesterday (results) so a rate limit costs the least useful data.
  for (const [offset, ttl] of [[0, 5 * MINUTE], [1, 30 * MINUTE], [-1, 2 * HOUR]]) {
    for (const key of keys) for (const ps of SPORTS[key].fixtures) pairs.push({ key, ps, date: day(offset), ttl });
  }

  const events = new Map();
  let partial = false;
  for (const { key, ps, date, ttl } of pairs) {
    try {
      const raw = await cached(`sports:day:${ps}:${date}`, ttl, () => fetchDay(ps, date));
      for (const e of raw) {
        const n = normaliseEvent(e, key);
        if (n) events.set(n.id, n);
      }
    } catch {
      partial = true;
    }
  }

  const rank = { live: 0, started: 1, upcoming: 2, finished: 3, off: 4 };
  const sorted = [...events.values()].sort((a, b) => (
    rank[a.status] - rank[b.status]
    || (a.status === 'finished' ? Date.parse(b.startsAt) - Date.parse(a.startsAt) : Date.parse(a.startsAt) - Date.parse(b.startsAt))
  ));
  return { events: sorted, partial };
}

// Real sports titles from TMDB (documentaries, films, series) selected by sport keyword.
export async function getTitles(sport) {
  const kw = sport ? SPORTS[sport].keywords : '6075|159290'; // "sports" | "sports documentary"
  const common = { with_keywords: kw, sort_by: 'popularity.desc', 'vote_count.gte': 5 };
  const load = async (type, extra = {}) => {
    try {
      const data = await tmdb(`/discover/${type}`, { ...common, ...extra });
      return (data.results || []).filter((r) => r.backdrop_path).map((r) => ({ ...r, media_type: type }));
    } catch {
      return []; // upstream down -> empty row, never a 500
    }
  };
  const [movies, shows] = await Promise.all([
    load('movie', sport ? {} : { with_genres: 99 }),
    load('tv'),
  ]);
  return { movies, shows };
}
