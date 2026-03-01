import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('hs_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [watchlist, setWatchlist] = useState(() => {
    try {
      const stored = localStorage.getItem('hs_watchlist');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Persist user to localStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem('hs_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('hs_user');
    }
  }, [user]);

  // Persist watchlist to localStorage
  useEffect(() => {
    localStorage.setItem('hs_watchlist', JSON.stringify(watchlist));
  }, [watchlist]);

  const login = useCallback((userData) => {
    setUser({ ...userData, avatar: userData.avatar || null });
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setWatchlist([]);
  }, []);

  const toggleWatchlist = useCallback((item) => {
    setWatchlist((prev) => {
      const exists = prev.find((w) => w.id === item.id && w.media_type === item.media_type);
      if (exists) return prev.filter((w) => !(w.id === item.id && w.media_type === item.media_type));
      return [...prev, item];
    });
  }, []);

  const isInWatchlist = useCallback(
    (id, mediaType) => watchlist.some((w) => w.id === id && w.media_type === mediaType),
    [watchlist]
  );

  return (
    <AppContext.Provider
      value={{
        user,
        login,
        logout,
        searchQuery,
        setSearchQuery,
        isSearchOpen,
        setIsSearchOpen,
        watchlist,
        toggleWatchlist,
        isInWatchlist,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
