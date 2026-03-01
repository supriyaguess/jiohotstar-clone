import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import ContentRow from '../components/ui/ContentRow';
import ContentCard from '../components/ui/ContentCard';
import {
  getPopularTV,
  getTopRatedTV,
  getOnAirTV,
  getAiringTodayTV,
  discoverTVByGenre,
} from '../api/tmdb';
import { TV_GENRES } from '../constants';
import { RowSkeleton } from '../components/ui/LoadingSpinner';

const TABS = [
  { key: 'popular', label: 'Popular' },
  { key: 'top_rated', label: 'Top Rated' },
  { key: 'on_air', label: 'On Air' },
  { key: 'airing_today', label: 'Airing Today' },
];

const FETCH_MAP = {
  popular: getPopularTV,
  top_rated: getTopRatedTV,
  on_air: getOnAirTV,
  airing_today: getAiringTodayTV,
};

export default function TVShows() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'popular';
  const [shows, setShows] = useState([]);
  const [genreShows, setGenreShows] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedGenre, setSelectedGenre] = useState(null);
  const [genreResults, setGenreResults] = useState([]);
  const [genreLoading, setGenreLoading] = useState(false);

  // Fetch tab shows
  useEffect(() => {
    setLoading(true);
    setShows([]);
    const fetchFn = FETCH_MAP[activeTab] || getPopularTV;
    fetchFn()
      .then((res) => setShows(res.data.results))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [activeTab]);

  // Fetch genre rows on mount
  useEffect(() => {
    const genresToFetch = TV_GENRES.slice(0, 4);
    Promise.allSettled(genresToFetch.map((g) => discoverTVByGenre(g.id))).then((results) => {
      const newData = {};
      results.forEach((r, i) => {
        if (r.status === 'fulfilled') {
          newData[genresToFetch[i].name] = r.value.data.results;
        }
      });
      setGenreShows(newData);
    });
  }, []);

  // Fetch selected genre
  useEffect(() => {
    if (!selectedGenre) return;
    setGenreLoading(true);
    discoverTVByGenre(selectedGenre.id)
      .then((res) => setGenreResults(res.data.results))
      .catch(console.error)
      .finally(() => setGenreLoading(false));
  }, [selectedGenre]);

  return (
    <main className="min-h-screen bg-hotstar-bg pt-6">
      {/* Page header */}
      <div className="px-4 sm:px-8 lg:px-12 mb-8">
        <h1 className="text-3xl sm:text-4xl font-black text-white mb-2">TV Shows</h1>
        <p className="text-gray-400 text-sm">Binge-worthy series from around the world.</p>
      </div>

      {/* Tabs */}
      <div className="px-4 sm:px-8 lg:px-12 mb-6 flex gap-2 overflow-x-auto pb-2">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSearchParams({ tab: tab.key })}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
              activeTab === tab.key
                ? 'text-white shadow-lg'
                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
            }`}
            style={
              activeTab === tab.key
                ? { background: 'linear-gradient(135deg, #7c3aed, #2563eb)' }
                : {}
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {loading ? (
        <RowSkeleton />
      ) : (
        <div className="px-4 sm:px-8 lg:px-12 mb-10">
          <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3">
            {shows.map((show) => (
              <ContentCard key={show.id} item={{ ...show, media_type: 'tv' }} variant="poster" />
            ))}
          </div>
        </div>
      )}

      {/* Genre filter */}
      <div className="px-4 sm:px-8 lg:px-12 mb-6">
        <h2 className="text-xl font-bold text-white mb-4">Browse by Genre</h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedGenre(null)}
            className={`genre-badge transition-all ${!selectedGenre ? 'bg-purple-600/30 border-purple-500 text-purple-300' : ''}`}
          >
            All
          </button>
          {TV_GENRES.map((g) => (
            <button
              key={g.id}
              onClick={() => setSelectedGenre(g)}
              className={`genre-badge transition-all hover:border-purple-400 hover:text-white ${
                selectedGenre?.id === g.id ? 'bg-purple-600/30 border-purple-500 text-purple-300' : ''
              }`}
            >
              {g.name}
            </button>
          ))}
        </div>
      </div>

      {/* Genre results */}
      {selectedGenre && (
        <div className="px-4 sm:px-8 lg:px-12 mb-10">
          <h3 className="text-lg font-bold text-white mb-4">{selectedGenre.name} Shows</h3>
          {genreLoading ? (
            <RowSkeleton />
          ) : (
            <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3">
              {genreResults.map((show) => (
                <ContentCard key={show.id} item={{ ...show, media_type: 'tv' }} variant="poster" />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Genre rows */}
      {!selectedGenre && Object.entries(genreShows).map(([genre, items]) => (
        <ContentRow key={genre} title={genre} items={items} cardVariant="poster" />
      ))}
    </main>
  );
}
