import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api/client';
import HeroBanner from '../components/ui/HeroBanner';
import ContentRow from '../components/ui/ContentRow';
import FixtureCard, { tileBackground } from '../components/sports/FixtureCard';
import { SPORTS_CATEGORIES } from '../constants';

const ENDED = ['finished', 'off'];
const MAX_TOURNAMENTS = 12;

// Reuses the home-page chip look: white when active, soft grey otherwise.
function Chip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`flex-shrink-0 h-10 px-5 rounded-full text-sm font-medium transition-colors ${
        active ? 'bg-white text-black' : 'bg-white/10 text-[#e1e6f0] hover:bg-white/20'
      }`}
    >
      {children}
    </button>
  );
}

export default function Sports() {
  const [sport, setSport] = useState(null); // SPORTS_CATEGORIES entry or null = all
  const [league, setLeague] = useState(null);
  const [fixtures, setFixtures] = useState({ events: [], partial: false });
  const [fixturesLoading, setFixturesLoading] = useState(true);
  const [titles, setTitles] = useState({ movies: [], shows: [] });
  const [titlesLoading, setTitlesLoading] = useState(true);
  const matchesRef = useRef(null);

  // Fixtures for every sport load once; the chips filter them client-side.
  useEffect(() => {
    api.get('/sports/fixtures')
      .then((res) => setFixtures(res.data))
      .catch(() => {})
      .finally(() => setFixturesLoading(false));
  }, []);

  // TMDB sports titles are fetched per sport (cached server-side).
  useEffect(() => {
    let stale = false;
    setTitlesLoading(true);
    api.get('/sports/titles', { params: sport ? { sport: sport.name.toLowerCase() } : {} })
      .then((res) => { if (!stale) setTitles(res.data); })
      .catch(() => { if (!stale) setTitles({ movies: [], shows: [] }); })
      .finally(() => { if (!stale) setTitlesLoading(false); });
    return () => { stale = true; };
  }, [sport]);

  const sportEvents = useMemo(
    () => fixtures.events.filter((e) => !sport || e.sport === sport.name.toLowerCase()),
    [fixtures, sport],
  );

  // "Popular Tournaments" = leagues that actually have fixtures right now, busiest first.
  const tournaments = useMemo(() => {
    const byLeague = new Map();
    sportEvents.forEach((e) => {
      if (!e.league) return;
      const t = byLeague.get(e.league) || { id: e.league, name: e.league, sport: e.sport, count: 0 };
      t.count += 1;
      byLeague.set(e.league, t);
    });
    return [...byLeague.values()].sort((a, b) => b.count - a.count).slice(0, MAX_TOURNAMENTS);
  }, [sportEvents]);

  const shown = sportEvents.filter((e) => !league || e.league === league);
  const upcoming = shown.filter((e) => !ENDED.includes(e.status));
  const results = shown.filter((e) => e.status === 'finished');

  // Hero: the most popular real sports titles with a description, movies and shows interleaved.
  const heroItems = useMemo(() => {
    const merged = [];
    for (let i = 0; i < 6; i++) {
      if (titles.movies[i]) merged.push(titles.movies[i]);
      if (titles.shows[i]) merged.push(titles.shows[i]);
    }
    return merged.filter((t) => t.overview).slice(0, 8);
  }, [titles]);

  const pickSport = (s) => { setSport(s); setLeague(null); };
  const pickLeague = (name) => {
    setLeague(name);
    matchesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const noFixtures = !fixturesLoading && upcoming.length === 0 && results.length === 0;

  return (
    <main className={`min-h-screen bg-hotstar-bg pb-12 ${heroItems.length || titlesLoading ? '' : 'pt-24'}`}>
      <HeroBanner key={sport?.id || "all"} items={heroItems} loading={titlesLoading && !heroItems.length} />

      {/* Sport filter */}
      <div className="px-4 sm:px-8 lg:px-12 pt-6 pb-8 flex gap-2.5 overflow-x-auto">
        <Chip active={!sport} onClick={() => pickSport(null)}>All Sports</Chip>
        {SPORTS_CATEGORIES.map((c) => (
          <Chip key={c.id} active={sport?.id === c.id} onClick={() => pickSport(c)}>{c.name}</Chip>
        ))}
      </div>

      {/* Popular Tournaments: text tiles built from real fixtures (no logos) */}
      {tournaments.length > 0 && (
        <section className="px-4 sm:px-8 lg:px-12 mb-10">
          <h2 className="section-title">Popular Tournaments</h2>
          <div className="flex gap-2.5 overflow-x-auto pb-1">
            {tournaments.map((t) => (
              <button
                key={t.id}
                onClick={() => pickLeague(league === t.name ? null : t.name)}
                aria-pressed={league === t.name}
                className={`flex-shrink-0 w-56 sm:w-[246px] aspect-video rounded-lg flex items-center justify-center p-4 text-center text-lg font-bold leading-tight text-white transition-all hover:brightness-125 ${
                  league === t.name ? 'ring-2 ring-white' : ''
                }`}
                style={{ background: tileBackground(t.sport) }}
              >
                <span className="line-clamp-3">{t.name}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Real fixtures and results */}
      <div ref={matchesRef} className="scroll-mt-24">
        {league && (
          <div className="px-4 sm:px-8 lg:px-12 mb-4 flex items-center gap-3 text-sm text-[#a8aeba]">
            Showing {league}
            <button onClick={() => setLeague(null)} className="text-white underline underline-offset-2">Clear</button>
          </div>
        )}
        <ContentRow
          title="Live & Upcoming"
          items={upcoming}
          loading={fixturesLoading}
          cardVariant="clip"
          renderItem={(e) => <FixtureCard event={e} />}
        />
        <ContentRow
          title="Latest Results"
          items={results}
          cardVariant="clip"
          renderItem={(e) => <FixtureCard event={e} />}
        />
      </div>

      {noFixtures && (
        <section className="px-4 sm:px-8 lg:px-12 mb-10">
          <h2 className="section-title">Live & Upcoming</h2>
          <div className="rounded-lg bg-white/5 px-5 py-8 text-center text-[#a8aeba]">
            <p className="text-white font-semibold mb-1">
              No fixtures right now{sport ? ` for ${sport.name}` : ''}
            </p>
            <p className="text-sm">
              {fixtures.partial
                ? 'Our fixtures provider is busy. Please check back in a minute.'
                : 'Nothing is scheduled in our data source for yesterday, today or tomorrow.'}
            </p>
          </div>
        </section>
      )}

      {/* TMDB sports titles, JioHotstar clip-style rows */}
      <ContentRow title="Sports Movies & Documentaries" items={titles.movies} loading={titlesLoading} cardVariant="clip" />
      <ContentRow title="Sports Shows" items={titles.shows} loading={titlesLoading} cardVariant="clip" />
    </main>
  );
}
