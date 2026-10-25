import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { AiOutlineEye, AiOutlineEyeInvisible, AiOutlineMail, AiOutlineLock } from 'react-icons/ai';
import { FcGoogle } from 'react-icons/fc';
import Logo from '../components/ui/Logo';
import { useApp } from '../context/AppContext';
import { API_URL, apiError } from '../api/client';

const GOOGLE_ERRORS = {
  google_denied: 'Google sign-in was cancelled.',
  invalid_state: 'Sign-in expired. Please try again.',
  email_unverified: 'Your Google email is not verified.',
  google_failed: 'Google sign-in failed. Please try again.',
  session: 'Could not start your session. Please sign in again.',
};

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [params] = useSearchParams();
  const [error, setError] = useState(GOOGLE_ERRORS[params.get('error')] || '');
  const { user, login } = useApp();
  const navigate = useNavigate();
  const requested = useLocation().state?.from;
  const from = typeof requested === 'string' && /^\/(?![/\\])/.test(requested) ? requested : '/';

  useEffect(() => { if (user) navigate(from, { replace: true }); }, [user, navigate, from]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      navigate(from);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #0f1014 0%, #1a0533 50%, #0a1628 100%)',
      }}
    >
      {/* Bg blobs */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-blue-900/30 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full bg-blue-900/30 blur-3xl pointer-events-none" />

      {/* Card */}
      <div className="relative w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <Logo size={40} textClass="text-3xl" />
          </Link>
          <p className="text-gray-400 text-sm mt-3">Sign in to continue watching</p>
        </div>

        {/* Google sign-in (server-side OAuth redirect) */}
        <a
          href={`${API_URL}/auth/google`}
          className="flex items-center justify-center gap-2 py-2.5 mb-6 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-medium hover:bg-white/10 transition-colors"
        >
          <FcGoogle size={18} />
          Continue with Google
        </a>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-gray-500 text-xs">or continue with email</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div className="relative">
            <AiOutlineMail
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500"
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 outline-none focus:border-blue-500 transition-colors text-sm"
              autoComplete="email"
            />
          </div>

          {/* Password */}
          <div className="relative">
            <AiOutlineLock
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500"
            />
            <input
              type={showPass ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full pl-10 pr-10 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 outline-none focus:border-blue-500 transition-colors text-sm"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
            >
              {showPass ? <AiOutlineEyeInvisible size={18} /> : <AiOutlineEye size={18} />}
            </button>
          </div>

          {/* Error */}
          {error && (
            <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          {/* Forgot password */}
          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-all duration-200 disabled:opacity-60"
            style={{ background: 'linear-gradient(92.7deg, #1492ff 0%, #0860c4 50%, #eb0066 100%)' }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Signing in...
              </span>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Sign up link */}
        <p className="text-center text-gray-500 text-sm mt-6">
          Don't have an account?{' '}
          <Link to="/signup" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
