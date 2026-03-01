import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import ContentRow from '../components/ui/ContentRow';
import ContentCard from '../components/ui/ContentCard';
import {
  getPopularMovies,
  getTopRatedMovies,
  getUpcomingMovies,
  getNowPlayingMovies,
  discoverMoviesByGenre,
} from '../api/tmdb';
import { MOVIE_GENRES } from '../constants';
import { RowSkeleton } from '../components/ui/LoadingSpinner';

const TABS = [
  { key: 'popular', label: 'Popular' },
  { key: 'top_rated', label: 'Top Rated' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'now_playing', label: 'Now Playing' },
];

const FETCH_MAP = {
  popular: getPopularMovies,
  top_rated: getTopRatedMovies,
  upcoming: getUpcomingMovies,
  now_playing: getNowPlayingMovies,
};

export default function Movies() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'popular';
  const [movies, setMovies] = useState([]);
  const [genreMovies, setGenreMovies] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedGenre, setSelectedGenre] = useState(null);
  const [genreResults, setGenreResults] = useState([]);
  const [genreLoading, setGenreLoading] = useState(false);

  // Fetch tab movies
  useEffect(() => {
    setLoading(true);
    setMovies([]);
    const fetchFn = FETCH_MAP[activeTab] || getPopularMovies;
    fetchFn()
      .then((res) => setMovies(res.data.results))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [activeTab]);

  // Fetch a couple genre rows on mount
  useEffect(() => {
    const genresToFetch = MOVIE_GENRES.slice(0, 4);
    Promise.allSettled(genresToFetch.map((g) => discoverMoviesByGenre(g.id))).then(
      (results) => {
        const newData = {};
        results.forEach((r, i) => {
          if (r.status === 'fulfilled') {
            newData[genresToFetch[i].name] = r.value.data.results;
          }
        });
        setGenreMovies(newData);
      }
    );
  }, []);

  // Fetch selected genre
  useEffect(() => {
    if (!selectedGenre) return;
    setGenreLoading(true);
    discoverMoviesByGenre(selectedGenre.id)
      .then((res) => setGenreResults(res.data.results))
      .catch(console.error)
      .finally(() => setGenreLoading(false));
  }, [selectedGenre]);

  return (
    <main className="min-h-screen bg-hotstar-bg pt-6">
      {/* Page header */}
      <div className="px-4 sm:px-8 lg:px-12 mb-8">
        <h1 className="text-3xl sm:text-4xl font-black text-white mb-2">Movies</h1>
        <p className="text-gray-400 text-sm">Thousands of movies. Unlimited entertainment.</p>
      </div>

      {/* Tabs */}
      <div className="px-4 sm:px-8 lg:px-12 mb-6 flex gap-2 overflow-x-auto hide-scrollbar pb-2">
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

      {/* Tab content grid */}
      {loading ? (
        <RowSkeleton />
      ) : (
        <div className="px-4 sm:px-8 lg:px-12 mb-10">
          <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3">
            {movies.map((movie) => (
              <ContentCard key={movie.id} item={{ ...movie, media_type: 'movie' }} variant="poster" />
            ))}
          </div>
        </div>
      )}

      {/* Genre filter chips */}
      <div className="px-4 sm:px-8 lg:px-12 mb-6">
        <h2 className="text-xl font-bold text-white mb-4">Browse by Genre</h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedGenre(null)}
            className={`genre-badge transition-all ${!selectedGenre ? 'bg-purple-600/30 border-purple-500 text-purple-300' : ''}`}
          >
            All
          </button>
          {MOVIE_GENRES.map((g) => (
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
          <h3 className="text-lg font-bold text-white mb-4">{selectedGenre.name} Movies</h3>
          {genreLoading ? (
            <RowSkeleton />
          ) : (
            <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3">
              {genreResults.map((movie) => (
                <ContentCard key={movie.id} item={{ ...movie, media_type: 'movie' }} variant="poster" />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Genre rows */}
      {!selectedGenre && Object.entries(genreMovies).map(([genre, items]) => (
        <ContentRow
          key={genre}
          title={genre}
          items={items}
          cardVariant="poster"
        />
      ))}
    </main>
  );
}
