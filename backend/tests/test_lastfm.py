"""
Unit tests for the Last.fm API client wrappers in lastfm.py.
"""

import pytest
import lastfm
from unittest.mock import AsyncMock, patch


def make_response(json_data, status_code=200):
    response = AsyncMock()
    response.status_code = status_code
    response.json = lambda: json_data
    return response


def make_client(get_return=None, get_side_effect=None):
    """Builds a mock httpx.AsyncClient whose .get() is awaitable and either
    returns a fixed response or dispatches via a side_effect callable."""
    mock_client = AsyncMock()
    if get_side_effect is not None:
        mock_client.get.side_effect = get_side_effect
    else:
        mock_client.get.return_value = get_return
    mock_client.__aenter__.return_value = mock_client
    mock_client.__aexit__.return_value = False
    return mock_client


@pytest.mark.asyncio
async def test_recent_tracks_requests_at_least_100():
    mock_client = make_client(make_response({"recenttracks": {"track": []}}))

    with patch.object(lastfm.httpx, "AsyncClient", return_value=mock_client):
        await lastfm.fetch_user_recent_tracks(username="ryafeb")

    _, kwargs = mock_client.get.call_args
    assert kwargs["params"]["limit"] >= 100


@pytest.mark.asyncio
async def test_recent_tracks_returns_none_on_non_200():
    mock_client = make_client(make_response({}, status_code=403))

    with patch.object(lastfm.httpx, "AsyncClient", return_value=mock_client):
        result = await lastfm.fetch_user_recent_tracks(username="ryafeb")

    assert result is None


@pytest.mark.asyncio
async def test_recent_tracks_returns_none_on_error_payload():
    mock_client = make_client(make_response({"error": 6, "message": "not found"}))

    with patch.object(lastfm.httpx, "AsyncClient", return_value=mock_client):
        result = await lastfm.fetch_user_recent_tracks(username="ryafeb")

    assert result is None


@pytest.mark.asyncio
async def test_fetch_user_information_returns_raw_json():
    payload = {"user": {"name": "ryafeb", "playcount": "1234"}}
    mock_client = make_client(make_response(payload))

    with patch.object(lastfm.httpx, "AsyncClient", return_value=mock_client):
        result = await lastfm.fetch_user_information(username="ryafeb")

    assert result == payload
    _, kwargs = mock_client.get.call_args
    assert kwargs["params"]["method"] == "user.getinfo"
    assert kwargs["params"]["user"] == "ryafeb"


@pytest.mark.asyncio
async def test_fetch_user_top_artists_uses_period_and_limit_5():
    mock_client = make_client(make_response({"topartists": {"artist": []}}))

    with patch.object(lastfm.httpx, "AsyncClient", return_value=mock_client):
        await lastfm.fetch_user_top_artists(username="ryafeb", period="7day")

    _, kwargs = mock_client.get.call_args
    assert kwargs["params"]["period"] == "7day"
    assert kwargs["params"]["limit"] == 5


@pytest.mark.asyncio
async def test_fetch_user_top_artists_12month_returns_artist_names():
    payload = {
        "topartists": {
            "artist": [{"name": "DAY6"}, {"name": "IU"}],
        }
    }
    mock_client = make_client(make_response(payload))

    with patch.object(lastfm.httpx, "AsyncClient", return_value=mock_client):
        result = await lastfm.fetch_user_top_artists_12month(username="ryafeb")

    assert result == ["DAY6", "IU"]


@pytest.mark.asyncio
async def test_fetch_user_top_artists_12month_handles_missing_artists():
    mock_client = make_client(make_response({"topartists": {}}))

    with patch.object(lastfm.httpx, "AsyncClient", return_value=mock_client):
        result = await lastfm.fetch_user_top_artists_12month(username="ryafeb")

    assert result == []


@pytest.mark.asyncio
async def test_fetch_user_friends_returns_raw_json():
    payload = {"friends": {"@attr": {"total": "3"}}}
    mock_client = make_client(make_response(payload))

    with patch.object(lastfm.httpx, "AsyncClient", return_value=mock_client):
        result = await lastfm.fetch_user_friends(username="ryafeb")

    assert result == payload


@pytest.mark.asyncio
async def test_fetch_user_all_top_artists_paginates_until_limit_reached():
    page1 = {"topartists": {"artist": [{"name": "a1"}, {"name": "a2"}]}}
    page2 = {"topartists": {"artist": [{"name": "a3"}, {"name": "a4"}]}}

    def dispatch(*args, **kwargs):
        page = kwargs["params"]["page"]
        return make_response(page1 if page == 1 else page2)

    mock_client = make_client(get_side_effect=dispatch)

    with patch.object(lastfm.httpx, "AsyncClient", return_value=mock_client):
        artists, first_page_data = await lastfm.fetch_user_all_top_artists(
            username="ryafeb", limit=3
        )

    assert artists == {"a1", "a2", "a3", "a4"}
    assert first_page_data == page1
    assert mock_client.get.call_count == 2


@pytest.mark.asyncio
async def test_fetch_user_all_top_artists_stops_on_empty_page():
    mock_client = make_client(make_response({"topartists": {"artist": []}}))

    with patch.object(lastfm.httpx, "AsyncClient", return_value=mock_client):
        artists, first_page_data = await lastfm.fetch_user_all_top_artists(
            username="ryafeb", limit=100
        )

    assert artists == set()
    assert first_page_data == {"topartists": {"artist": []}}
    assert mock_client.get.call_count == 1


@pytest.mark.asyncio
async def test_fetch_user_all_top_artists_dedupes_repeated_names():
    page = {"topartists": {"artist": [{"name": "a1"}, {"name": "a1"}]}}
    mock_client = make_client(get_side_effect=lambda *a, **kw: make_response(page))

    with patch.object(lastfm.httpx, "AsyncClient", return_value=mock_client):
        artists, _ = await lastfm.fetch_user_all_top_artists(username="ryafeb", limit=1)

    assert artists == {"a1"}
    assert mock_client.get.call_count == 1
