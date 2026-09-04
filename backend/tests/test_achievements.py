"""
Unit tests for under-the-hood logic of achievements.py
"""

import pytest
from datetime import datetime, timezone, timedelta
from typing import Any
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
    user: dict[str, Any] = {
        "playcount": str(playcount),
        "name": name,
        "country": country,
    }

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

    def test_100_scrobbles_same_day_unlocks_having_fun_with_yourself(self):
        # Regression: with a too-small fetch limit, a user who scrobbled
        # 100+ tracks today could never have all of them show up in
        # recent_tracks, so this achievement could never unlock.
        now = datetime.now(timezone.utc)
        tracks = [{"date": {"uts": str(int(now.timestamp()) - i)}} for i in range(150)]
        recent_tracks = {"recenttracks": {"track": tracks}}
        result = calculate_daily_achievements(recent_tracks)
        unlocked = {a["name"]: a["unlocked"] for a in result}
        assert unlocked["Having Fun with Yourself?"] is True

    def test_no_registered_date_returned_zero(self):
        user_information = make_user_information(playcount=1000)
        assert _compute_avg_listen(user_information, 1000) == 0.0

    def test_ten_year_account_unlocks_spotify_achievement(self):
        # +1 day buffer: unixtime_years_ago(10) truncates to 3652 days, just
        # under the 3652.5-day (365.25 * 10) threshold the code checks against.
        joined_datetime = datetime.now(timezone.utc) - timedelta(days=3653)
        user_information = make_user_information(
            playcount=0, registered_unixtime=int(joined_datetime.timestamp())
        )
        result = calculate_achievements(user_information, set(), {})
        unlocked = {a["name"]: a["unlocked"] for a in result}
        assert unlocked["Spotify Wasn't Even Born Yet"] is True

    def test_under_ten_year_account_does_not_unlock_spotify_achievement(self):
        user_information = make_user_information(
            playcount=0, registered_unixtime=unixtime_years_ago(5)
        )
        result = calculate_achievements(user_information, set(), {})
        unlocked = {a["name"]: a["unlocked"] for a in result}
        assert unlocked["Spotify Wasn't Even Born Yet"] is False

    def test_1000_scrobbles_same_day_unlocks_take_a_break(self):
        now = datetime.now(timezone.utc)
        tracks = [{"date": {"uts": str(int(now.timestamp()) - i)}} for i in range(1000)]
        recent_tracks = {"recenttracks": {"track": tracks}}
        result = calculate_daily_achievements(recent_tracks)
        unlocked = {a["name"]: a["unlocked"] for a in result}
        assert unlocked["How about Take a Break"] is True

    def test_average_listen_computes_real_division(self):
        joined_datetime = datetime.now(timezone.utc) - timedelta(days=100)
        user_information = make_user_information(
            playcount=3650, registered_unixtime=int(joined_datetime.timestamp())
        )
        result = _compute_avg_listen(user_information, 3650)
        assert result == round(3650 / 100, 2)

    def test_xp_thresholds_at_max_xp(self):
        user_information = make_user_information(playcount=10_000_000)
        top_artist = {f"artist_{i}" for i in range(5000)}
        achievements = calculate_achievements(user_information, top_artist, {})
        result = calculate_xp(user_information, achievements, top_artist)
        assert result["current_xp"] == MAX_XP
        assert result["progress_pct"] == 100.0
