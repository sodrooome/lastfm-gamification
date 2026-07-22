"""
Unit tests for under-the-hood logic of achievements.py
"""

import pytest
from datetime import datetime, timezone, timedelta
from achievements import (
    calculate_achievements,
    calculate_xp,
    ALL_ACHIEVEMENTS,
    get_scrobbles_by_day,
    calculate_level,
    calculate_daily_achievements,
    DAILY_ACHIEVEMENTS,
    _compute_avg_listen,
    MAX_XP,
)


# fixtures and helpers
def make_user_information(
    playcount: int = 0,
    name: str = "testuser",
    country: str = "Indonesia",
    has_image: bool = True,
    registered_unixtime=None,
) -> dict:
    """Builds minimal Lastfm user information as part of request payload"""
    user = {"playcount": str(playcount), "name": name, "country": country}

    if has_image:
        user["image"] = [{"size": "large", "#text": "http://example.com/img.png"}]
    else:
        user["image"] = [{"size": "large", "#text": ""}]

    if registered_unixtime is not None:
        user["registered"] = {"unixtime": str(registered_unixtime)}

    return {"user": user}


def unixtime_years_ago(years) -> int:
    _datetime = datetime.now(timezone.utc) - timedelta(days=int(years * 365.25))
    return int(_datetime.timestamp())


def make_tracks(uts=None, now_playing: bool = False) -> dict:
    if now_playing:
        return {"@attr": {"nowplaying": "true"}}
    return {"date": {"uts": str(uts)}}


class TestCalculateAchievements:
    def test_return_all_achievements_name(self):
        user_information = make_user_information(playcount=0)
        result = calculate_achievements(user_information, set(), {})
        names = [achievement["name"] for achievement in result]
        assert names == ALL_ACHIEVEMENTS
        assert all(achievement["type"] == "lifetime" for achievement in result)

    def test_zero_everything_gives_xp(self):
        user_information = make_user_information(playcount=0, name="", has_image=False)
        achievements = calculate_achievements(user_information, set(), {})
        result = calculate_xp(user_information, achievements, set())
        assert result["current_xp"] == 0
        assert result["level"] == 1
        assert result["progress_pct"] == 0.0

    def test_empty_recent_tracks_returns_empty(self):
        assert get_scrobbles_by_day({}) == {}
        assert get_scrobbles_by_day({"recenttracks": {}}) == {}

    def test_more_achievements_gives_higher_levels(self):
        few_achievements = [{"name": "a", "unlocked": True}]
        many_achievements = [{"name": f"a{i}", "unlocked": True} for i in range(10)]
        assert calculate_level(many_achievements) >= calculate_level(few_achievements)

    @pytest.mark.parametrize(
        "artist_count,expected_unlocked,expected_locked",
        [
            (1, "Your Loved Ones", "Explorer"),
            (100, "Explorer", "How About Touch Some Grass?"),
            (
                1000,
                "How About Touch Some Grass?",
                "Are You an Elitist or Identity Crisis?",
            ),
            (5000, "Are You an Elitist or Identity Crisis?", "LGTM"),
            (10000, "LGTM", None),
        ],
    )
    def test_top_artists_threshold(
        self, artist_count, expected_unlocked, expected_locked
    ):
        user_information = make_user_information(playcount=0)
        top_artist = {f"artist_{i}" for i in range(artist_count)}
        result = calculate_achievements(user_information, top_artist, {})
        locked = {a["name"]: a["unlocked"] for a in result}
        assert locked[expected_unlocked] is True
        if expected_locked:
            assert locked[expected_locked] is False

    def test_zero_scrobbles_unlocks_nothing(self):
        recent_tracks = {"recenttracks": {"track": []}}
        result = calculate_daily_achievements(recent_tracks)
        assert all(a["unlocked"] is False for a in result)
        names = [a["name"] for a in result]
        assert names == DAILY_ACHIEVEMENTS

    def test_no_registered_date_returned_zero(self):
        user_information = make_user_information(playcount=1000)
        assert _compute_avg_listen(user_information, 1000) == 0.0

    def test_xp_thresholds_at_max_xp(self):
        user_information = make_user_information(playcount=10_000_000)
        top_artist = {f"artist_{i}" for i in range(5000)}
        achievements = calculate_achievements(user_information, top_artist, {})
        result = calculate_xp(user_information, achievements, top_artist)
        assert result["current_xp"] == MAX_XP
        assert result["progress_pct"] == 100.0
