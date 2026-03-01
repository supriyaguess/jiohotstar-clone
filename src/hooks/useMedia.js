import { useState, useEffect, useRef } from 'react';

/**
 * Generic data-fetching hook for TMDB API calls.
 * @param {Function} fetchFn - async function returning axios response
 * @param {Array} deps - dependency array to refetch
 */
export function useMedia(fetchFn, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  useEffect(() => {
    if (!fetchFn) return;

    // Cancel previous request
    if (abortRef.current) {
      abortRef.current.abort();
    }

    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    fetchFn()
      .then((res) => {
        if (!controller.signal.aborted) {
          setData(res.data);
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setError(err?.response?.data?.status_message || err.message || 'Failed to fetch data');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error };
}

/**
 * Hook to fetch multiple TMDB endpoints in parallel.
 * @param {Array<{key: string, fetchFn: Function}>} requests
 */
export function useMultiMedia(requests) {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!requests?.length) return;

    setLoading(true);
    setError(null);

    Promise.allSettled(requests.map((r) => r.fetchFn()))
      .then((results) => {
        const newData = {};
        results.forEach((result, i) => {
          if (result.status === 'fulfilled') {
            newData[requests[i].key] = result.value.data;
          }
        });
        setData(newData);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { data, loading, error };
}
