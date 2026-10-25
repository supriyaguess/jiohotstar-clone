import { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { IoHomeOutline, IoHome, IoSearchOutline, IoSearch } from 'react-icons/io5';
import { MdOutlineTv, MdTv, MdDirectionsRun } from 'react-icons/md';
import { GiPopcorn } from 'react-icons/gi';
import { BsBookmark, BsBookmarkFill } from 'react-icons/bs';
import { FaRegUserCircle, FaUserCircle } from 'react-icons/fa';
import { useApp } from '../../context/AppContext';
import { LogoMark } from '../ui/Logo';

const NAV = [
  { label: 'Home',    path: '/',          Icon: IoHomeOutline,   ActiveIcon: IoHome,        end: true },
  { label: 'Search',  path: '/search',    Icon: IoSearchOutline, ActiveIcon: IoSearch },
  { label: 'TV',      path: '/tv-shows',  Icon: MdOutlineTv,     ActiveIcon: MdTv },
  { label: 'Movies',  path: '/movies',    Icon: GiPopcorn,       ActiveIcon: GiPopcorn },
  { label: 'Sports',  path: '/sports',    Icon: MdDirectionsRun, ActiveIcon: MdDirectionsRun },
  { label: 'My List', path: '/watchlist', Icon: BsBookmark,      ActiveIcon: BsBookmarkFill, authOnly: true },
];

export default function Sidebar() {
  const [expanded, setExpanded] = useState(false);
  const { user } = useApp();

  // "My Space" is the account hub: profile when signed in, login otherwise.
  const items = [
    ...NAV.filter((n) => !n.authOnly || user),
    {
      label: user ? 'My Space' : 'Login',
      path: user ? '/profile' : '/login',
      Icon: FaRegUserCircle,
      ActiveIcon: FaUserCircle,
    },
  ];

  return (
    <>
      {/* ── Desktop rail: 96px, transparent over the page; hovering reveals labels on a dark scrim ── */}
      <aside
        className="hidden md:flex fixed inset-y-0 left-0 z-40 items-center transition-[width] duration-300 ease-out"
        style={{ width: expanded ? 400 : 96 }}
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
      >
        <div
          aria-hidden="true"
          className={`absolute inset-0 pointer-events-none transition-opacity duration-300 ${expanded ? 'opacity-100' : 'opacity-0'}`}
          style={{ background: 'linear-gradient(90deg, rgba(8,9,12,0.99) 0%, rgba(8,9,12,0.96) 60%, rgba(8,9,12,0.7) 85%, rgba(8,9,12,0) 100%)' }}
        />

        <Link to="/" className="absolute top-8 left-0 w-24 flex justify-center" aria-label="JioHotstar home">
          <LogoMark size={38} />
        </Link>

        <nav className="relative flex flex-col gap-1 w-full" aria-label="Main">
          {items.map(({ label, path, Icon, ActiveIcon, end }) => (
            <NavLink
              key={label}
              to={path}
              end={end}
              className={({ isActive }) =>
                `group flex items-center h-[52px] pl-[28px] gap-5 transition-colors ${
                  isActive ? 'text-white' : 'text-[#a8aeba] hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                      isActive ? 'bg-white/10' : 'group-hover:bg-white/5'
                    }`}
                  >
                    {label === 'My Space' && user?.avatar ? (
                      <img src={user.avatar} alt="" referrerPolicy="no-referrer" className="w-6 h-6 rounded-full object-cover" />
                    ) : isActive ? <ActiveIcon size={24} /> : <Icon size={24} />}
                  </span>
                  <span
                    className={`text-base font-semibold whitespace-nowrap transition-all duration-200 ${
                      expanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 pointer-events-none'
                    }`}
                  >
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* ── Mobile / tablet bottom bar ── */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#0f1014]/95 backdrop-blur-md border-t border-white/10 flex items-center justify-around px-1 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
        aria-label="Main"
      >
        {items.map(({ label, path, Icon, ActiveIcon, end }) => (
          <NavLink
            key={label}
            to={path}
            end={end}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 min-w-[52px] px-1 py-1 rounded-lg transition-colors ${
                isActive ? 'text-white' : 'text-[#8b91a0]'
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
      </nav>
    </>
  );
}
