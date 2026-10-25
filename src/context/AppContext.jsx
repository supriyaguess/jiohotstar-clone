import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, refreshSession, setAccessToken } from '../api/client';

const AppContext = createContext(null);
const SESSION_HINT = 'hs_session'; // set while a refresh cookie probably exists; not a credential
const sameItem = (a, id, type) => a.id === id && a.media_type === type;

export function AppProvider({ children }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [savedWatchlist, setWatchlist] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [authPromptOpen, setAuthPromptOpen] = useState(false);

  // Restore the session from the refresh cookie on first load.
  useEffect(() => {
    localStorage.removeItem('hs_user'); // legacy mock-auth key
    if (!localStorage.getItem(SESSION_HINT)) { setAuthLoading(false); return; }
    refreshSession()
      .then(setUser)
      .catch(() => localStorage.removeItem(SESSION_HINT))
      .finally(() => setAuthLoading(false));
  }, []);

  const watchlist = user ? savedWatchlist : []; // never show a previous user's list

  // Load the watchlist whenever the signed-in user changes.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      // One-time import of the pre-backend localStorage watchlist.
      try {
        const legacy = JSON.parse(localStorage.getItem('hs_watchlist') || '[]');
        if (legacy.length) await api.post('/watchlist/bulk', legacy);
        localStorage.removeItem('hs_watchlist');
      } catch { /* keep legacy copy; retry next login */ }
      try {
        const { data } = await api.get('/watchlist');
        if (!cancelled) setWatchlist(data);
      } catch { /* leave empty */ }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    setAccessToken(data.accessToken);
    localStorage.setItem(SESSION_HINT, '1');
    setUser(data.user);
  }, []);

  const signup = useCallback(async (name, email, password) => {
    const { data } = await api.post('/auth/signup', { name, email, password });
    setAccessToken(data.accessToken);
    localStorage.setItem(SESSION_HINT, '1');
    setUser(data.user);
  }, []);

  // Used after the Google redirect: the refresh cookie is already set.
  const restoreSession = useCallback(async () => {
    const u = await refreshSession();
    localStorage.setItem(SESSION_HINT, '1');
    setUser(u);
  }, []);

  const updateName = useCallback(async (name) => {
    const { data } = await api.patch('/me', { name });
    setUser(data);
  }, []);

  const deleteAccount = useCallback(async (password) => {
    await api.delete('/me', { data: { password } }); // password accounts must re-authenticate
    localStorage.removeItem(SESSION_HINT);
    setAccessToken(null);
    setUser(null);
  }, []);

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout'); } catch { /* cookie cleared best-effort */ }
    localStorage.removeItem(SESSION_HINT);
    setAccessToken(null);
    setUser(null);
  }, []);

  // Runs `action` for signed-in users; guests get the "sign up to watch" prompt instead.
  const requireAuth = useCallback((action) => {
    if (user) action();
    else setAuthPromptOpen(true);
  }, [user]);
  const closeAuthPrompt = useCallback(() => setAuthPromptOpen(false), []);

  const toggleWatchlist = useCallback((item) => {
    if (!user) { navigate('/login'); return; }
    const exists = watchlist.some((w) => sameItem(w, item.id, item.media_type));
    setWatchlist((prev) => exists
      ? prev.filter((w) => !sameItem(w, item.id, item.media_type))
      : [item, ...prev]);
    const request = exists
      ? api.delete(`/watchlist/${item.media_type}/${item.id}`)
      : api.post('/watchlist', item);
    request.catch(() => {
      // Roll back the optimistic update.
      setWatchlist((prev) => exists
        ? [item, ...prev]
        : prev.filter((w) => !sameItem(w, item.id, item.media_type)));
    });
  }, [user, watchlist, navigate]);

  const isInWatchlist = useCallback(
    (id, mediaType) => watchlist.some((w) => sameItem(w, id, mediaType)),
    [watchlist]
  );

  return (
    <AppContext.Provider
      value={{
        user, authLoading, login, signup, logout, restoreSession, updateName, deleteAccount,
        authPromptOpen, requireAuth, closeAuthPrompt,
        searchQuery, setSearchQuery, isSearchOpen, setIsSearchOpen,
        watchlist, toggleWatchlist, isInWatchlist,
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
