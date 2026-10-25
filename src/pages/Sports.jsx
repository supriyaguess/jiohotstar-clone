import { useEffect, useState } from 'react';
import { discoverMoviesByGenre, discoverTVByGenre } from '../api/tmdb';
import ContentRow from '../components/ui/ContentRow';
import { SPORTS_CATEGORIES } from '../constants';
import { api } from '../api/client';

function MatchCard({ match }) {
  const isLive = match.status === 'LIVE';
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors cursor-pointer min-w-[260px] sm:min-w-0">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          {match.tournament}
        </span>
        {isLive ? (
          <span className="flex items-center gap-1.5 text-xs font-bold text-red-400">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            LIVE
          </span>
        ) : (
          <span className="text-xs text-gray-500">{match.time}</span>
        )}
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-white font-semibold">{match.team1}</span>
          <span className="text-white font-bold text-sm">{match.score1}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-white font-semibold">{match.team2}</span>
          <span className="text-white font-bold text-sm">{match.score2}</span>
        </div>
      </div>
      {match.overs && (
        <p className="mt-2 text-xs text-gray-500">{match.overs}</p>
      )}
      {isLive && (
        <button
          className="mt-3 w-full py-1.5 rounded-lg text-xs font-semibold text-white flex items-center justify-center gap-1"
          style={{ background: 'linear-gradient(92.7deg, #1492ff 0%, #0860c4 50%, #eb0066 100%)' }}
        >
          ▶ Watch Live
        </button>
      )}
    </div>
  );
}

export default function Sports() {
  const [documentaries, setDocumentaries] = useState([]);
  const [sportsShows, setSportsShows] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState(null);

  useEffect(() => {
    api.get('/sports/matches').then((res) => setMatches(res.data)).catch(() => {});
    Promise.allSettled([
      discoverMoviesByGenre(99),    // Documentary genre
      discoverTVByGenre(10764),     // Reality/sports TV
    ]).then(([docsRes, sportsRes]) => {
      if (docsRes.status === 'fulfilled') setDocumentaries(docsRes.value.data.results);
      if (sportsRes.status === 'fulfilled') setSportsShows(sportsRes.value.data.results);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-hotstar-bg">
      {/* Sports Hero */}
      <div
        className="relative pt-8 pb-12 px-4 sm:px-8 lg:px-12 overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)',
        }}
      >
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-10 left-10 w-64 h-64 rounded-full bg-blue-500 blur-3xl" />
          <div className="absolute bottom-0 right-10 w-48 h-48 rounded-full bg-blue-500 blur-3xl" />
        </div>
        <div className="relative max-w-4xl">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-red-400 text-sm font-semibold uppercase tracking-widest">Live Sports</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-black text-white mb-4">
            Your <span className="gradient-text">Sports Hub</span>
          </h1>
          <p className="text-gray-300 text-base sm:text-lg max-w-2xl">
            Watch live cricket, football, kabaddi, and more. Never miss a match with JioHotstar Sports.
          </p>
        </div>
      </div>

      {/* Sport category chips */}
      <div className="px-4 sm:px-8 lg:px-12 py-6 flex gap-3 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveCategory(null)}
          className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
            !activeCategory ? 'text-white' : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
          }`}
          style={!activeCategory ? { background: 'linear-gradient(92.7deg, #1492ff 0%, #0860c4 50%, #eb0066 100%)' } : {}}
        >
          All Sports
        </button>
        {SPORTS_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat)}
            className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeCategory?.id === cat.id
                ? 'text-white'
                : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
            }`}
            style={activeCategory?.id === cat.id ? { backgroundColor: cat.color + '33', borderColor: cat.color, border: '1px solid' } : {}}
          >
            <span>{cat.icon}</span>
            <span>{cat.name}</span>
          </button>
        ))}
      </div>

      {/* Live/Upcoming matches */}
      <div className="px-4 sm:px-8 lg:px-12 mb-10">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-xl font-bold text-white">Live & Upcoming</h2>
          <span className="flex items-center gap-1.5 text-xs font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            {matches.filter((m) => m.status === 'LIVE').length} LIVE
          </span>
        </div>
        <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {matches
            .filter((m) => !activeCategory || m.sport === activeCategory.name)
            .map((match) => (
              <MatchCard key={match.id} match={match} />
            ))}
        </div>
      </div>

      {/* Sports stats banner */}
      <div className="px-4 sm:px-8 lg:px-12 mb-10">
        <div
          className="rounded-2xl p-6 sm:p-8 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center"
          style={{ background: 'linear-gradient(135deg, #1e1b4b, #1e3a5f)' }}
        >
          {[
            { label: 'Live Events', value: '50+', icon: '🔴' },
            { label: 'Sports', value: '20+', icon: '🏆' },
            { label: 'Countries', value: '100+', icon: '🌍' },
            { label: 'HD Channels', value: '8K+', icon: '📺' },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-3xl mb-1">{stat.icon}</div>
              <div className="text-2xl sm:text-3xl font-black text-white">{stat.value}</div>
              <div className="text-gray-400 text-xs mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Documentaries & Sports shows from TMDB */}
      <ContentRow
        title="🎬 Sports Documentaries"
        items={documentaries}
        cardVariant="poster"
        loading={loading}
      />
      <ContentRow
        title="📡 Sports & Reality Shows"
        items={sportsShows}
        cardVariant="poster"
        loading={loading}
      />
    </main>
  );
}
