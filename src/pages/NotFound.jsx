import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <main className="min-h-screen bg-hotstar-bg flex items-center justify-center px-4">
      <div className="text-center max-w-md animate-fade-in">
        {/* Big 404 */}
        <div className="text-8xl sm:text-9xl font-black mb-4 gradient-text">404</div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3">Page Not Found</h1>
        <p className="text-gray-400 text-sm sm:text-base mb-8 leading-relaxed">
          Oops! The page you're looking for doesn't exist or may have been removed. Let's get you back to the movies.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/"
            className="btn-subscribe px-8 py-3 text-base"
          >
            Go Home
          </Link>
          <Link
            to="/movies"
            className="btn-info px-8 py-3 text-base"
          >
            Browse Movies
          </Link>
        </div>
      </div>
    </main>
  );
}
