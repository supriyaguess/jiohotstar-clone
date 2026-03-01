import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Sidebar from './components/layout/Sidebar';
import Footer from './components/layout/Footer';
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

function AppShell() {
  return (
    <div className="min-h-screen bg-hotstar-bg">
      {/* Left Sidebar — full height, no top navbar */}
      <Sidebar />

      {/* Main content — offset by sidebar width, mobile adds bottom-nav padding */}
      <div className="md:ml-16 pb-16 md:pb-0 flex flex-col min-h-screen">
        <main className="flex-1">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/"              element={<Home />}    />
              <Route path="/movies"        element={<Movies />}  />
              <Route path="/tv-shows"      element={<TVShows />} />
              <Route path="/sports"        element={<Sports />}  />
              <Route path="/detail/:type/:id" element={<Detail />} />
              <Route path="/search"        element={<Search />}  />
              <Route path="*"              element={<NotFound />} />
            </Routes>
          </Suspense>
        </main>
        <Footer />
      </div>
    </div>
  );
}

function AuthShell() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login"  element={<Login />}  />
        <Route path="/signup" element={<Signup />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Routes>
          <Route path="/login"  element={<Login />}  />
          <Route path="/signup" element={<Signup />} />
          <Route path="/*"      element={<AppShell />} />
        </Routes>
      </AppProvider>
    </BrowserRouter>
  );
}
