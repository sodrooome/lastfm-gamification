import uvicorn
import os
import logging
import httpx
from config import LASTFM_API_KEY, LASTFM_BASE_URL
from pathlib import Path
from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from achievements import (
    calculate_achievements,
    calculate_xp,
    calculate_daily_achievements,
    _compute_avg_listen,
)
from lastfm import (
    fetch_user_information,
    fetch_user_recent_tracks,
    fetch_user_all_top_artists,
    fetch_user_top_artists,
    fetch_user_top_artists_12month,
    fetch_user_friends,
)
from llm import (
    get_or_cache_roast,
    get_remaining_roasts,
    roast_joint_listener,
)
from exceptions import (
    RoastServiceUnavailableError,
    RoastNotConfiguredError,
    RoastLimitExceededError,
)
from datetime import datetime, timezone
from _logging import configure_logging

configure_logging()

origins = ["https://sodrooome.github.io"]

if os.getenv("ENVIRONMENT") == "development":
    # extend allowed origins (just in case)
    origins.extend(["http://localhost:8000", "http://127.0.0.1:8000"])

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

logger = logging.getLogger(__name__)


@app.get("/health")
async def liveness_check():
    # if this fails, container will be automatically restarted
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}


@app.get("/ready")
async def readiness_check():
    # confirms the app is ready to receive the traffic
    # if this fails, the container temporarily removed from the load balancer
    first_checks: dict[str, bool] = {}
    first_checks_erorrs: dict[str, str] = {}

    errors = {}
    params = {
        "method": "chart.getTopArtists",
        "api_key": LASTFM_API_KEY,
        "format": "json",
        "limit": 1,
    }

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(url=LASTFM_BASE_URL, params=params)

            if response.status_code == 200:
                data = response.json()
                first_checks["lastfm_api"] = "error" not in data
            else:
                # avoid warning from static typing by keep the dict
                # only stored boolean, and store the detailed error separately
                first_checks["lastfm_api"] = False
                first_checks_erorrs["lastfm_api"] = (
                    f"Unexpected status code: {response.status_code}"
                )
    except Exception as e:
        first_checks["lastfm_api"] = False
        first_checks_erorrs["lastfm_api"] = str(e)

    all_ready = all(first_checks.values())

    payload = {
        "status": "ready" if all_ready else "not ready",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "checks": first_checks,
        "errors": first_checks_erorrs,  # only present if something failed
    }

    if errors:
        payload["errors"] = errors

    if not all_ready:
        raise HTTPException(status_code=503, detail=payload)

    return payload


