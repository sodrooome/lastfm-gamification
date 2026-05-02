import uvicorn
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from achievements import calculate_achievements, calculate_xp, calculate_daily_achievements
from lastfm import fetch_user_information, fetch_user_recent_tracks, fetch_user_top_artists, fetch_user_all_top_artists


app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


@app.get("/user/{username}")
async def get_user_profile(username: str):
    try:
        user_info = await fetch_user_information(username=username)

        if "error" in user_info and user_info["error"] == 6:
            raise HTTPException(status_code=404, detail="The requested user does not exist")

        top_artists_set, top_artists_response = await fetch_user_all_top_artists(username=username)
        recent_tracks = await fetch_user_recent_tracks(username=username)

        total_scrobbles = int(user_info["user"]["playcount"])
        get_top_artist = top_artists_response["topartists"]["artist"][0]["name"] if top_artists_response and top_artists_response["topartists"]["artist"] else "Unknown"

        lifetime_achievements = calculate_achievements(user_info=user_info, top_artists_set=top_artists_set, recent_tracks=recent_tracks)
        xp_data = calculate_xp(user_info=user_info, achievements=lifetime_achievements, top_artists_set=top_artists_set)

        daily_achievements = calculate_daily_achievements(recent_tracks=recent_tracks)

        achievements = lifetime_achievements + daily_achievements

        image_list = user_info["user"].get("image", [])
        print(image_list)
        profile_image = ""

        for image in image_list:
            if image.get("size") == "large":
                profile_image = image["#text"]
                break

        registered = user_info["user"].get("registered", {})
        joined_date = ""

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
            "joined_date": joined_date
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
# using absolute path is more reliable than relative one
BASE_DIR = Path(__file__).parent
FRONTEND_DIR = BASE_DIR.parent / "frontend"
app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")

if __name__ == "__main__":
    uvicorn.run(app, host='0.0.0.0', reload=True)