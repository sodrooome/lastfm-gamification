from datetime import datetime


ALL_ACHIEVEMENTS = [
    "Welcome to the Club, Folks!",
    "A New Journey Ahead",
    "Obsessive Listener, Huh",
    "Even AI Can't Stop Me",
    "No Life? Pure Life",
    "Your Loved Ones",
    "Explorer",
    "How About Touch Some Grass?",
    "Are You an Elitist or Identity Crisis?",
    "LGTM",
    "Spotify Wasn't Even Born Yet",
    "The Completion",
]

LEVEL_THRESHOLDS = [0, 110, 275, 500, 775, 1100, 1450, 1800, 2150, 2585]
MAX_XP = 2585


def calculate_achievements(user_info, top_artists_set, recent_tracks):
    achievements = []
    unlocked = set()
    get_total_scrobbles = int(user_info["user"]["playcount"])

    if get_total_scrobbles >= 1:
        unlocked.add("Welcome to the Club, Folks!")

    if get_total_scrobbles >= 1000:
        unlocked.add("A New Journey Ahead")

    if get_total_scrobbles >= 10000:
        unlocked.add("Obsessive Listener, Huh")

    if get_total_scrobbles >= 100000:
        unlocked.add("Even AI Can't Stop Me")

    if get_total_scrobbles >= 1000000:
        unlocked.add("No Life? Pure Life")

    if len(top_artists_set) >= 1:
        unlocked.add("Your Loved Ones")

    if len(top_artists_set) >= 100:
        unlocked.add("Explorer")

    if len(top_artists_set) >= 1000:
        unlocked.add("How About Touch Some Grass?")

    if len(top_artists_set) >= 5000:
        unlocked.add("Are You an Elitist or Identity Crisis?")

    if len(top_artists_set) >= 10000:
        unlocked.add("LGTM")

    registered = user_info["user"].get("registered", {})
    unixtime = registered.get("unixtime")
    if unixtime:
        account_age_years = (datetime.now() - datetime.fromtimestamp(int(unixtime))).days / 365.25
        if account_age_years >= 10:
            unlocked.add("Spotify Wasn't Even Born Yet")

    name = user_info["user"].get("name", "").strip()
    country = user_info["user"].get("country", "").strip()
    has_image = any(img.get("#text", "").strip() for img in user_info["user"].get("image", []))
    if name and country and has_image:
        unlocked.add("The Completion")

    for a_name in ALL_ACHIEVEMENTS:
        achievements.append({
            "name": a_name,
            "unlocked": a_name in unlocked,
        })

    return achievements


def _scrobbles_xp(playcount):
    tiers = [
        (1, 5),
        (100, 20),
        (1000, 40),
        (10000, 80),
        (100000, 180),
        (1000000, 460),
    ]
    xp = 0
    for threshold, value in tiers:
        if playcount >= threshold:
            xp += value
    return xp


def _artists_xp(unique_artists):
    tiers = [
        (50, 30),
        (100, 60),
        (500, 90),
        (1000, 120),
    ]
    xp = 0
    for threshold, value in tiers:
        if unique_artists >= threshold:
            xp += value
    return xp


def calculate_level(achievements):
    experience_lvl = len(achievements) * 10
    return experience_lvl // 20 + 1


def calculate_xp(user_info, achievements, top_artists_set):
    playcount = int(user_info["user"]["playcount"])
    unique_artists = len(top_artists_set)

    unlocked_count = sum(1 for a in achievements if a["unlocked"])
    scrobbles_xp = _scrobbles_xp(playcount)
    achievements_xp = unlocked_count * 150
    artists_xp = _artists_xp(unique_artists)

    total_xp = scrobbles_xp + achievements_xp + artists_xp
    total_xp = min(total_xp, MAX_XP)

    level = 1
    for i, threshold in enumerate(LEVEL_THRESHOLDS):
        if total_xp >= threshold:
            level = i + 1

    return {
        "level": level,
        "current_xp": total_xp,
        "max_xp": MAX_XP,
        "progress_pct": round((total_xp / MAX_XP) * 100, 1) if MAX_XP > 0 else 0,
    }