import { NavLink, useNavigate, Link } from 'react-router-dom';
import { useState } from 'react';
import { IoHomeOutline, IoHome } from 'react-icons/io5';
import { BsCameraVideo, BsCameraVideoFill } from 'react-icons/bs';
import { MdTv, MdOutlineTv } from 'react-icons/md';
import { AiOutlineSearch, AiOutlineSetting, AiOutlineUser } from 'react-icons/ai';
import { useApp } from '../../context/AppContext';

const NAV = [
  { label: 'Home',     path: '/',         Icon: IoHomeOutline,  ActiveIcon: IoHome,            end: true },
  { label: 'Movies',   path: '/movies',   Icon: BsCameraVideo,  ActiveIcon: BsCameraVideoFill          },
  { label: 'TV Shows', path: '/tv-shows', Icon: MdOutlineTv,    ActiveIcon: MdTv                       },
];

export default function Sidebar() {
  const [expanded, setExpanded] = useState(false);
  const { user, logout } = useApp();
  const navigate = useNavigate();

  return (
    <>
      {/* ── Desktop sidebar ───────────────────────────────── */}
      <aside
        className={`
          hidden md:flex flex-col
          fixed left-0 top-0 bottom-0 z-40
          bg-black border-r border-white/[0.06]
          transition-all duration-300 ease-in-out overflow-hidden
          ${expanded ? 'w-52' : 'w-16'}
        `}
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
      >
        {/* Logo */}
        <Link
          to="/"
          className="flex items-center gap-3 px-4 h-16 border-b border-white/[0.06] flex-shrink-0 overflow-hidden"
        >
          <span className="text-2xl font-black flex-shrink-0 gradient-text">J</span>
          <span
            className={`text-lg font-black tracking-tight whitespace-nowrap transition-all duration-200 ${
              expanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'
            }`}
          >
            <span className="text-blue-400">jio</span>
            <span className="text-white">|</span>
            <span className="gradient-text">hotstar</span>
          </span>
        </Link>

        {/* Nav items */}
        <nav className="flex-1 py-3 flex flex-col gap-0.5 overflow-hidden">
          {NAV.map(({ label, path, Icon, ActiveIcon, end }) => (
            <NavLink
              key={label}
              to={path}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3.5 px-4 py-3.5 mx-2 rounded-xl transition-all duration-200 relative
                ${isActive
                  ? 'bg-white/10 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r-full bg-purple-500" />
                  )}
                  {isActive
                    ? <ActiveIcon size={22} className="flex-shrink-0" />
                    : <Icon size={22} className="flex-shrink-0" />}
                  <span
                    className={`text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                      expanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'
                    }`}
                  >
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Divider */}
        <div className="mx-4 h-px bg-white/[0.06] flex-shrink-0" />

        {/* Bottom actions */}
        <div className="py-3 flex flex-col gap-0.5 flex-shrink-0">
          {/* Search */}
          <button
            onClick={() => navigate('/search')}
            className="flex items-center gap-3.5 px-4 py-3.5 mx-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all duration-200"
          >
            <AiOutlineSearch size={22} className="flex-shrink-0" />
            <span className={`text-sm font-medium whitespace-nowrap transition-all duration-200 ${expanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'}`}>
              Search
            </span>
          </button>

          {/* Settings */}
          <button className="flex items-center gap-3.5 px-4 py-3.5 mx-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all duration-200">
            <AiOutlineSetting size={22} className="flex-shrink-0" />
            <span className={`text-sm font-medium whitespace-nowrap transition-all duration-200 ${expanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'}`}>
              Settings
            </span>
          </button>

          {/* Profile / Login */}
          <button
            onClick={() => navigate(user ? '/login' : '/login')}
            className="flex items-center gap-3.5 px-4 py-3.5 mx-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all duration-200"
          >
            {user ? (
              <div
                className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #2563eb)' }}
              >
                {user.name?.[0]?.toUpperCase()}
              </div>
            ) : (
              <AiOutlineUser size={22} className="flex-shrink-0" />
            )}
            <span className={`text-sm font-medium whitespace-nowrap transition-all duration-200 ${expanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'}`}>
              {user ? user.name?.split(' ')[0] : 'Login'}
            </span>
          </button>

          {/* Subscribe CTA — only visible when expanded */}
          <div
            className={`mx-2 mt-1 transition-all duration-200 overflow-hidden ${
              expanded ? 'opacity-100 max-h-16' : 'opacity-0 max-h-0'
            }`}
          >
            <Link
              to="/signup"
              className="block text-center py-2.5 rounded-xl text-white text-sm font-semibold"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #2563eb)' }}
            >
              Subscribe
            </Link>
          </div>
        </div>
      </aside>

      {/* ── Mobile bottom nav bar ──────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-black/95 backdrop-blur-md border-t border-white/10 flex items-center justify-around px-2 py-2">
        {NAV.map(({ label, path, Icon, ActiveIcon, end }) => (
          <NavLink
            key={label}
            to={path}
            end={end}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-4 py-1 rounded-lg transition-colors ${
                isActive ? 'text-white' : 'text-gray-500 hover:text-gray-300'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive ? <ActiveIcon size={22} /> : <Icon size={22} />}
                <span className="text-[10px] font-medium">{label}</span>
              </>
            )}
          </NavLink>
        ))}
        <button
          onClick={() => navigate('/search')}
          className="flex flex-col items-center gap-1 px-4 py-1 rounded-lg text-gray-500 hover:text-gray-300 transition-colors"
        >
          <AiOutlineSearch size={22} />
          <span className="text-[10px] font-medium">Search</span>
        </button>
      </nav>
    </>
  );
}