@app.get("/user/{username}")
async def get_user_profile(username: str):
    try:
        user_info = await fetch_user_information(username=username)

        if "error" in user_info and user_info["error"] == 6:
            raise HTTPException(
                status_code=404, detail="The requested user does not exist"
            )

        top_artists_set, top_artists_response = await fetch_user_all_top_artists(
            username=username
        )
        recent_tracks = await fetch_user_recent_tracks(username=username)

        # if recent tracks are private or unavailable, give downstream
        # an empty but with valid response body instead just as None
        if recent_tracks is None:
            recent_tracks = {"recenttracks": {"track": []}}

        tracks = []
        raw_tracks = recent_tracks.get("recenttracks", {}).get("track", [])
        tracks = raw_tracks if isinstance(raw_tracks, list) else [raw_tracks]

        last_active_play = None
        if tracks:
            # the latest recent tracks is always first
            latest_track = tracks[0]
            # now playing tracks don't have a date field
            is_now_playing = latest_track.get("@attr", {}).get("nowplaying") == "true"
            last_active_play = None if is_now_playing else latest_track["date"]["uts"]

        total_scrobbles = int(user_info["user"]["playcount"])
        get_top_artist = (
            top_artists_response["topartists"]["artist"][0]["name"]
            if top_artists_response and top_artists_response["topartists"]["artist"]
            else "Unknown"
        )

        lifetime_achievements = calculate_achievements(
            user_info=user_info,
            top_artists_set=top_artists_set,
            recent_tracks=recent_tracks,
        )
        xp_data = calculate_xp(
            user_info=user_info,
            achievements=lifetime_achievements,
            top_artists_set=top_artists_set,
        )

        daily_achievements = calculate_daily_achievements(recent_tracks=recent_tracks)

        achievements = lifetime_achievements + daily_achievements

        image_list = user_info["user"].get("image", [])
        profile_image = ""

        for image in image_list:
            if image.get("size") == "large":
                profile_image = image["#text"]
                break

        registered = user_info["user"].get("registered", {})
        joined_date = ""

        friends_data = await fetch_user_friends(username=username)
        friend_count = 0

        get_country = user_info["user"].get("country", "")

        average_listen_per_day = 0

        if "unixtime" in registered:
            joined_unix = int(registered["unixtime"])
            joined_datetime = datetime.fromtimestamp(joined_unix, tz=timezone.utc)
            now = datetime.now(timezone.utc)

            days_since_join = (now - joined_datetime).days

            if days_since_join > 0:
                average_listen_per_day = round(total_scrobbles / days_since_join, 2)

        if "friends" in friends_data:
            friend_count = int(friends_data["friends"]["@attr"]["total"])

        if "unixtime" in registered:
            joined_date = registered["unixtime"]

        return {
            "username": username,
            "total_scrobbles": total_scrobbles,
            "top_artist": get_top_artist,
            "achievements": achievements,
            "level": xp_data["level"],
            "current_xp": xp_data["current_xp"],
            "max_xp": xp_data["max_xp"],
            "progress_pct": xp_data["progress_pct"],
            "profile_image": profile_image,
            "joined_date": joined_date,
            "friend_count": friend_count,
            "country": get_country,
            "average_listen": average_listen_per_day,
            "last_active_play": last_active_play,
        }
    except HTTPException:
        raise
    except Exception:
        logger.exception(
            f"Unexpected error while processing username for: {username}",
            extra={"endpoint": f"/user/{username}", "username": username},
        )
        raise HTTPException(status_code=500, detail="Internal server error")


@app.get("/roast/{username}")
async def get_user_roast(username: str, consent: bool = False):
    if not consent:
        raise HTTPException(status_code=400, detail="Consent required")

    try:
        user_info = await fetch_user_information(username=username)

        if "error" in user_info and user_info["error"] == 6:
            raise HTTPException(
                status_code=404, detail="The requested user does not exist"
            )

        top_artists_set, top_artists_response = await fetch_user_all_top_artists(
            username=username
        )
        recent_tracks = await fetch_user_recent_tracks(username=username)

        total_scrobbles = int(user_info["user"]["playcount"])
        top_artist = (
            top_artists_response["topartists"]["artist"][0]["name"]
            if top_artists_response and top_artists_response["topartists"]["artist"]
            else "Unknown"
        )

        lifetime_achievements = calculate_achievements(
            user_info=user_info,
            top_artists_set=top_artists_set,
            recent_tracks=recent_tracks,
        )

        friends_data = await fetch_user_friends(username=username)
        friend_count = 0
        if "friends" in friends_data:
            friend_count = int(friends_data["friends"]["@attr"]["total"])

        country = user_info["user"].get("country", "")
        average_listen_per_day = _compute_avg_listen(user_info, total_scrobbles)

        registered = user_info["user"].get("registered", {})
        account_age_years = 0.0
        if "unixtime" in registered:
            joined_unix = int(registered["unixtime"])
            joined_datetime = datetime.fromtimestamp(joined_unix, tz=timezone.utc)
            now = datetime.now(timezone.utc)
            account_age_years = (now - joined_datetime).days / 365.25

        unlocked_achievements = [
            a["name"]
            for a in lifetime_achievements
            if a["unlocked"] and a.get("type") != "daily"
        ]

        context = {
            "username": username,
            "total_scrobbles": total_scrobbles,
            "top_artist": top_artist,
            "unique_artists_count": len(top_artists_set),
            "account_age_years": account_age_years,
            "average_listen_per_day": average_listen_per_day,
            "friend_count": friend_count,
            "country": country,
            "unlocked_achievements": unlocked_achievements,
        }

        roast, cached = await get_or_cache_roast(username, lambda: context)

        return {
            "username": username,
            "roast": roast,
            "cached": cached,
            "remaining": get_remaining_roasts(username),
        }
    except HTTPException:
        raise
    except RoastLimitExceededError:
        raise HTTPException(status_code=429, detail="Roast limit reached")
    except RoastNotConfiguredError:
        raise HTTPException(status_code=503, detail="Roast feature not configured")
    except RoastServiceUnavailableError:
        raise HTTPException(
            status_code=503, detail="Roast service unavailable, try again later"
        )
    except Exception:
        logger.exception(
            f"Unexpected error while generating roast for: {username}",
            extra={"endpoint": f"/roast/{username}", "username": username},
        )
        raise HTTPException(status_code=500, detail="Internal server error")


