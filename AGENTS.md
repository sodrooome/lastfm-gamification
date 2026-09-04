# AGENTS.md

## Project Overview

**tastecheck.me** (formerly lastfm-achievements) is a web application that transforms Last.fm listening data into a gamified profile: unlockable achievements, a 10-level XP progression system, an opt-in AI "roast" of your listening habits, and a two-user compare/joint-roast feature.

- **Backend:** FastAPI (Python) — proxies Last.fm API, computes achievements and XP, generates AI roasts via OpenRouter
- **Frontend:** Static SPA — vanilla HTML/CSS/JS, no build step, no frameworks
- **Design:** Warm paper canvas, single ink + coral accent system (see DESIGN.md)

## Project Structure

```
lastfm-gamification/
├── backend/
│   ├── .env              # Last.fm / OpenRouter credentials (gitignored)
│   ├── Makefile          # serve-dev, serve-prod, format, test targets
│   ├── requirements.txt  # Python dependencies
│   ├── pytest.ini        # Pytest config
│   ├── config.py         # Env var loading (LASTFM_API_KEY, LASTFM_SHARED_SECRET, LLM_API_KEY)
│   ├── main.py           # FastAPI app, routes, mounts frontend as static files
│   ├── achievements.py   # Achievement conditions, XP calculation, level thresholds
│   ├── lastfm.py         # Async Last.fm API client (httpx)
│   ├── llm.py            # AI roast generation (OpenRouter) + per-key daily rate limit/cache
│   ├── exceptions.py     # RoastLimitExceededError, RoastNotConfiguredError, RoastServiceUnavailableError
│   ├── _logging.py       # Logging setup
│   └── tests/            # Pytest suite (test_achievements.py, test_lastfm.py, test_llm.py, test_user_routes.py)
├── frontend/
│   ├── index.html        # Landing + dashboard (profile card, achievement grids)
│   ├── compare.html      # Two-user compare + joint roast
│   ├── how-to.html       # Achievement guide
│   ├── about.html        # About page
│   ├── privacy.html, terms.html, 404.html
│   ├── style.css         # Design tokens, layout, components, responsive breakpoints
│   ├── config.js         # Shared API_BASE resolution (loaded before app.js/compare.js)
│   ├── app.js            # Main app: fetch API data, DOM rendering, roast dialogs, share card
│   ├── compare.js        # Compare page logic + joint roast
│   ├── release.html      # Release notes / changelog, linked from every page's footer
│   ├── tracking.js       # Analytics (Mixpanel)
│   └── achievements-data.js
├── e2e/                  # Playwright smoke tests (kept out of frontend/, see below)
│   ├── package.json, package-lock.json
│   ├── playwright.config.js
│   └── tests/            # smoke-test.spec.js
├── screenshot/           # Desktop and mobile screenshots
├── DESIGN.md             # Design system documentation
├── LEVELS.md             # XP system documentation
└── README.md             # Setup and usage guide
```

## Key Commands

### Backend

```bash
cd backend
pip install -r requirements.txt   # Install dependencies
make serve-dev                     # Start dev server (uvicorn --reload)
make serve-prod                    # Start prod server
make format                        # Format with Black
make test                          # Run pytest suite
```

Server runs on `http://localhost:8000`. Frontend is served as static files from the same server when `ENVIRONMENT=development`.

### Frontend

No build step. Open `frontend/index.html` directly or serve via the backend. API base URL is resolved in `frontend/config.js`, shared by `app.js`/`compare.js`.

### End-to-End Tests (`e2e/`)

Playwright smoke tests live in their own top-level `e2e/` directory, separate from `frontend/` — the entire `frontend/` directory is published as-is to GitHub Pages (`publish_dir: ./frontend` in `.github/workflows/deploy.yml`), so test tooling (`package.json`, `playwright.config.js`, `node_modules`) must not live inside it.

```bash
cd e2e
npm install       # or `npm run install` for Playwright browsers
npm test          # runs against the deployed GitHub Pages site, not localhost
npm run report    # opens the HTML report
```

## Backend Conventions

### Python

- **Formatter:** Black. Run `make format` before committing
- **Imports:** Standard library → third-party → local. Use absolute imports for local modules (e.g., `from achievements import ...`)
- **Async:** All Last.fm API calls are async using `httpx.AsyncClient`
- **Error handling:** Wrap route handlers in try/except, raise `HTTPException(status_code=500)` on failure
- **No type hints required** but preferred for route parameters

### API Client (`lastfm.py`)

