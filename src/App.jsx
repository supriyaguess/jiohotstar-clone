import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import Sidebar from './components/layout/Sidebar';
import Footer from './components/layout/Footer';
import ChatWidget from './components/chat/ChatWidget';
import GuestChatButton from './components/chat/GuestChatButton';
import AuthPrompt from './components/ui/AuthPrompt';
import { PageLoader } from './components/ui/LoadingSpinner';

const Home     = lazy(() => import('./pages/Home'));
const Movies   = lazy(() => import('./pages/Movies'));
const TVShows  = lazy(() => import('./pages/TVShows'));
const Sports   = lazy(() => import('./pages/Sports'));
const Detail   = lazy(() => import('./pages/Detail'));
const Search   = lazy(() => import('./pages/Search'));
const Login    = lazy(() => import('./pages/Login'));
const Signup   = lazy(() => import('./pages/Signup'));
const NotFound = lazy(() => import('./pages/NotFound'));
const Watchlist = lazy(() => import('./pages/Watchlist'));
const Profile   = lazy(() => import('./pages/Profile'));
const AuthCallback = lazy(() => import('./pages/AuthCallback'));

// New page => start at the top. Only the path matters, so tab/filter changes (?tab=) don't jump.
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

// Waits for the session restore, then sends guests to /login.
function RequireAuth({ children }) {
  const { user, authLoading } = useApp();
  if (authLoading) return <PageLoader />;
  return user ? children : <Navigate to="/login" replace />;
}

function AppShell() {
  const { user } = useApp();
  return (
    <div className="min-h-screen bg-hotstar-bg">
      {/* Left Sidebar — full height, no top navbar */}
      <Sidebar />

      {/* Main content — offset by sidebar width, mobile adds bottom-nav padding */}
      <div className="md:ml-24 pb-16 md:pb-0 flex flex-col min-h-screen">
        <main className="flex-1">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/"              element={<Home />}    />
              <Route path="/movies"        element={<Movies />}  />
              <Route path="/tv-shows"      element={<TVShows />} />
              <Route path="/sports"        element={<Sports />}  />
              <Route path="/detail/:type/:id" element={<Detail />} />
              <Route path="/search"        element={<Search />}  />
              <Route path="/watchlist"     element={<RequireAuth><Watchlist /></RequireAuth>} />
              <Route path="/profile"       element={<RequireAuth><Profile /></RequireAuth>} />
              <Route path="*"              element={<NotFound />} />
            </Routes>
          </Suspense>
        </main>
        <Footer />
      </div>

      {/* Signed-in users only; keyed so a new session never sees the previous chat */}
      {user ? <ChatWidget key={user.id ?? user.email} /> : <GuestChatButton />}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <AppProvider>
        <Routes>
          <Route path="/login"  element={<Login />}  />
          <Route path="/signup" element={<Signup />} />
          <Route path="/auth/callback" element={<Suspense fallback={<PageLoader />}><AuthCallback /></Suspense>} />
          <Route path="/*"      element={<AppShell />} />
        </Routes>
        <AuthPrompt />
      </AppProvider>
    </BrowserRouter>
  );
}
