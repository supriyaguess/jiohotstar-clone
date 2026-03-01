import { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { AiOutlineSearch, AiOutlineClose, AiOutlineUser } from 'react-icons/ai';
import { IoChevronDownOutline } from 'react-icons/io5';
import { BsBell } from 'react-icons/bs';
import { HiMenu, HiX } from 'react-icons/hi';
import { useApp } from '../../context/AppContext';
import { NAV_ITEMS } from '../../constants';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const searchRef = useRef(null);
  const dropdownTimer = useRef(null);
  const navigate = useNavigate();
  const { user, logout } = useApp();

  // Transparent → solid on scroll
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Focus search input when opened
  useEffect(() => {
    if (searchOpen && searchRef.current) {
      searchRef.current.focus();
    }
  }, [searchOpen]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchInput.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchInput.trim())}`);
      setSearchOpen(false);
      setSearchInput('');
    }
  };

  const openDropdown = (label) => {
    clearTimeout(dropdownTimer.current);
    setActiveDropdown(label);
  };

  const closeDropdown = () => {
    dropdownTimer.current = setTimeout(() => setActiveDropdown(null), 150);
  };

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-black/95 backdrop-blur-md shadow-lg shadow-black/50'
            : 'bg-gradient-to-b from-black/80 to-transparent'
        }`}
      >
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-1 flex-shrink-0">
              <span className="text-2xl font-black tracking-tight">
                <span className="text-blue-400">jio</span>
                <span className="text-white">|</span>
                <span className="gradient-text">hotstar</span>
              </span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-1">
              {NAV_ITEMS.map((item) => (
                <div
                  key={item.label}
                  className="relative"
                  onMouseEnter={() => item.children && openDropdown(item.label)}
                  onMouseLeave={closeDropdown}
                >
                  <NavLink
                    to={item.path}
                    end={item.path === '/'}
                    className={({ isActive }) =>
                      `flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                        isActive ? 'text-white' : 'text-gray-400 hover:text-white'
                      }`
                    }
                  >
                    {item.label}
                    {item.children && (
                      <IoChevronDownOutline
                        size={13}
                        className={`transition-transform duration-200 ${
                          activeDropdown === item.label ? 'rotate-180' : ''
                        }`}
                      />
                    )}
                  </NavLink>

                  {/* Dropdown */}
                  {item.children && activeDropdown === item.label && (
                    <div
                      className="absolute top-full left-0 mt-1 w-44 bg-zinc-900/95 backdrop-blur-md border border-white/10 rounded-xl shadow-xl overflow-hidden z-50"
                      onMouseEnter={() => openDropdown(item.label)}
                      onMouseLeave={closeDropdown}
                    >
                      {item.children.map((child) => (
                        <Link
                          key={child.label}
                          to={child.path}
                          className="block px-4 py-2.5 text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
                          onClick={() => setActiveDropdown(null)}
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-2">
              {/* Search icon */}
              <button
                onClick={() => setSearchOpen(true)}
                className="p-2 text-gray-300 hover:text-white transition-colors rounded-full hover:bg-white/10"
                aria-label="Search"
              >
                <AiOutlineSearch size={22} />
              </button>

              {/* Notifications */}
              <button className="hidden sm:flex p-2 text-gray-300 hover:text-white transition-colors rounded-full hover:bg-white/10">
                <BsBell size={20} />
              </button>

              {/* Subscribe CTA */}
              <Link
                to="/signup"
                className="hidden sm:block btn-subscribe"
              >
                Subscribe
              </Link>

              {/* Profile / Login */}
              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setProfileOpen(!profileOpen)}
                    className="flex items-center gap-2 p-1 rounded-full hover:bg-white/10 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-hotstar-gradient flex items-center justify-center text-sm font-bold text-white">
                      {user.name?.[0]?.toUpperCase() || 'U'}
                    </div>
                  </button>
                  {profileOpen && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-zinc-900/95 backdrop-blur-md border border-white/10 rounded-xl shadow-xl overflow-hidden z-50">
                      <div className="px-4 py-3 border-b border-white/10">
                        <p className="text-sm font-semibold text-white">{user.name}</p>
                        <p className="text-xs text-gray-400">{user.email}</p>
                      </div>
                      <button
                        onClick={() => { logout(); setProfileOpen(false); }}
                        className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-white/10 transition-colors"
                      >
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  to="/login"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-white hover:bg-white/10 transition-colors"
                >
                  <AiOutlineUser size={18} />
                  <span className="hidden sm:block">Login</span>
                </Link>
              )}

              {/* Mobile menu toggle */}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="md:hidden p-2 text-gray-300 hover:text-white"
              >
                {mobileOpen ? <HiX size={24} /> : <HiMenu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="md:hidden bg-black/97 backdrop-blur-md border-t border-white/10">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.label}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `block px-6 py-3 text-sm font-medium border-b border-white/5 ${
                    isActive ? 'text-white bg-white/5' : 'text-gray-400'
                  }`
                }
                onClick={() => setMobileOpen(false)}
              >
                {item.label}
              </NavLink>
            ))}
            <div className="px-6 py-4 flex gap-3">
              <Link
                to="/login"
                className="flex-1 text-center py-2 rounded-full border border-white/30 text-white text-sm font-medium"
                onClick={() => setMobileOpen(false)}
              >
                Login
              </Link>
              <Link
                to="/signup"
                className="flex-1 text-center py-2 rounded-full text-white text-sm font-medium"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #2563eb)' }}
                onClick={() => setMobileOpen(false)}
              >
                Subscribe
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Full-screen Search Overlay */}
      {searchOpen && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex flex-col">
          <div className="flex items-center px-4 sm:px-8 py-4 border-b border-white/10">
            <AiOutlineSearch size={24} className="text-gray-400 flex-shrink-0 mr-3" />
            <form onSubmit={handleSearch} className="flex-1">
              <input
                ref={searchRef}
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search movies, shows, sports..."
                className="w-full bg-transparent text-white text-lg placeholder-gray-500 outline-none"
              />
            </form>
            <button
              onClick={() => { setSearchOpen(false); setSearchInput(''); }}
              className="p-2 text-gray-400 hover:text-white ml-2"
            >
              <AiOutlineClose size={24} />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center">
            {searchInput ? (
              <button
                onClick={handleSearch}
                className="btn-subscribe px-8 py-3 text-base"
              >
                Search for "{searchInput}"
              </button>
            ) : (
              <div className="text-center">
                <AiOutlineSearch size={64} className="text-gray-700 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">Search for your favorite movies & shows</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
