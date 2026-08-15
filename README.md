<p align="center">
  <img src="frontend/assets/icon.svg" alt="tastecheck.me logo" width="80" height="80" />
</p>

<h1 align="center">tastecheck.me</h1>

<p align="center"><em>Turn your listening into identity</em></p>

Turn your Last.fm listening history into a gamified profile with unlock achievements, level up with XP, AI playful roasts, compare your taste with friends or jointly roast each other.

<p align="center">
  <img src="screenshot/desktop-version-1.png" alt="tastecheck.me landing page" width="60%" />
</p>

## Features

- **12 lifetime achievements** across three categories: scrobbles, unique artists, and profile completeness plus **3 daily achievements**
- **10-level XP progression** earned from scrobbles, achievements (150 XP each), and unique artists, capped at 2,585 XP
- **AI "Roast Me"**: a playful, opt-in roast of your listening habits (Gemini 2.5 Flash via OpenRouter)
- **Profile comparison**: a compatibility score, shared artists, and a joint roast for any two users
- **Responsive, Airtable-inspired editorial design with custom components**: see [DESIGN.md](DESIGN.md)

## Architecture

- **Backend**. FastAPI (Python) that proxies the Last.fm API and computes achievements and XP
- **Frontend**. vanilla HTML/CSS/JS, no build step, no frameworks, served as static files

## API

| Endpoint | Description |
|---|---|
| `GET /user/{username}` | Full profile: stats, achievements, XP, level |
| `GET /roast/{username}?consent=true` | AI roast of a user's listening habits |
| `GET /compare/{user1}/{user2}` | Compatibility score + shared artists |
| `POST /compare/roast` | Joint roast comparing two users |
| `GET /health`, `GET /ready` | Health / readiness checks |

## Setup

### Prerequisites

- Python 3.10+
- A [Last.fm API key](https://www.last.fm/api/account/create)

### Backend

```bash
cd backend
pip install -r requirements.txt
```

Create `backend/.env`:

```env
LASTFM_API_KEY=your_api_key_here
LASTFM_SHARED_SECRET=your_shared_secret_here

# Optional — enables the AI roast + compare roast features
LLM_API_KEY=your_openrouter_key_here
```

Start the server:

```bash
make serve          # or: uvicorn main:app --reload
```

The API runs at `http://localhost:8000`.

### Frontend

No build step. In development (`ENVIRONMENT=development`) the backend serves the frontend as static files; otherwise open `frontend/index.html` directly. The API base URL is configured at the top of `frontend/app.js`.

## Project Structure

```
backend/
├── main.py          # FastAPI app + routes
├── achievements.py  # Achievement conditions, XP, level thresholds
├── lastfm.py        # Async Last.fm API client
├── llm.py           # AI roast (OpenRouter) + in-memory caching
├── config.py        # Environment variable loading
└── tests/           # Pytest suite

frontend/
├── index.html       # Main app (profile + dashboard)
├── compare.html     # Profile comparison
├── how-to.html      # Achievement guide
├── privacy.html     # Privacy policy
├── terms.html       # Terms of service
├── 404.html         # Not found page
├── app.js           # Main app logic
├── compare.js       # Comparison logic
├── style.css        # Design tokens + styles
├── tracking.js      # Analytics
├── achievements-data.js
└── assets/          # Icons + images
```

## Documentation

- [DESIGN.md](DESIGN.md): design system
- [LEVELS.md](LEVELS.md): XP thresholds and formulas
- [how-to.html](frontend/how-to.html): achievement unlock guide
