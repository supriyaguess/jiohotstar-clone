import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FcGoogle } from 'react-icons/fc';
import { AiOutlineMail } from 'react-icons/ai';
import { BsCheckLg, BsPencil, BsGear, BsPlayFill, BsShieldCheck } from 'react-icons/bs';
import { useApp } from '../context/AppContext';
import { api, apiError } from '../api/client';
import { getBackdropUrl } from '../utils/helpers';
import ContentRow from '../components/ui/ContentRow';

// Starfield + night-sky gradient behind the header (CSS only, no image).
const STARS = [
  [8, 22], [17, 62], [26, 14], [34, 48], [43, 28], [52, 70], [61, 18], [69, 54], [78, 30], [86, 66], [93, 20], [12, 80], [47, 84], [74, 82],
].map(([x, y], i) => `radial-gradient(${i % 3 ? 1.2 : 1.8}px ${i % 3 ? 1.2 : 1.8}px at ${x}% ${y}%, rgba(255,255,255,${i % 2 ? 0.55 : 0.85}) 50%, transparent 51%)`);
const HEADER_BG = `${STARS.join(', ')}, linear-gradient(180deg, #05061a 0%, #140a33 55%, #3a0f33 100%)`;

const formatLeft = (item) => {
  const { progress_seconds: done = 0, duration_seconds: total } = item;
  const mins = (s) => Math.max(1, Math.round(s / 60));
  const fmt = (m) => (m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`);
  return total ? `${fmt(mins(Math.max(0, total - done)))} left` : `${fmt(mins(done))} watched`;
};

function Avatar({ user, className }) {
  return user.avatar ? (
    <img src={user.avatar} alt="" referrerPolicy="no-referrer" className={`${className} object-cover`} />
  ) : (
    <div className={`${className} flex items-center justify-center font-black text-white`}
      style={{ background: 'linear-gradient(135deg, #1492ff, #0860c4 55%, #7a1fa2)' }}>
      {user.name?.[0]?.toUpperCase()}
    </div>
  );
}

function ContinueCard({ item }) {
  const pct = item.duration_seconds ? Math.min(100, (item.progress_seconds / item.duration_seconds) * 100) : 8;
  return (
    <Link to={`/detail/${item.media_type}/${item.id}`} className="group block">
      <div className="relative aspect-video rounded-lg overflow-hidden bg-white/5">
        <img src={getBackdropUrl(item.backdrop_path || item.poster_path, 'sm')} alt="" loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent" />
        <BsPlayFill size={26} className="absolute bottom-3 left-3 text-white drop-shadow" />
        <div className="absolute bottom-0 inset-x-0 h-1 bg-white/25">
          <div className="h-full bg-[#1492ff]" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <p className="text-white text-base font-medium mt-3 truncate">{item.title}</p>
      <p className="text-[#a8aeba] text-sm">{formatLeft(item)}</p>
    </Link>
  );
}

export default function Profile() {
  const { user, updateName, logout, deleteAccount, watchlist } = useApp();
  const navigate = useNavigate();
  const settingsRef = useRef(null);
  const [history, setHistory] = useState([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [name, setName] = useState(user.name);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [password, setPassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    api.get('/history').then((res) => setHistory(res.data)).catch(() => {});
  }, []);

  const openSettings = () => {
    setSettingsOpen(true);
    setTimeout(() => settingsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const dirty = name.trim() && name.trim() !== user.name;
  const first = user.name?.split(' ')[0];
  const since = user.createdAt && new Date(user.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  const save = async (e) => {
    e.preventDefault();
    if (!dirty) return;
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      await updateName(name.trim());
      setMessage({ type: 'ok', text: 'Name updated.' });
    } catch (err) {
      setMessage({ type: 'err', text: apiError(err) });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (e) => {
    e.preventDefault();
    setDeleting(true);
    setDeleteError('');
    try {
      await deleteAccount(user.hasPassword ? password : undefined);
      navigate('/');
    } catch (err) {
      setDeleteError(apiError(err));
      setDeleting(false);
    }
  };

  const canDelete = confirmText === 'DELETE' && (!user.hasPassword || password.length > 0);
  const inputClass = 'w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-blue-400 transition-colors text-sm';
  const padX = 'px-4 sm:px-8 lg:px-12';

  return (
    <main className="min-h-screen bg-hotstar-bg pb-20">
      {/* Header */}
      <header className="md:-ml-24 md:w-[calc(100%+6rem)] border-b border-white/10" style={{ background: HEADER_BG }}>
        <div className={`${padX} md:pl-[calc(6rem+2rem)] lg:pl-[calc(6rem+3rem)] pt-10 pb-8 flex flex-col md:flex-row md:items-start md:justify-between gap-6`}>
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-semibold text-[#f5c451] truncate">{user.name}</h1>
            <p className="text-white text-lg sm:text-xl mt-2 truncate">{user.email}</p>
            {since && <p className="text-[#a8aeba] text-sm mt-1">Member since {since}</p>}
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <Link to="/watchlist" className="btn-watch !w-[170px] sm:!w-[270px] !h-14 text-lg">My List</Link>
            <button onClick={openSettings}
              className="inline-flex items-center gap-2 h-14 px-5 sm:px-8 rounded-lg bg-white/10 hover:bg-white/15 text-white text-lg font-medium transition-colors">
              <BsGear size={20} /> <span className="hidden sm:inline">Settings</span>
            </button>
          </div>
        </div>
      </header>

      <div className={padX}>
        {/* Profiles */}
        <section className="pt-10 pb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-white">Profile</h2>
            <button onClick={openSettings} className="inline-flex items-center gap-2 text-white text-lg hover:text-[#a8aeba] transition-colors">
              <BsPencil size={18} /> Edit
            </button>
          </div>
          <div className="flex flex-col items-start">
            <div className="relative">
              <Avatar user={user} className="w-28 h-28 sm:w-32 sm:h-32 rounded-full text-5xl" />
              <span className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-[#dfe3ec] text-[#0f1014] flex items-center justify-center border-4 border-[#0f1014]">
                <BsCheckLg size={16} />
              </span>
            </div>
            <p className="text-white text-lg mt-4">{user.name}</p>
          </div>
        </section>

        {/* Continue watching */}
        {history.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-white mb-5">Continue Watching for {first}</h2>
            <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {history.slice(0, 8).map((item) => <ContinueCard key={`${item.media_type}-${item.id}`} item={item} />)}
            </div>
          </section>
        )}
      </div>

      <ContentRow title="My List" items={watchlist} seeAllLink="/watchlist" />

      {/* Settings panel */}
      <div className={padX}>
        {settingsOpen && (
          <section ref={settingsRef} className="max-w-2xl scroll-mt-8 animate-fade-in">
            <h2 className="text-2xl font-semibold text-white mb-5">Account settings</h2>

            <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-5 sm:p-6 mb-5">
              <div className="flex items-center gap-3 mb-5 text-sm text-[#c9ceda]">
                {user.hasPassword ? <AiOutlineMail size={20} /> : <FcGoogle size={20} />}
                Signed in with {user.hasPassword ? 'email and password' : 'Google'}
              </div>
              <form onSubmit={save}>
                <label className="block text-[#a8aeba] text-xs mb-2" htmlFor="name">Display name</label>
                <div className="flex gap-3">
                  <input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} className={inputClass} />
                  <button type="submit" disabled={saving || !dirty}
                    className="px-6 rounded-xl text-white font-semibold text-sm disabled:opacity-40 flex-shrink-0 btn-watch !w-auto !h-auto">
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
                {message.text && <p className={`text-xs mt-2 ${message.type === 'ok' ? 'text-green-400' : 'text-red-400'}`}>{message.text}</p>}
              </form>
              <div className="flex items-start gap-3 mt-5 pt-5 border-t border-white/10 text-xs text-[#a8aeba]">
                <BsShieldCheck className="text-green-400 mt-0.5 flex-shrink-0" size={15} />
                <p>
                  {user.hasPassword
                    ? 'Your password is stored as a salted hash; we never see or log it.'
                    : 'You sign in with Google, so there is no password to manage on this site.'}
                  {' '}Sessions use a short-lived token plus a secure refresh cookie.
                </p>
              </div>
            </div>

            <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-5 sm:p-6">
              <button onClick={async () => { await logout(); navigate('/'); }}
                className="px-6 py-3 rounded-xl bg-white/10 text-white text-sm font-semibold hover:bg-white/20 transition-colors">
                Log out
              </button>

              <div className="mt-6 pt-6 border-t border-red-500/20">
                <h3 className="text-sm font-bold text-red-400 mb-1">Delete account</h3>
                <p className="text-[#a8aeba] text-xs mb-4">Permanently removes your account, My List and watch history. This cannot be undone.</p>
                {!confirmOpen ? (
                  <button onClick={() => setConfirmOpen(true)}
                    className="px-6 py-3 rounded-xl border border-red-500/40 text-red-400 text-sm font-semibold hover:bg-red-500/10 transition-colors">
                    Delete my account
                  </button>
                ) : (
                  <form onSubmit={handleDelete} className="space-y-3 max-w-sm">
                    {user.hasPassword && (
                      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                        placeholder="Confirm your password" autoComplete="current-password" className={inputClass} />
                    )}
                    <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="Type DELETE to confirm" className={inputClass} />
                    {deleteError && <p className="text-red-400 text-xs">{deleteError}</p>}
                    <div className="flex gap-3">
                      <button type="submit" disabled={!canDelete || deleting}
                        className="px-6 py-3 rounded-xl bg-red-600 text-white text-sm font-semibold disabled:opacity-40">
                        {deleting ? 'Deleting...' : 'Permanently delete'}
                      </button>
                      <button type="button"
                        onClick={() => { setConfirmOpen(false); setConfirmText(''); setPassword(''); setDeleteError(''); }}
                        className="px-6 py-3 rounded-xl bg-white/10 text-white text-sm font-semibold hover:bg-white/20">
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
