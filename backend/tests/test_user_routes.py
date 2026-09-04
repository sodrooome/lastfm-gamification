import pytest
from unittest.mock import AsyncMock, MagicMock, patch
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


def make_lastfm_response(status_code: int = 200, json_data=None) -> MagicMock:
    response = MagicMock()
    response.status_code = status_code
    response.json.return_value = json_data or {}
    return response


def make_achievements(names: list[str]) -> list[dict]:
    return [{"name": n, "unlocked": True, "type": "lifetime"} for n in names]


class TestUserRoutesEndpoint:
    @pytest.mark.asyncio
    async def test_health_check_returns_ok(self, client):
        async with client as cli:
            response = await cli.get("/health")

        assert response.status_code == 200
        assert response.json()["status"] == "ok"

    @pytest.mark.asyncio
    async def test_readiness_check_returns_ready(self, client):
        mock_response = make_lastfm_response(status_code=200, json_data={})
        mock_httpx_client = AsyncMock()
        mock_httpx_client.get.return_value = mock_response
        mock_httpx_client.__aenter__.return_value = mock_httpx_client
        mock_httpx_client.__aexit__.return_value = False

        with patch("main.httpx.AsyncClient", return_value=mock_httpx_client):
            async with client as cli:
                response = await cli.get("/ready")

        resp_body = response.json()
        assert response.status_code == 200
        assert resp_body["status"] == "ready"
        assert resp_body["checks"]["lastfm_api"] is True

    @pytest.mark.asyncio
    async def test_readiness_check_returns_not_ready_on_upstream_failure(self, client):
        mock_response = make_lastfm_response(status_code=500)
        mock_httpx_client = AsyncMock()
        mock_httpx_client.get.return_value = mock_response
        mock_httpx_client.__aenter__.return_value = mock_httpx_client
        mock_httpx_client.__aexit__.return_value = False

        with patch("main.httpx.AsyncClient", return_value=mock_httpx_client):
            async with client as cli:
                response = await cli.get("/ready")

        assert response.status_code == 503
        assert response.json()["detail"]["checks"]["lastfm_api"] is False

    @pytest.mark.asyncio
    async def test_roast_user_not_found_returns_404(self, client):
        with patch(
            "main.fetch_user_information", new=AsyncMock(return_value={"error": 6})
        ):
            async with client as cli:
                response = await cli.get("/roast/ghost", params={"consent": True})

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_roast_unexpected_exception_returns_500(self, client):
        with patch(
            "main.fetch_user_information",
            new=AsyncMock(side_effect=RuntimeError("boom")),
        ):
            async with client as cli:
                response = await cli.get("/roast/testuser", params={"consent": True})

        assert response.status_code == 500
        assert response.json()["detail"] == "Internal server error"

    @pytest.mark.asyncio
    async def test_compare_second_user_not_found_returns_404(self, client):
        with patch(
            "main.fetch_user_information",
            new=AsyncMock(side_effect=[make_user_information(), {"error": 6}]),
        ):
            async with client as cli:
                response = await cli.get("/compare/ryan/ghost")

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_compare_unexpected_exception_returns_500(self, client):
        with patch(
            "main.fetch_user_information",
            new=AsyncMock(side_effect=RuntimeError("boom")),
        ):
            async with client as cli:
                response = await cli.get("/compare/ryan/nayr")

        assert response.status_code == 500
        assert response.json()["detail"] == "Internal server error"

    @pytest.mark.asyncio
    async def test_compare_roast_unexpected_exception_returns_500(self, client):
        with patch(
            "main.fetch_user_information",
            new=AsyncMock(side_effect=RuntimeError("boom")),
        ):
            async with client as cli:
                response = await cli.post(
                    "/compare/roast", json={"user1": "ryan", "user2": "nayr"}
                )

        assert response.status_code == 500
        assert response.json()["detail"] == "Internal server error"

    @pytest.mark.asyncio
    @pytest.mark.parametrize(
        "user1_names,user2_names,expected_tagline",
        [
            (["A", "B"], ["A", "B"], "You two are basically the same person."),
            (
                ["A", "B", "C"],
                ["A", "B"],
                "You two would survive a road trip, barely.",
            ),
            (["A"], ["A", "B"], "Different worlds, same playlist."),
            (
                ["A"],
                ["A", "B", "C", "D"],
                "Your music tastes are... an interesting contrast.",
            ),
            (
                ["A"],
                [f"B{i}" for i in range(9)] + ["A"],
                "You have nothing in common. At all.",
            ),
        ],
    )
    async def test_compare_tagline_buckets(
        self, client, user1_names, user2_names, expected_tagline
    ):
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
                make_achievements(user1_names),
                make_achievements(user2_names),
            ],
        ):

            async with client as cli:
                response = await cli.get("/compare/ryan/nayr")

        assert response.json()["compatibility_tagline"] == expected_tagline

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
            "main.get_or_cache_roast",
            new=AsyncMock(return_value=("You all need a new music", False)),
        ), patch(
            "main.get_remaining_roasts", return_value=2
        ):

            async with client as cli:
                response = await cli.post(
                    "/compare/roast",
                    json={"user1": "ryan", "user2": "nayr", "compatibility_score": 42},
                )

        resp_body = response.json()
        assert response.status_code == 200
        assert resp_body["roast"] == "You all need a new music"
        assert resp_body["cached"] is False
        assert resp_body["remaining"] == 2

    @pytest.mark.asyncio
    async def test_joint_roast_limit_exceeding_error_returns_429(self, client):
        with patch(
            "main.fetch_user_information",
            new=AsyncMock(
                side_effect=[make_user_information(), make_user_information()]
            ),
        ), patch(
            "main.get_or_cache_roast",
            new=AsyncMock(side_effect=RoastLimitExceededError()),
        ):

            async with client as cli:
                response = await cli.post(
                    "/compare/roast",
                    json={"user1": "ryan", "user2": "nayr"},
                )

        assert response.status_code == 429

    @pytest.mark.asyncio
    async def test_joint_roast_key_is_order_independent(self, client):
        mock_get_or_cache_roast = AsyncMock(return_value=("roast text", False))
        with patch(
            "main.fetch_user_information",
            new=AsyncMock(return_value=make_user_information()),
        ), patch("main.get_or_cache_roast", new=mock_get_or_cache_roast), patch(
            "main.get_remaining_roasts", return_value=2
        ):

            async with client as cli:
                await cli.post(
                    "/compare/roast", json={"user1": "ryan", "user2": "nayr"}
                )
                await cli.post(
                    "/compare/roast", json={"user1": "nayr", "user2": "ryan"}
                )

        first_key = mock_get_or_cache_roast.call_args_list[0].args[0]
        second_key = mock_get_or_cache_roast.call_args_list[1].args[0]
        assert first_key == second_key == "joint:nayr|ryan"

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
