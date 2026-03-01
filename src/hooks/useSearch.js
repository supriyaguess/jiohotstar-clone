import { useState, useEffect, useCallback } from 'react';
import { searchMulti } from '../api/tmdb';

/**
 * Debounced search hook for TMDB multi-search.
 * @param {string} query - search query string
 * @param {number} delay - debounce delay in ms (default 400ms)
 */
export function useSearch(query, delay = 400) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [totalResults, setTotalResults] = useState(0);

  useEffect(() => {
    if (!query?.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await searchMulti(query);
        const filtered = res.data.results.filter(
          (item) => item.media_type !== 'person' && (item.poster_path || item.backdrop_path)
        );
        setResults(filtered);
        setTotalPages(res.data.total_pages);
        setTotalResults(res.data.total_results);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [query, delay]);

  const clearResults = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);

  return { results, loading, error, totalPages, totalResults, clearResults };
}
