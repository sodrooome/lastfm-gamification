import pytest
from unittest.mock import AsyncMock, patch
from httpx import AsyncClient, ASGITransport
from main import app, RoastNotConfiguredError, RoastLimitExceededError


@pytest.fixture
def client() -> AsyncClient:
    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url="http://test")


def make_user_information(
    playcount: int = 1000, country: str = "Indonesia", registered_unixtime="1600000000"
) -> dict:
    return {
        "user": {
            "playcount": playcount,
            "country": country,
            "image": [
                {"size": "small", "#text": "small.jpg"},
                {"size": "large", "#text": "large.jpg"},
            ],
            "registered": {"unxtime": registered_unixtime},
        }
    }


def make_recent_tracks(is_now_playing: bool = False, uts="1690000000") -> dict:
    track = (
        {"date": {"uts": uts}} if is_now_playing else {"@attr": {"nowplaying": "true"}}
    )
    return {"recenttracks": {"track": [track]}}


TOP_ARTISTS_RESPONSE = {
    "topartists": {"artist": [{"name": "The Radio Dept", "playcount": "500"}]}
}


class TestUserRoutesEndpoint:
    @pytest.mark.asyncio
    async def test_positive_scenario_returns_expected_response(self, client):
        with patch(
            "main.fetch_user_information",
            new=AsyncMock(return_value=make_user_information()),
        ), patch(
            "main.fetch_user_all_top_artists",
            new=AsyncMock(return_value=({"The Radio Dept"}, TOP_ARTISTS_RESPONSE)),
        ):

            async with client as cli:
                response = await cli.get("/user/testuser")

        response_body = response.json()
        assert response.status_code == 200
        assert response_body["username"] == "testuser"
        assert response_body["top_artist"] == "The Radio Dept"
        assert response_body["total_scrobbles"] == 1000

    @pytest.mark.asyncio
    async def test_user_not_found_returns_404(self, client):
        with patch(
            "main.fetch_user_information", new=AsyncMock(return_value=({"error": 6}))
        ):
            async with client as cli:
                response = await cli.get("/user/ghost")

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_user_missing_roast_consent(self, client):
        async with client as cli:
            response = await cli.get("/roast/testuser")
        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_positive_scenario_for_roast_user_expected_response(self, client):
        with patch(
            "main.fetch_user_information",
            new=AsyncMock(return_value=make_user_information()),
        ), patch(
            "main.fetch_user_all_top_artists",
            new=AsyncMock(return_value=({"The Radio Dept"}, TOP_ARTISTS_RESPONSE)),
        ), patch(
            "main.calculate_achievements",
            return_value=[{"name": "Night Owl", "unlocked": True, "type": "lifetime"}],
        ), patch(
            "main.get_or_cache_roast",
            new=AsyncMock(return_value=("You listen too much", False)),
        ), patch(
            "main.get_remaining_roasts", return_value=2
        ):

            async with client as cli:
                response = await cli.get("/roast/testuser", params={"consent": True})

        resp_body = response.json()
        assert response.status_code == 200
        assert resp_body["roast"] == "You listen too much"
        assert resp_body["cached"] is False
        assert resp_body["remaining"] == 2

    @pytest.mark.asyncio
    async def test_no_shared_achievements_gives_zero_score(self, client):
        with patch(
            "main.fetch_user_information",
            new=AsyncMock(
                side_effect=[make_user_information(), make_user_information()]
            ),
        ), patch(
            "main.fetch_user_all_top_artists",
            new=AsyncMock(return_value=(set(), TOP_ARTISTS_RESPONSE)),
        ), patch(
            "main.fetch_user_top_artists",
            new=AsyncMock(return_value=TOP_ARTISTS_RESPONSE),
        ), patch(
            "main.fetch_user_top_artists_12month",
            new=AsyncMock(side_effect=[["A", "B"], ["C", "D"]]),
        ), patch(
            "main.calculate_achievements",
            side_effect=[
                [{"name": "X", "unlocked": True, "type": "lifetime"}],
                [{"name": "Y", "unlocked": True, "type": "lifetime"}],
            ],
        ):

            async with client as cli:
                response = await cli.get("/compare/ryan/nayr")

        resp_body = response.json()
        assert response.status_code == 200
        assert resp_body["compatibility_score"] == 0

    @pytest.mark.asyncio
    async def test_positive_scenario_for_joint_roast(self, client):
        with patch(
            "main.fetch_user_information",
            new=AsyncMock(
                side_effect=[make_user_information(), make_user_information()]
            ),
        ), patch(
            "main.roast_joint_listener",
            new=AsyncMock(return_value="You all need a new music"),
        ):

            async with client as cli:
                response = await cli.post(
                    "/compare/roast",
                    json={"user1": "ryan", "user2": "nayr", "compatibility_score": 42},
                )

        assert response.status_code == 200
        assert response.json()["roast"] == "You all need a new music"

    @pytest.mark.asyncio
    async def test_roast_not_configured_returns_503(self, client):
        with patch(
            "main.fetch_user_information",
            new=AsyncMock(return_value=make_user_information()),
        ), patch(
            "main.fetch_user_all_top_artists", new=AsyncMock(return_value=(set(), None))
        ), patch(
            "main.fetch_user_recent_tracks",
            new=AsyncMock(return_value=make_recent_tracks()),
        ), patch(
            "main.calculate_achievements", return_value=[]
        ), patch(
            "main.get_or_cache_roast",
            new=AsyncMock(side_effect=RoastNotConfiguredError()),
        ), patch(
            "main.fetch_user_friends", new=AsyncMock(return_value={})
        ):

            async with client as cli:
                response = await cli.get("/roast/testuser", params={"consent": True})

        assert response.status_code == 503

    @pytest.mark.asyncio
    async def test_roast_limit_exceeding_error_returns_429(self, client):
        with patch(
            "main.fetch_user_information",
            new=AsyncMock(return_value=make_user_information()),
        ), patch(
            "main.fetch_user_all_top_artists", new=AsyncMock(return_value=(set(), None))
        ), patch(
            "main.fetch_user_recent_tracks",
            new=AsyncMock(return_value=make_recent_tracks()),
        ), patch(
            "main.fetch_user_friends", new=AsyncMock(return_value={})
        ), patch(
            "main.calculate_achievements", return_value=[]
        ), patch(
            "main.get_or_cache_roast",
            new=AsyncMock(side_effect=RoastLimitExceededError()),
        ):

            async with client as cli:
                response = await cli.get("/roast/testuser", params={"consent": True})

        assert response.status_code == 429

    @pytest.mark.asyncio
    async def test_unexpected_exception_occurs_return_500(self, client):
        with patch(
            "main.fetch_user_information",
            new=AsyncMock(side_effect=RuntimeError("boom")),
        ):
            async with client as cli:
                response = await client.get("/user/testuser")

        assert response.status_code == 500
        assert response.json()["detail"] == "Internal server error"
