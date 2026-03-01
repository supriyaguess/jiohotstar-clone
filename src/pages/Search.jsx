import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AiOutlineSearch } from 'react-icons/ai';
import { searchMulti } from '../api/tmdb';
import ContentCard from '../components/ui/ContentCard';
import { CardSkeleton } from '../components/ui/LoadingSpinner';

const FILTER_TABS = [
  { key: 'all', label: 'All' },
  { key: 'movie', label: 'Movies' },
  { key: 'tv', label: 'TV Shows' },
];

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const filter = searchParams.get('filter') || 'all';
  const navigate = useNavigate();

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [inputVal, setInputVal] = useState(query);
  const [totalResults, setTotalResults] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [allResults, setAllResults] = useState([]);

  useEffect(() => {
    setInputVal(query);
    setAllResults([]);
    setPage(1);
  }, [query]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setAllResults([]);
      return;
    }
    setLoading(true);
    setError(null);
    searchMulti(query, page)
      .then((res) => {
        const data = res.data.results.filter(
          (item) => item.media_type !== 'person' && (item.poster_path || item.backdrop_path)
        );
        setAllResults((prev) => (page === 1 ? data : [...prev, ...data]));
        setTotalResults(res.data.total_results);
        setTotalPages(res.data.total_pages);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [query, page]);

  const filtered =
    filter === 'all'
      ? allResults
      : allResults.filter((item) => item.media_type === filter);

  const handleSearch = (e) => {
    e.preventDefault();
    if (inputVal.trim()) {
      setSearchParams({ q: inputVal.trim(), filter });
    }
  };

  const handleLoadMore = () => {
    if (page < totalPages) setPage((p) => p + 1);
  };

  return (
    <main className="min-h-screen bg-hotstar-bg pt-6">
      <div className="px-4 sm:px-8 lg:px-12">
        {/* Search bar */}
        <form onSubmit={handleSearch} className="mb-8">
          <div className="relative max-w-2xl">
            <AiOutlineSearch
              size={22}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="Search movies, shows..."
              className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-full text-white placeholder-gray-500 outline-none focus:border-purple-500 focus:bg-white/8 transition-all text-sm sm:text-base"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 btn-subscribe py-1.5 px-4 text-sm"
            >
              Search
            </button>
          </div>
        </form>

        {/* Results header */}
        {query && !loading && (
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <p className="text-gray-400 text-sm">
              {totalResults > 0
                ? `Found ${totalResults.toLocaleString()} results for "${query}"`
                : `No results for "${query}"`}
            </p>
            {/* Filter tabs */}
            <div className="flex gap-2">
              {FILTER_TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setSearchParams({ q: query, filter: tab.key })}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    filter === tab.key
                      ? 'text-white'
                      : 'bg-white/5 text-gray-400 hover:text-white'
                  }`}
                  style={filter === tab.key ? { background: 'linear-gradient(135deg, #7c3aed, #2563eb)' } : {}}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && page === 1 && (
          <div className="mb-10">
            <CardSkeleton count={7} />
          </div>
        )}

        {/* Results grid */}
        {!query ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <AiOutlineSearch size={80} className="text-gray-700 mb-6" />
            <h2 className="text-2xl font-bold text-gray-500 mb-2">Search JioHotstar</h2>
            <p className="text-gray-600 text-sm max-w-sm">
              Find movies, TV shows, sports events and more
            </p>
          </div>
        ) : filtered.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <p className="text-5xl mb-6">🔍</p>
            <h2 className="text-xl font-bold text-gray-400 mb-2">No results found</h2>
            <p className="text-gray-500 text-sm">Try different keywords or check for typos</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3 mb-8">
              {filtered.map((item) => (
                <ContentCard key={`${item.id}-${item.media_type}`} item={item} variant="poster" />
              ))}
            </div>

            {/* Load more */}
            {page < totalPages && (
              <div className="flex justify-center mb-10">
                <button
                  onClick={handleLoadMore}
                  disabled={loading}
                  className="btn-subscribe px-8 py-3"
                >
                  {loading ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
