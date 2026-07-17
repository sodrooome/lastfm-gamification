import uvicorn
import os
import logging
import httpx
from config import LASTFM_API_KEY, LASTFM_BASE_URL
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from achievements import (
    calculate_achievements,
    calculate_xp,
    calculate_daily_achievements,
)
from lastfm import (
    fetch_user_information,
    fetch_user_recent_tracks,
    fetch_user_all_top_artists,
    fetch_user_friends,
)
from datetime import datetime, timezone

origins = ["https://sodrooome.github.io"]

if os.getenv("ENVIRONMENT") == "development":
    # extend allowed origins (just in case)
    origins.extend(["http://localhost:8000", "http://127.0.0.1:8000"])

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET"],
    allow_headers=["*"],
)

# basic internal logging setup, can be expanded later
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
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
    first_checks = {"lastfm_api": False}
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
                first_checks["lastfm_api"] = (
                    f"Unexpected status code: {response.status_code}"
                )
    except Exception as e:
        first_checks["lastfm_api"] = str(e)

    all_ready = all(first_checks.values())

    payload = {
        "status": "ready" if all_ready else "not ready",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "checks": first_checks,
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
        }
    except HTTPException:
        raise
    except Exception:
        logger.exception(f"Unexpected error while processing username for: {username}")
        raise HTTPException(status_code=500, detail="Internal server error")


# using absolute path is more reliable than relative one
BASE_DIR = Path(__file__).parent
FRONTEND_DIR = BASE_DIR.parent / "frontend"

if os.getenv("ENVIRONMENT") == "development":
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", reload=os.getenv("ENVIRONMENT") == "development")