- Each function creates its own `httpx.AsyncClient` context manager
- All endpoints return raw JSON dicts from the Last.fm API
- `fetch_user_all_top_artists()` paginates across all pages (default limit: 10,000 artists), returns a `set` of artist names plus first page data
- `fetch_user_recent_tracks()` requests `limit=200` (Last.fm's max page size for this endpoint) so the "100+ scrobbles today" daily achievement is reachable; the rarely-hit 1,000/day achievement still can't trigger off a single page — pagination would be needed for that

### AI Roast & Rate Limiting (`llm.py`)

- `get_or_cache_roast(key, context_builder, listener=roast_listener)` enforces a shared daily quota (`ROAST_LIMIT_PER_USER = 3`) per string key, caching the most recent result and raising `RoastLimitExceededError` (→ HTTP 429) once exhausted
- Solo roasts (`GET /roast/{username}`) key on the plain username; joint roasts (`POST /compare/roast`) key on `"joint:" + "|".join(sorted([user1, user2]))` so either ordering of the pair shares one quota, and pass `listener=roast_joint_listener` to reuse the same counter/cache against a different LLM prompt
- The counters are in-memory and single-process — see Notable Gaps below
- `GET /roast/{username}` responds with `remaining` (quota left after this call); `app.js`'s `updateRoastRemainingUI()` reflects it as a status chip in the result dialog and enables/disables the Retake button (`#roastResultRetake`, wired to re-run `confirmRoast()` without re-showing consent) accordingly

### Achievement Logic (`achievements.py`)

- Achievement names are string keys in `ALL_ACHIEVEMENTS` and `DAILY_ACHIEVEMENTS` lists
- Each achievement returns `{"name": str, "unlocked": bool, "type": "lifetime"|"daily"}`
- XP sources: scrobbles (cumulative tiers), achievements (150 XP each), unique artists (cumulative tiers)
- Max XP is 2,585, capped in `calculate_xp()`

## Frontend Conventions

### JavaScript (`app.js`)

- **No frameworks, no build tools** — vanilla DOM manipulation
- API base URL is resolved once in `config.js` (localhost → `http://localhost:8000`, else the hardcoded production URL) and shared by `app.js`/`compare.js`; `config.js` must be loaded before either script
- State management via DOM visibility toggles (`toggle(id, show)`)
- URL params (`?user=username`) control which profile loads
- `window.history.pushState` updates URL on successful load
- Achievements are split by `type` field into daily and lifetime sections

### Shareable Roast Card (`app.js`)

- After a successful (non-cached, non-error) roast, `#roastResultShare` appears in the result dialog and calls `shareRoastCard()` — entirely client-side, no backend endpoint involved
- `buildShareCardCanvas(profileData, roastText)` draws a fixed 1080×1080 `<canvas>` reusing the sidebar's existing visual recipe (ink background, brand-red avatar ring, brand-red level pill, brand-red→ach-accent XP gradient) — `currentProfileData` (set in `_fetchAndRender`) supplies the stats, `lastRoastText` supplies the quote
- The avatar image is loaded with `crossOrigin="anonymous"`; if Last.fm's CDN doesn't grant it, the load fails and the card falls back to a monogram (first letter of the username) instead of erroring — there is no backend proxy for this
- The roast quote is a single fixed-width block with its own height budget (170px) — `fitRoastText()` shrinks the font step by step until the wrapped text fits, since roast length varies (bounded at 400 chars by `_clean_roast_output` in `backend/llm.py`)
- Layout below the avatar/quote flows sequentially top-to-bottom (each element's y-position is computed from the one above it) rather than anchoring anything to a fixed distance from the canvas bottom — an earlier version anchored the footer to `size - 64` and it visually collided with the XP bar whenever the roast text was long enough to push content further down
- Export uses `navigator.share` with the generated PNG `File` when the browser supports sharing files, falling back to a synthetic `<a download>` click otherwise

### HTML

- Uses `id` attributes for JS targeting
- Sections toggled via `d-none` class
- Achievement containers: `#dailyAchievements`, `#achievements`

### CSS (`style.css`)

- Design tokens defined as CSS custom properties
- 4px-based spacing system
- Responsive breakpoints for mobile/tablet/desktop
- Achievement badges use `.badge-card` and `.badge-card.locked` states
- Follows DESIGN.md conventions: hairline borders, no shadows, Inter Display font

## Development Guidelines

### Adding Features

1. Backend changes go in the appropriate file under `backend/`
2. Frontend changes go in `frontend/` files directly
3. Run `make format` in backend before committing
4. Test by running `make serve` and opening `http://localhost:8000?user=YOUR_USERNAME`

### Environment Setup

Create `backend/.env`:
```
LASTFM_API_KEY=your_api_key_here
LASTFM_SHARED_SECRET=your_shared_secret_here
```

Get API credentials at https://www.last.fm/api/account/create

### Design System

Follow DESIGN.md for all UI changes. Key principles:
- White canvas, dark ink type, generous whitespace
- Near-black primary CTA with white text
- Hairline borders instead of shadows
- 4px-based spacing
- Inter Display font family
- Zero-shadow elevation model

### XP and Achievement System

Refer to LEVELS.md for complete threshold tables, formulas, and examples. Core rules:
- 12 lifetime achievements + 3 daily achievements
- XP from scrobbles, achievements (150 XP each), and unique artists
- 10 levels with escalating XP thresholds
- Max XP capped at 2,585

## Notable Gaps / TODOs

- `API_BASE` still falls back to a hardcoded production URL when not running on localhost (now centralized in `config.js` instead of duplicated, but the tradeoff is unchanged — there's no build step to inject an env-specific value)
- No linting configured for frontend (ESLint, Prettier)
- The AI roast in-memory cache/counters (`llm.py`, shared by solo and joint roasts) are single-process and non-persistent; a multi-process store (Redis/SQLite) would be needed for gunicorn deployments
- Backend test coverage is uneven (~85% overall as of this writing). `lastfm.py`, `/health`+`/ready`, the 404/500 branches on `/user`/`/roast`/`/compare`/`/compare/roast`, all `/compare` tagline tiers, the joint-roast path (`roast_joint_listener`, `_format_joint_roast_prompt`), the `_clean_roast_output`/`_is_reasoning_line` edge cases, and the achievement/`_compute_avg_listen` edge cases are all covered now. No known route-level or unit-level gaps remain — only the real OpenRouter integration is unexercised (every LLM test mocks the HTTP call)
