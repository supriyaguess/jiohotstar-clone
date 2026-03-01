<div align="center">

# JioHotstar Clone

### A full-featured streaming platform clone built with React.js

[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=white)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![React Router](https://img.shields.io/badge/React_Router-6-CA4245?style=for-the-badge&logo=reactrouter&logoColor=white)](https://reactrouter.com)
[![TMDB](https://img.shields.io/badge/TMDB_API-01B4E4?style=for-the-badge&logo=themoviedatabase&logoColor=white)](https://www.themoviedb.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

**[Live Demo](https://jiohotstar-clone.vercel.app) · [Report Bug](https://github.com/yourusername/jiohotstar-clone/issues) · [Request Feature](https://github.com/yourusername/jiohotstar-clone/issues)**

</div>

---

## About The Project

A pixel-accurate, fully responsive clone of **JioHotstar** — India's largest OTT streaming platform. Built entirely with modern React.js, this project replicates the core UI/UX of the platform including the auto-rotating hero banner, horizontal content carousels, hover-expand cards (like Netflix/Hotstar), left sidebar navigation, movie and TV show detail pages, live search, and a full subscription onboarding flow.

Real movie and TV show data is fetched live from the **TMDB (The Movie Database) API**, making this a fully functional streaming discovery app — not just a static UI mockup.

> Built to demonstrate advanced React patterns, clean component architecture, API integration, and production-quality UI/UX. Great reference for anyone learning to build a Netflix clone, Hotstar clone, or any OTT streaming platform with React.

---

## Features

- **Hero Banner** — Auto-rotating featured content (trending movies/shows) with smooth fade, gradient overlays, and dot indicators. Pauses on hover.
- **Content Carousels** — Swiper.js powered horizontal scrolling rows with custom prev/next arrows and responsive slide counts
- **Hover Card Popup** — After 450ms hover, an expanded Netflix-style popup appears via `React.createPortal()` — shows wide backdrop image, year, rating, description, Play / Add to Watchlist / More Info buttons. Smart edge-aware positioning.
- **Left Sidebar** — Collapsible vertical nav (64px icon-only → 208px icon + label on hover). Subscribe CTA animates in when expanded. Mobile gets a fixed bottom tab bar.
- **Movie Detail Page** — Full backdrop hero, poster, cast row (horizontal scroll), YouTube trailer modal, similar content row
- **TV Shows** — Full TV show support with on-air, airing today, popular, top-rated tabs
- **Search** — Debounced real-time multi-search across movies + TV with filter tabs and load-more pagination
- **Genre Discovery** — Genre chip filter on Movies and TV Shows pages with instant TMDB results
- **Subscription Flow** — 2-step signup: plan selection (Mobile / Super / Premium) → account creation with social login UI
- **Mock Auth** — Login / Signup UI with localStorage persistence, no backend required
- **Watchlist** — Add and remove items, persisted to localStorage
- **Code Splitting** — All pages lazy-loaded via `React.lazy()` + `Suspense`
- **Skeleton Loaders** — Shimmer loading states on hero, carousels, and grids
- **Fully Responsive** — Mobile, tablet, and desktop layouts

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 + Vite 7 |
| Styling | Tailwind CSS v3 |
| Routing | React Router v6 |
| Data Source | TMDB API (free tier) |
| HTTP | Axios |
| Carousels | Swiper.js |
| Icons | React Icons |
| State | Context API + localStorage |
| Deployment | Vercel |

---

## Project Structure

```
src/
├── api/
│   ├── config.js          # Axios instance + image URL helpers
│   └── tmdb.js            # All TMDB API fetch functions
├── components/
│   ├── layout/
│   │   ├── Sidebar.jsx    # Collapsible left nav + mobile bottom bar
│   │   └── Footer.jsx
│   └── ui/
│       ├── HeroBanner.jsx        # Auto-rotating hero banner
│       ├── ContentRow.jsx        # Swiper carousel row
│       ├── ContentCard.jsx       # Card + hover popup via React Portal
│       ├── VideoModal.jsx        # YouTube trailer embed
│       └── LoadingSpinner.jsx    # Shimmer skeleton loaders
├── pages/
│   ├── Home.jsx           # Hero + 7 content rows
│   ├── Movies.jsx         # Tab filters + genre discovery
│   ├── TVShows.jsx        # Tab filters + genre discovery
│   ├── Detail.jsx         # Full info + cast + trailer + similar
│   ├── Search.jsx         # Live search with load-more
│   ├── Login.jsx          # Sign in
│   ├── Signup.jsx         # 2-step plan picker + account form
│   └── NotFound.jsx       # 404
├── hooks/
│   ├── useMedia.js        # Fetch hook with AbortController
│   └── useSearch.js       # Debounced search hook
├── context/
│   └── AppContext.jsx     # Global auth + watchlist state
├── utils/
│   └── helpers.js         # Image URL builders, date/rating formatters
└── constants/
    └── index.js           # Nav items, genres, subscription plans
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- A free TMDB API key — [Get one here in 2 minutes](https://www.themoviedb.org/settings/api)

### Installation

```bash
# 1. Clone the repo
git clone https://github.com/yourusername/jiohotstar-clone.git
cd jiohotstar-clone

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
```

Edit `.env` and paste your TMDB API key:

```env
VITE_TMDB_API_KEY=your_tmdb_api_key_here
VITE_TMDB_BASE_URL=https://api.themoviedb.org/3
VITE_IMAGE_BASE_URL=https://image.tmdb.org/t/p
```

```bash
# 4. Start dev server
npm run dev
# → http://localhost:5173
```

### Production Build

```bash
npm run build
npm run preview
```

---

## Deploy to Vercel

The repo includes `vercel.json` which handles SPA client-side routing automatically.

1. Push to GitHub
2. Import the repo on [vercel.com](https://vercel.com)
3. Add `VITE_TMDB_API_KEY` in **Project Settings → Environment Variables**
4. Deploy — done

---

## Pages & Routes

| Route | Page |
|-------|------|
| `/` | Home — hero + trending + rows |
| `/movies` | Movies — tabs + genre filter |
| `/tv-shows` | TV Shows — tabs + genre filter |
| `/detail/movie/:id` | Movie detail |
| `/detail/tv/:id` | TV show detail |
| `/search?q=` | Search results |
| `/login` | Sign in |
| `/signup` | Subscribe / create account |

---

## Key Implementation Details

**Hover Card via React Portal**
The expanded hover popup is rendered with `createPortal(popup, document.body)` so it escapes `overflow: hidden` on Swiper rows. Card position is read with `getBoundingClientRect()` and the popup is smart-positioned to open below the card, or above if there's no space below.

**Collapsible Sidebar**
Sidebar transitions between `w-16` (icons only) and `w-52` (icons + labels) using CSS `transition-all`. Label spans animate with `opacity` + `translateX` for a smooth slide effect. On mobile, this becomes a fixed bottom navigation bar.

**Debounced Search**
`useSearch` hook fires the TMDB API call 400ms after the user stops typing. The effect cleanup cancels the pending timer, preventing stale requests.

**Lazy Loaded Pages**
All 8 pages are code-split via `React.lazy()`. Vite produces a separate JS chunk per page so only the home page JavaScript loads on initial visit.

---

## Similar Projects You Might Like

- Netflix Clone React
- Amazon Prime Video Clone
- Disney+ Hotstar Clone
- OTT Streaming Platform React
- Movie App TMDB API React

---

## Contributing

1. Fork the project
2. Create your branch (`git checkout -b feature/YourFeature`)
3. Commit your changes (`git commit -m 'Add YourFeature'`)
4. Push to the branch (`git push origin feature/YourFeature`)
5. Open a Pull Request

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

## Disclaimer

This project is for **educational and portfolio purposes only**. It is not affiliated with, endorsed by, or connected to JioHotstar, Star India Private Limited, or Reliance Jio. All content data is provided by [The Movie Database (TMDB)](https://www.themoviedb.org).

---

<div align="center">
Built with React.js · Data by TMDB · Deployed on Vercel

If this helped you, please ⭐ star the repo — it helps others find it!
</div>
