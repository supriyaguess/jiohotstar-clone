import { useEffect, useState } from 'react';
import HeroBanner from '../components/ui/HeroBanner';
import ContentRow from '../components/ui/ContentRow';
import {
  getTrending,
  getPopularMovies,
  getTopRatedMovies,
  getPopularTV,
  getTopRatedTV,
  getOnAirTV,
  getUpcomingMovies,
} from '../api/tmdb';

export default function Home() {
  const [trending, setTrending] = useState([]);
  const [popularMovies, setPopularMovies] = useState([]);
  const [topRatedMovies, setTopRatedMovies] = useState([]);
  const [popularTV, setPopularTV] = useState([]);
  const [topRatedTV, setTopRatedTV] = useState([]);
  const [onAirTV, setOnAirTV] = useState([]);
  const [upcomingMovies, setUpcomingMovies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [
          trendingRes,
          popularMoviesRes,
          topRatedMoviesRes,
          popularTVRes,
          topRatedTVRes,
          onAirTVRes,
          upcomingMoviesRes,
        ] = await Promise.allSettled([
          getTrending('all', 'week'),
          getPopularMovies(),
          getTopRatedMovies(),
          getPopularTV(),
          getTopRatedTV(),
          getOnAirTV(),
          getUpcomingMovies(),
        ]);

        if (trendingRes.status === 'fulfilled') setTrending(trendingRes.value.data.results);
        if (popularMoviesRes.status === 'fulfilled') setPopularMovies(popularMoviesRes.value.data.results);
        if (topRatedMoviesRes.status === 'fulfilled') setTopRatedMovies(topRatedMoviesRes.value.data.results);
        if (popularTVRes.status === 'fulfilled') setPopularTV(popularTVRes.value.data.results);
        if (topRatedTVRes.status === 'fulfilled') setTopRatedTV(topRatedTVRes.value.data.results);
        if (onAirTVRes.status === 'fulfilled') setOnAirTV(onAirTVRes.value.data.results);
        if (upcomingMoviesRes.status === 'fulfilled') setUpcomingMovies(upcomingMoviesRes.value.data.results);
      } catch (err) {
        console.error('Home fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  return (
    <main className="min-h-screen bg-hotstar-bg">
      {/* Hero Banner */}
      <HeroBanner items={trending} loading={loading} />

      {/* Content rows */}
      <div className="pt-6">
        <ContentRow
          title="Trending This Week"
          items={trending}
          seeAllLink="/movies"
          loading={loading}
        />
        <ContentRow
          title="Popular Movies"
          items={popularMovies}
          seeAllLink="/movies?tab=popular"
          loading={loading}
        />
        <ContentRow
          title="Popular TV Shows"
          items={popularTV}
          seeAllLink="/tv-shows?tab=popular"
          loading={loading}
        />
        <ContentRow
          title="Top Rated Movies"
          items={topRatedMovies}
          seeAllLink="/movies?tab=top_rated"
          loading={loading}
        />
        <ContentRow
          title="Award Winning Shows"
          items={topRatedTV}
          seeAllLink="/tv-shows?tab=top_rated"
          loading={loading}
        />
        <ContentRow
          title="Currently On Air"
          items={onAirTV}
          seeAllLink="/tv-shows?tab=on_air"
          loading={loading}
        />
        <ContentRow
          title="Upcoming Movies"
          items={upcomingMovies}
          seeAllLink="/movies?tab=upcoming"
          loading={loading}
        />
      </div>

      {/* Subscribe Banner */}
      {!loading && (
        <div className="mx-4 sm:mx-8 lg:mx-12 mb-16 rounded-2xl overflow-hidden relative">
          <div
            className="p-8 sm:p-12 text-center"
            style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e3a8a 100%)' }}
          >
            <p className="text-purple-300 text-sm font-semibold mb-2 uppercase tracking-widest">
              Limited Time Offer
            </p>
            <h2 className="text-2xl sm:text-4xl font-black text-white mb-3">
              Unlimited Entertainment
            </h2>
            <p className="text-gray-300 text-sm sm:text-base mb-6 max-w-xl mx-auto">
              Watch movies, shows, live sports and more. No ads. Cancel anytime.
            </p>
            <a
              href="/signup"
              className="inline-block btn-subscribe px-8 py-3 text-base font-bold"
            >
              Start Free Trial →
            </a>
          </div>
        </div>
      )}
    </main>
  );
}
