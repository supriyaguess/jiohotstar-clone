import { Link } from 'react-router-dom';
import { FaFacebookF, FaTwitter, FaInstagram, FaYoutube } from 'react-icons/fa';
import { FOOTER_LINKS, LANGUAGES } from '../../constants';

const SOCIAL_ICONS = [
  { Icon: FaFacebookF, href: '#', label: 'Facebook' },
  { Icon: FaTwitter, href: '#', label: 'Twitter' },
  { Icon: FaInstagram, href: '#', label: 'Instagram' },
  { Icon: FaYoutube, href: '#', label: 'YouTube' },
];

export default function Footer() {
  return (
    <footer className="bg-zinc-950 border-t border-white/5 mt-20">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Top grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-10">
          {Object.entries(FOOTER_LINKS).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-white font-semibold text-sm mb-4 uppercase tracking-wider">
                {category}
              </h4>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-gray-500 hover:text-gray-300 text-sm transition-colors duration-200"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="border-t border-white/10 pt-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-1">
              <span className="text-xl font-black tracking-tight">
                <span className="text-blue-400">jio</span>
                <span className="text-white">|</span>
                <span className="gradient-text">hotstar</span>
              </span>
            </Link>

            {/* Language selector */}
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-sm">Language:</span>
              <select className="bg-zinc-900 border border-white/10 text-gray-300 text-sm px-3 py-1.5 rounded-lg outline-none focus:border-purple-500">
                {LANGUAGES.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>
            </div>

            {/* Social links */}
            <div className="flex items-center gap-3">
              {SOCIAL_ICONS.map(({ Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center text-gray-400 hover:text-white transition-all duration-200"
                >
                  <Icon size={15} />
                </a>
              ))}
            </div>
          </div>

          {/* Bottom strip */}
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-600">
            <p>© {new Date().getFullYear()} Jio Platforms Limited. All rights reserved.</p>
            <div className="flex gap-4">
              <a href="#" className="hover:text-gray-400 transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-gray-400 transition-colors">Terms of Use</a>
              <a href="#" className="hover:text-gray-400 transition-colors">Cookie Policy</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
