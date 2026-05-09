# AGENTS.md

## Project Overview

**lastfm-achievements** is a web application that transforms Last.fm listening data into a gamified profile with unlockable achievements and a 10-level XP progression system.

- **Backend:** FastAPI (Python) — proxies Last.fm API, computes achievements and XP
- **Frontend:** Static SPA — vanilla HTML/CSS/JS, no build step, no frameworks
- **Design:** Airtable-inspired editorial system (see DESIGN.md)

## Project Structure

```
lastfm-achievements/
├── backend/
│   ├── .env              # Last.fm API credentials (gitignored)
│   ├── Makefile          # serve, format targets
│   ├── requirements.txt  # Python dependencies
│   ├── config.py         # Env var loading (LASTFM_API_KEY, LASTFM_SHARED_SECRET)
│   ├── main.py           # FastAPI app, mounts frontend as static files
│   ├── models.py         # Pydantic models (currently unused)
│   ├── achievements.py   # Achievement conditions, XP calculation, level thresholds
│   └── lastfm.py         # Async Last.fm API client (httpx)
├── frontend/
│   ├── index.html        # Page structure, profile card, achievement grids
│   ├── how-to.html       # Explanation page
│   ├── style.css         # Design tokens, layout, components, responsive breakpoints
│   └── app.js            # Fetch API data, DOM rendering
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
make serve                         # Start dev server (uvicorn --reload)
make format                        # Format with Black
```

Server runs on `http://localhost:8000`. Frontend is served as static files from the same server.

### Frontend

No build step. Open `frontend/index.html` directly or serve via the backend. API base URL is at the top of `frontend/app.js`.

## Backend Conventions

### Python

- **Formatter:** Black. Run `make format` before committing
- **Imports:** Standard library → third-party → local. Use absolute imports for local modules (e.g., `from achievements import ...`)
- **Async:** All Last.fm API calls are async using `httpx.AsyncClient`
- **Error handling:** Wrap route handlers in try/except, raise `HTTPException(status_code=500)` on failure
- **No type hints required** but preferred for route parameters
- **Debug prints:** `print(response.json())` statements exist in `lastfm.py` — acceptable during development

### API Client (`lastfm.py`)

- Each function creates its own `httpx.AsyncClient` context manager
- All endpoints return raw JSON dicts from the Last.fm API
- `fetch_user_all_top_artists()` paginates across all pages (default limit: 10,000 artists), returns a `set` of artist names plus first page data

### Achievement Logic (`achievements.py`)

- Achievement names are string keys in `ALL_ACHIEVEMENTS` and `DAILY_ACHIEVEMENTS` lists
- Each achievement returns `{"name": str, "unlocked": bool, "type": "lifetime"|"daily"}`
- XP sources: scrobbles (cumulative tiers), achievements (150 XP each), unique artists (cumulative tiers)
- Max XP is 2,585, capped in `calculate_xp()`

## Frontend Conventions

### JavaScript (`app.js`)

- **No frameworks, no build tools** — vanilla DOM manipulation
- API base URL is hardcoded at top: `const API_BASE = "http://localhost:8000"`
- State management via DOM visibility toggles (`toggle(id, show)`)
- URL params (`?user=username`) control which profile loads
- `window.history.pushState` updates URL on successful load
- Achievements are split by `type` field into daily and lifetime sections

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

- `backend/models.py` defines a `UserProfile` Pydantic model that is currently unused
- `print()` debug statements in `lastfm.py` and `main.py`
- No test suite exists
- `API_BASE` in `app.js` is hardcoded to localhost
- No linting configured for frontend (ESLint, Prettier)
- `fetch_user_recent_tracks()` only fetches 50 tracks, which means daily achievements requiring 100+ daily scrobbles can never trigger
