export const NAV_ITEMS = [
  {
    label: 'Home',
    path: '/',
  },
  {
    label: 'Movies',
    path: '/movies',
    children: [
      { label: 'Popular', path: '/movies?tab=popular' },
      { label: 'Top Rated', path: '/movies?tab=top_rated' },
      { label: 'Upcoming', path: '/movies?tab=upcoming' },
      { label: 'Now Playing', path: '/movies?tab=now_playing' },
    ],
  },
  {
    label: 'TV Shows',
    path: '/tv-shows',
    children: [
      { label: 'Popular', path: '/tv-shows?tab=popular' },
      { label: 'Top Rated', path: '/tv-shows?tab=top_rated' },
      { label: 'On Air', path: '/tv-shows?tab=on_air' },
      { label: 'Airing Today', path: '/tv-shows?tab=airing_today' },
    ],
  },
  {
    label: 'Sports',
    path: '/sports',
  },
];

export const MOVIE_GENRES = [
  { id: 28, name: 'Action' },
  { id: 12, name: 'Adventure' },
  { id: 16, name: 'Animation' },
  { id: 35, name: 'Comedy' },
  { id: 80, name: 'Crime' },
  { id: 99, name: 'Documentary' },
  { id: 18, name: 'Drama' },
  { id: 10751, name: 'Family' },
  { id: 14, name: 'Fantasy' },
  { id: 27, name: 'Horror' },
  { id: 10402, name: 'Music' },
  { id: 9648, name: 'Mystery' },
  { id: 10749, name: 'Romance' },
  { id: 878, name: 'Sci-Fi' },
  { id: 53, name: 'Thriller' },
];

export const TV_GENRES = [
  { id: 10759, name: 'Action & Adventure' },
  { id: 16, name: 'Animation' },
  { id: 35, name: 'Comedy' },
  { id: 80, name: 'Crime' },
  { id: 99, name: 'Documentary' },
  { id: 18, name: 'Drama' },
  { id: 10751, name: 'Family' },
  { id: 10762, name: 'Kids' },
  { id: 9648, name: 'Mystery' },
  { id: 10763, name: 'News' },
  { id: 10764, name: 'Reality' },
  { id: 10765, name: 'Sci-Fi & Fantasy' },
  { id: 10766, name: 'Soap' },
  { id: 10767, name: 'Talk' },
  { id: 10768, name: 'War & Politics' },
  { id: 37, name: 'Western' },
];

export const SPORTS_CATEGORIES = [
  { id: 1, name: 'Cricket', icon: '🏏', color: '#22c55e' },
  { id: 2, name: 'Football', icon: '⚽', color: '#3b82f6' },
  { id: 3, name: 'Kabaddi', icon: '🤼', color: '#f59e0b' },
  { id: 4, name: 'Badminton', icon: '🏸', color: '#ec4899' },
  { id: 5, name: 'Tennis', icon: '🎾', color: '#84cc16' },
  { id: 6, name: 'Hockey', icon: '🏑', color: '#06b6d4' },
];

export const SUBSCRIPTION_PLANS = [
  {
    name: 'Mobile',
    price: '₹299',
    period: '/year',
    features: ['Mobile only', '720p quality', 'Ad-supported shows'],
    popular: false,
  },
  {
    name: 'Super',
    price: '₹899',
    period: '/year',
    features: ['2 screens', '1080p quality', 'All shows & movies', 'Download content'],
    popular: true,
  },
  {
    name: 'Premium',
    price: '₹1499',
    period: '/year',
    features: ['4 screens', '4K Ultra HD', 'Dolby Atmos', 'All content + Live sports'],
    popular: false,
  },
];

export const FOOTER_LINKS = {
  Company: ['About Us', 'Careers', 'Press', 'Blog'],
  Help: ['Contact Us', 'FAQ', 'Terms of Use', 'Privacy Policy'],
  Explore: ['Movies', 'TV Shows', 'Sports', 'Live TV'],
  Connect: ['Facebook', 'Twitter', 'Instagram', 'YouTube'],
};

export const LANGUAGES = [
  'English', 'Hindi', 'Tamil', 'Telugu', 'Malayalam', 'Kannada', 'Bengali', 'Marathi',
];