@app.get("/compare/{first_user}/{second_user}")
async def compare_users(first_user: str, second_user: str):
    try:
        user1_info = await fetch_user_information(username=first_user)
        user2_info = await fetch_user_information(username=second_user)

        for user_info, _ in [(user1_info, first_user), (user2_info, second_user)]:
            if "error" in user_info and user_info["error"] == 6:
                raise HTTPException(
                    status_code=404, detail="The requested user does not exist"
                )

        user1_top_set, user1_top_response = await fetch_user_all_top_artists(
            username=first_user
        )
        user2_top_set, user2_top_response = await fetch_user_all_top_artists(
            username=second_user
        )

        # causing an internal server error whenever the period is set to 'overall'
        # for now, i will try to limit fetching the top artist on the past year
        user1_top_artists_raw = await fetch_user_top_artists(
            username=first_user, period="12month"
        )
        user2_top_artists_raw = await fetch_user_top_artists(
            username=second_user, period="12month"
        )

        user1_12month = await fetch_user_top_artists_12month(username=first_user)
        user2_12month = await fetch_user_top_artists_12month(username=second_user)

        # only picks at least top 5 artists on the past year,
        # this prevent resources exhaustion when requesting the API from lastfm
        shared_12month = [
            artist for artist in user1_12month if artist in user2_12month
        ][:5]

        user1_recent = await fetch_user_recent_tracks(username=first_user)
        user2_recent = await fetch_user_recent_tracks(username=second_user)

        user1_achievements = calculate_achievements(
            user_info=user1_info,
            top_artists_set=user1_top_set,
            recent_tracks=user1_recent,
        )
        user2_achievements = calculate_achievements(
            user_info=user2_info,
            top_artists_set=user2_top_set,
            recent_tracks=user2_recent,
        )

        user1_unlocked = set(
            a["name"]
            for a in user1_achievements
            if a["unlocked"] and a.get("type") == "lifetime"
        )
        user2_unlocked = set(
            a["name"]
            for a in user2_achievements
            if a["unlocked"] and a.get("type") == "lifetime"
        )

        shared = user1_unlocked & user2_unlocked
        total_unique = user1_unlocked | user2_unlocked

        if len(total_unique) == 0:
            compatibility_score = 0
        else:
            compatibility_score = round((len(shared) / len(total_unique)) * 100)

        # at the moment, the compatibility score is solely based on
        # how many achievements which are being unlocked/locked by particular users
        if compatibility_score >= 80:
            tagline = "You two are basically the same person."
        elif compatibility_score >= 60:
            tagline = "You two would survive a road trip, barely."
        elif compatibility_score >= 40:
            tagline = "Different worlds, same playlist."
        elif compatibility_score >= 20:
            tagline = "Your music tastes are... an interesting contrast."
        else:
            tagline = "You have nothing in common. At all."

        def _get_profile_image(user_info):
            image_list = user_info["user"].get("image", [])
            for image in image_list:
                if image.get("size") == "large":
                    return image["#text"]
            return ""

        def _get_top_3_artists(top_artists_raw):
            artists = top_artists_raw.get("topartists", {}).get("artist", [])
            result = []
            for artist in artists[:3]:
                result.append(
                    {"name": artist["name"], "playcount": int(artist["playcount"])}
                )
            return result

        def _get_top_artist(top_artists_response):
            if top_artists_response and top_artists_response.get("topartists", {}).get(
                "artist"
            ):
                return top_artists_response["topartists"]["artist"][0]["name"]
            return "Unknown"

        return {
            "compatibility_score": compatibility_score,
            "compatibility_tagline": tagline,
            "shared_artists": shared_12month,
            "user1": {
                "username": first_user,
                "profile_image": _get_profile_image(user1_info),
                "top_artist": _get_top_artist(user1_top_response),
                "total_scrobbles": int(user1_info["user"]["playcount"]),
                "top_3_artists": _get_top_3_artists(user1_top_artists_raw),
            },
            "user2": {
                "username": second_user,
                "profile_image": _get_profile_image(user2_info),
                "top_artist": _get_top_artist(user2_top_response),
                "total_scrobbles": int(user2_info["user"]["playcount"]),
                "top_3_artists": _get_top_3_artists(user2_top_artists_raw),
            },
        }
    except HTTPException:
        raise
    except Exception:
        logger.exception(
            f"Unexpected error while comparing users: {first_user} and {second_user}",
            extra={
                "endpoint": f"/compare/{first_user}/{second_user}",
                "user1": first_user,
                "user2": second_user,
            },
        )
        raise HTTPException(status_code=500, detail="Internal server error")


