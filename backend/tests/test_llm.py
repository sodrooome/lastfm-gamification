"""
Unit tests for LLM integration alongside with their rules/logic
"""

import httpx
import pytest
import llm
from exceptions import (
    RoastLimitExceededError,
    RoastNotConfiguredError,
    RoastServiceUnavailableError,
)
from unittest.mock import AsyncMock, patch, MagicMock


@pytest.fixture(autouse=True)
def reset_roast_state():
    """Fixture to clear the roast cached state before every tests"""
    llm._ROAST_CACHE.clear()
    llm._ROAST_COUNTS.clear()
    yield
    llm._ROAST_CACHE.clear()
    llm._ROAST_COUNTS.clear()


@pytest.fixture(autouse=True)
def ensure_llm_api_key_configured(monkeypatch):
    """LLM_API_KEY normally comes from an environment variable, which
    may be not set in CI. Force a deterministic value for every test so tests
    don't depend on the runner's environment. The one test that specifically
    covers the 'not configured' path overrides this itself"""
    monkeypatch.setattr(llm.config, "LLM_API_KEY", "test-key-for-tests")


def make_response(
    status_code: int = 200, json_data=None, json_error: bool = False
) -> MagicMock:
    """Builds a minimal fake LLM response"""
    response = MagicMock()
    response.status_code = status_code
    if json_error:
        response.json.side_effect = ValueError("not JSON object")
    else:
        response.json.return_value = json_data or {}
    return response


def make_llm_success_payload(content="You've scrobbled your whole life away") -> dict:
    return {"choices": [{"message": {"content": content}}]}


class TestLLM:
    def test_includes_only_present_keys(self):
        context = {"username": "ryanfeb", "total_scrobbles": 9000}
        prompt = llm._format_user_prompt(context)
        assert "User: ryanfeb" in prompt
        assert "Total scrobbles: 9000" in prompt
        assert "Total albums" not in prompt

    def test_blank_line_is_reasoning(self):
        assert llm._is_reasoning_line("") is False
        assert llm._is_reasoning_line(" ") is False

    @pytest.mark.parametrize(
        "line",
        [
            "We need to write something short.",
            "Let's craft a roast about scrobbles.",
            "Count characters to stay under 300.",
            "Example: something witty here.",
            "I need to keep this under 300 chars.",
            "Step 1: figure out the tone",
            "Note: keep it lighthearted",
        ],
    )
    def test_known_reasoning_are_detected(self, line):
        assert llm._is_reasoning_line(line) is True

    def test_normal_roast_sentences_not_flagged(self):
        line = "10,000 plays of one artist? Are you deaf or what"
        assert line.count("?") == 1
        assert llm._is_reasoning_line(line) is False

    @pytest.mark.asyncio
    async def test_first_call_hits_llm(self):
        with patch.object(
            llm, "roast_listener", new=AsyncMock(return_value="Roast #1")
        ):
            roast, get_cached = await llm.get_or_cache_roast("ryanfeb", lambda: {})

        assert roast == "Roast #1"
        assert get_cached is False

        # remaining attempts before get cached
        assert llm.get_remaining_roasts("ryanfeb") == 2

    @pytest.mark.asyncio
    async def test_limit_exceeded_with_no_cache_raises(self):
        # simulate count already hit the limit, but cache is still empty
        llm._ROAST_COUNTS["ryafeb"] = llm.ROAST_LIMIT_PER_USER
        with pytest.raises(RoastLimitExceededError):
            await llm.get_or_cache_roast("ryafeb", lambda: {})

    @pytest.mark.asyncio
    async def test_unexpected_response_raises_service_unavaible(self):
        mock_response = make_response(status_code=200, json_error=True)
        mock_client = AsyncMock()
        mock_client.post.return_value = mock_response
        mock_client.__aenter__.return_value = mock_client
        mock_client.__aexit__.return_value = False

        with patch.object(llm.httpx, "AsyncClient", return_value=mock_client):
            with pytest.raises(RoastServiceUnavailableError):
                await llm.roast_listener({"username": "ryanfeb"})

    @pytest.mark.asyncio
    async def test_raises_not_configured_llm_api_key(self):
        with patch.object(llm.config, "LLM_API_KEY", ""):
            with pytest.raises(RoastNotConfiguredError):
                await llm.roast_listener({"username": "ryanfeb"})

    def test_known_prefixed_is_removed(self):
        line = "Here's the roast: You clearly have no other hobbies"
        result = llm._strip_reasoning_prefix(line)
        assert result == "You clearly have no other hobbies"

    def test_strips_leading_reasoning_line(self):
        text = "We need to write a roast.\nYour music taste peaked in 2014 and stayed there."
        result = llm._clean_roast_output(raw_text=text)
        assert "We need to" not in result

    def test_new_user_has_full_roast(self):
        assert llm.get_remaining_roasts("new_user") == llm.ROAST_LIMIT_PER_USER

    @pytest.mark.asyncio
    async def test_httpx_transport_error_raises(self):
        mock_client = AsyncMock()
        mock_client.post.side_effect = httpx.ConnectTimeout("timed out")
        mock_client.__aenter__.return_value = mock_client
        mock_client.__aexit__.return_value = False

        with patch.object(llm.httpx, "AsyncClient", return_value=mock_client):
            with pytest.raises(RoastServiceUnavailableError):
                await llm.roast_listener({"username": "ryanfeb"})

    @pytest.mark.asyncio
    async def test_successful_response_with_clean_result(self):
        payload = make_llm_success_payload(content="Nice try, life is detected")
        mock_response = make_response(status_code=200, json_data=payload)

        mock_client = AsyncMock()
        mock_client.post.return_value = mock_response
        mock_client.__aenter__.return_value = mock_client
        mock_client.__aexit__.return_value = False

        with patch.object(llm.httpx, "AsyncClient", return_value=mock_client):
            result = await llm.roast_listener({"username": "ryanfeb"})

        assert result == "Nice try, life is detected"
        mock_client.post.assert_called_once()
