# JioHotstar Clone — Full-Stack Streaming Platform

A full-stack OTT streaming discovery application inspired by JioHotstar, built with React, Node.js, Express.js, MongoDB, and Redis.

The project combines a responsive streaming interface with backend APIs for authentication, user profiles, watchlists, and viewing history, along with security, caching, and rate-limiting mechanisms.

## Live Demo

- **Live Application:** [JioHotstar Clone](https://jiohotstar-clone-chi.vercel.app/)
- **Backend source code:** [Server directory](https://github.com/supriyaguess/jiohotstar-clone/tree/main/server)
- **Backend documentation:** [Server README](https://github.com/supriyaguess/jiohotstar-clone/blob/main/server/README.md)
- **Repository:** [GitHub](https://github.com/supriyaguess/jiohotstar-clone)

## Screenshots

The following screenshots are already referenced in the repository. Keep them if these files exist and show the current interface.

<div align="center">
  <img src="screenshots/home.png" width="100%" alt="Home page"/>
  <p><em>Home page — hero banner and content carousels</em></p>
  <img src="screenshots/movies.png" width="100%" alt="Movies page"/>
  <p><em>Movies — categories and genre discovery</em></p>
  <img src="screenshots/tv-shows.png" width="100%" alt="TV shows page"/>
  <p><em>TV shows — content discovery</em></p>
  <img src="screenshots/detail.png" width="100%" alt="Content details"/>
  <p><em>Details — content information, cast, and trailers</em></p>
  <img src="screenshots/search.png" width="100%" alt="Search page"/>
  <p><em>Search — movie and TV discovery</em></p>
  <img src="screenshots/login.png" width="100%" alt="Login page"/>
  <p><em>Login interface</em></p>
</div>

## Features

### Frontend

- Responsive OTT-style interface with a cinematic hero banner.
- Horizontal content carousels and interactive hover cards.
- Movie and TV show discovery powered by TMDB.
- Search, genre filters, detail pages, and trailer previews.
- Responsive sidebar and mobile navigation.
- Lazy-loaded pages and loading skeletons.
- Watchlist and account interfaces.

### Backend and Authentication

- REST APIs built with Node.js and Express.js.
- Email/password authentication and Google OAuth using authorization-code flow with PKCE.
- Short-lived access tokens and rotating refresh tokens.
- Refresh-token reuse detection and session revocation.
- Protected routes and Zod request validation.
- User profile management and account deletion.
- Avatar uploads using presigned URLs when S3 storage is configured.

### Data and Performance

- MongoDB with Mongoose for persistent user data.
- APIs for watchlists and viewing history.
- Redis-backed catalog caching and rate limiting.
- Endpoint-specific cache expiration.
- Cache-miss coalescing to reduce duplicate upstream requests.
- Structured logging, request IDs, health checks, and graceful shutdown.

## Tech Stack

| Layer | Technologies |
|---|---|
| Frontend | React, Vite, Tailwind CSS, React Router |
| Backend | Node.js, Express.js |
| Database | MongoDB, Mongoose |
| Caching and rate limiting | Redis |
| Authentication | JWT, Google OAuth 2.0, PKCE, bcrypt |
| Validation | Zod |
| Catalog data | TMDB API |
| Image storage | AWS S3 presigned URLs, when configured |
| Deployment | Vercel frontend; backend deployment configured separately |

## Architecture

```text
React Frontend
      |
      | REST API requests
      v
Express.js Backend
   /      |       \
MongoDB  Redis   TMDB API
 Data    Cache   Catalog
         and
      Rate Limits
```

The frontend communicates with the Express backend through REST APIs. MongoDB stores persistent application data, Redis supports caching and rate limiting, and the backend retrieves movie and TV catalog information from TMDB.

## Repository Structure

```text
jiohotstar-clone/
├── public/
├── screenshots/
├── src/                    # React frontend
├── server/
│   ├── src/
│   │   ├── cache/
│   │   ├── config/
│   │   ├── db/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── app.js
│   │   └── index.js
│   └── README.md
├── test/
├── package.json
├── package-lock.json
├── vercel.json
└── README.md
```

## Getting Started

### Prerequisites

- Node.js and npm
- MongoDB
- Redis
- TMDB API key
- Google OAuth credentials if Google sign-in is enabled
- S3 credentials if avatar uploads use S3

### Frontend Setup

```bash
git clone https://github.com/supriyaguess/jiohotstar-clone.git
cd jiohotstar-clone
npm install
npm run dev
```

Configure the frontend environment variables required by the current implementation. Set `VITE_API_URL` to your backend API URL if the frontend uses the backend API.

### Backend Setup

Open a separate terminal:

```bash
cd jiohotstar-clone/server
npm install
```

Configure the backend environment variables and services according to the [backend README](https://github.com/supriyaguess/jiohotstar-clone/blob/main/server/README.md).

Start the backend using the script defined in `server/package.json`.

**Security:** Never commit real API keys, database credentials, OAuth secrets, or `.env` files.

## Testing

The backend integration tests cover key areas such as authentication, refresh-token handling, rate limiting, watchlists, viewing history, and caching.

Run the test command specified in `server/package.json`. Ensure the required MongoDB and Redis services are available.

## Key Implementation Details

- **Authentication:** Short-lived access tokens and rotating refresh tokens.
- **OAuth:** Google sign-in using authorization-code flow with PKCE.
- **Caching:** Redis caching and cache-miss coalescing for catalog requests.
- **Rate limiting:** Shared Redis-backed counters.
- **Data integrity:** MongoDB indexes for user-specific records.
- **Reliability:** Structured logs, health checks, and graceful shutdown.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).

## Disclaimer

This is an educational portfolio project inspired by JioHotstar. It is not affiliated with or endorsed by JioHotstar.

Movie and TV catalog data is provided by [The Movie Database (TMDB)](https://www.themoviedb.org/).