@app.post("/compare/roast")
async def compare_roast(data: dict = Body(...)):
    user1 = data.get("user1", "")
    user2 = data.get("user2", "")

    try:
        if not user1 or not user2:
            raise HTTPException(
                status_code=400, detail="Both first and second user are required"
            )

        user1_info = await fetch_user_information(username=user1)
        user2_info = await fetch_user_information(username=user2)

        account_age_1 = 0.0
        registered = user1_info.get("user", {}).get("registered", {})
        if "unixtime" in registered:
            joined = datetime.fromtimestamp(
                int(registered["unixtime"]), tz=timezone.utc
            )
            account_age_1 = (datetime.now(timezone.utc) - joined).days / 365.25

        account_age_2 = 0.0
        registered = user2_info.get("user", {}).get("registered", {})
        if "unixtime" in registered:
            joined = datetime.fromtimestamp(
                int(registered["unixtime"]), tz=timezone.utc
            )
            account_age_2 = (datetime.now(timezone.utc) - joined).days / 365.25

        ctx = {
            "user1": user1,
            "user2": user2,
            "compatibility_score": data.get("compatibility_score", 0),
            "shared_artists": data.get("shared_artists", []),
            "user1_top_artists": data.get("user1_top_artists", []),
            "user2_top_artists": data.get("user2_top_artists", []),
            "user1_scrobbles": data.get("user1_scrobbles", 0),
            "user2_scrobbles": data.get("user2_scrobbles", 0),
            "user1_account_age": account_age_1,
            "user2_account_age": account_age_2,
        }

        roast = await roast_joint_listener(ctx)

        return {"roast": roast}

    except HTTPException:
        raise
    except RoastNotConfiguredError:
        raise HTTPException(status_code=503, detail="Roast feature not configured")
    except RoastServiceUnavailableError:
        raise HTTPException(
            status_code=503, detail="Roast service unavailable, try again later"
        )
    except Exception:
        logger.exception(
            f"Unexpected error generating joint roast for: {user1} and {user2}",
            extra={
                "endpoint": "/compare/roast",
                "user1": user1,
                "user2": user2,
            },
        )
        raise HTTPException(status_code=500, detail="Internal server error")


# using absolute path is more reliable than relative one
BASE_DIR = Path(__file__).parent
FRONTEND_DIR = BASE_DIR.parent / "frontend"

if os.getenv("ENVIRONMENT") == "development":
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", reload=os.getenv("ENVIRONMENT") == "development")
