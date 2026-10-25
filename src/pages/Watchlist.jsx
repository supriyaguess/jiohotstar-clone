import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BsBookmark } from 'react-icons/bs';
import ContentCard from '../components/ui/ContentCard';
import { useApp } from '../context/AppContext';

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'movie', label: 'Movies' },
  { key: 'tv', label: 'TV Shows' },
];

export default function Watchlist() {
  const { watchlist } = useApp();
  const [tab, setTab] = useState('all');

  const count = (key) => (key === 'all' ? watchlist.length : watchlist.filter((w) => w.media_type === key).length);
  const items = tab === 'all' ? watchlist : watchlist.filter((w) => w.media_type === tab);

  return (
    <main className="min-h-screen bg-hotstar-bg px-4 sm:px-8 lg:px-12 pt-10 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-white">My List</h1>
          <p className="text-gray-400 text-sm mt-1">
            {watchlist.length ? `${watchlist.length} saved ${watchlist.length === 1 ? 'title' : 'titles'}, newest first` : 'Titles you save show up here.'}
          </p>
        </div>

        {watchlist.length > 0 && (
          <div className="flex gap-2" role="tablist">
            {TABS.map(({ key, label }) => (
              <button
                key={key}
                role="tab"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  tab === key ? 'text-white' : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                }`}
                style={tab === key ? { background: 'linear-gradient(92.7deg, #1492ff 0%, #0860c4 50%, #eb0066 100%)' } : {}}
              >
                {label} <span className="opacity-70">{count(key)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center text-center py-24 animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-blue-300 mb-5">
            <BsBookmark size={28} />
          </div>
          <h2 className="text-white font-bold text-lg mb-1">
            {watchlist.length ? `No ${tab === 'movie' ? 'movies' : 'TV shows'} saved yet` : 'Your list is empty'}
          </h2>
          <p className="text-gray-500 text-sm mb-6 max-w-sm">
            Tap the bookmark on any title and it will be here, on every device you sign in on.
          </p>
          <Link to="/" className="btn-subscribe px-8 py-3 text-base">Browse titles</Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3">
          {items.map((item) => (
            <ContentCard key={`${item.media_type}-${item.id}`} item={item} variant="poster" />
          ))}
        </div>
      )}
    </main>
  );
}
