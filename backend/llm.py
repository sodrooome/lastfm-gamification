import time
import logging
import httpx
import config
from typing import Any, Callable
from exceptions import (
    RoastLimitExceededError,
    RoastNotConfiguredError,
    RoastServiceUnavailableError,
)

logger = logging.getLogger(__name__)

ROAST_MODEL = "google/gemini-2.5-flash"
ROAST_TEMPERATURE = 0.9
ROAST_MAX_TOKENS = 256
LLM_TIMEOUT_SECONDS = 30.0
ROAST_LIMIT_PER_USER = 3

ROAST_SYSTEM_PROMPT = (
    "You're a witty, passive-aggressive music critic who roasts Last.fm listeners "
    "based on their listening habits. Keep it lighthearted and teasing like a friend "
    "who can't believe someone actually listened to 10,000 tracks by the same artist. "
    "Reference their scrobbles, top artists and level with dry humor. No slurs, "
    "harassment, body-shaming or medical jokes. One short paragraph max 300 characters. "
    "Output ONLY the final roast paragraph. Do not include reasoning, thinking steps, "
    "explanations, meta-commentary, or anything other than the roast itself. "
    "NEVER include reasoning, planning, thinking steps, character counts, or examples. "
    "NEVER start with phrases like 'We need to', 'Let's', 'Count characters', or 'Example:'. "
    "Your entire response must be ONLY the roast paragraph itself — nothing else."
)

_ROAST_CACHE: dict[str, dict[str, Any]] = {}
_ROAST_COUNTS: dict[str, int] = {}


def _format_user_prompt(ctx: dict[str, Any]) -> str:
    """Build a compact natural-language summary from the context dict."""
    parts: list[str] = []
    username = ctx.get("username", "this listener")
    parts.append(f"User: {username}")

    if "total_scrobbles" in ctx:
        parts.append(f"Total scrobbles: {ctx['total_scrobbles']}")
    if "top_artist" in ctx:
        parts.append(f"Top artist: {ctx['top_artist']}")
    if "unique_artists_count" in ctx:
        parts.append(f"Unique artists: {ctx['unique_artists_count']}")
    if "account_age_years" in ctx:
        parts.append(f"Account age: {ctx['account_age_years']} years")
    if "average_listen_per_day" in ctx:
        parts.append(f"Average listens/day: {ctx['average_listen_per_day']}")
    if "friend_count" in ctx:
        parts.append(f"Friends: {ctx['friend_count']}")
    if "country" in ctx:
        parts.append(f"Country: {ctx['country']}")
    if "unlocked_achievements" in ctx:
        parts.append(f"Achievements unlocked: {ctx['unlocked_achievements']}")

    return "\n".join(parts)


_REASONING_MARKERS = (
    "we need to",
    "let's",
    "let us",
    "count characters",
    "example:",
    "must be",
    "use dry humor",
    "no slurs",
    "output only",
    "roast paragraph",
    "short paragraph",
    "around 200",
    "around 250",
    "around 300",
    "craft something",
    "make it a",
    "here is the roast",
    "here's the roast",
    "sure, here's",
    "sure thing",
    "the roast:",
    "i need to",
    "i should",
    "let me",
    "i'll write",
    "i will write",
    "thinking:",
    "step 1",
    "step 2",
    "first,",
    "next,",
    "finally,",
    "note:",
    "remember:",
    "instructions:",
    "constraints:",
    "could be something",
    "something like",
    "let's see",
    "paragraph could be",
    "let's craft",
    "now count",
    "let's count",
    "let me count",
    "i will count",
    "i'll count",
    "i count",
)


def _is_reasoning_line(line: str) -> bool:
    """Return True if the line looks like model reasoning / meta-commentary."""
    stripped = line.strip()
    if not stripped:
        return False
    lower = stripped.lower()
    # Reasoning markers only count at the START of a line — a roast that
    # happens to contain the phrase "no slurs" mid-sentence is still a roast.
    if any(lower.startswith(marker) for marker in _REASONING_MARKERS):
        return True
    # All-uppercase instruction-y lines
    letters = [c for c in stripped if c.isalpha()]
    if letters and all(c.isupper() for c in letters) and len(stripped) > 4:
        return True
    # Multiple question marks usually signals the model asking itself things
    if stripped.count("?") >= 2:
        return True
    # Single-token residue with no sentence punctuation: bare "String",
    # "Output", "Roast" type leaks from the JSON template
    if (
        " " not in stripped
        and len(stripped) < 10
        and not any(c in stripped for c in ".!?,")
    ):
        return True
    return False


def _clean_roast_output(raw_text: str) -> str:
    """Strip reasoning / thinking text from the raw LLM response.

    The free-tier model occasionally leaks its internal monologue before the
    actual roast. We discard any line that smells like planning or instruction
    and keep only the roast lines. If everything gets stripped, fall back to
    the last non-empty line of the original (the roast is usually at the end).
    The result is capped at 400 characters as a safety net.
    """
    if not raw_text:
        return ""

    lines = raw_text.splitlines()
    kept: list[str] = []
    for line in lines:
        # Try to salvage first: if a reasoning prefix is followed by the actual
        # roast on the same line, we want to keep the suffix.
        salvaged = _strip_reasoning_prefix(line)
        if salvaged != line:
            if salvaged.strip() and not _is_reasoning_line(salvaged):
                kept.append(salvaged)
            continue
        if _is_reasoning_line(line):
            continue
        kept.append(line)

    cleaned = "\n".join(kept).strip()

    if not cleaned:
        non_empty = [ln.strip() for ln in lines if ln.strip()]
        cleaned = non_empty[-1] if non_empty else ""

    cleaned = cleaned.strip()

    if len(cleaned) > 400:
        cleaned = cleaned[:400].rstrip()

    return cleaned


_REASONING_PREFIXES = (
    "paragraph could be something like:",
    "paragraph could be something like",
    "could be something like:",
    "could be something like",
    "roast:",
    "roast paragraph:",
    "the roast:",
    "here is the roast:",
    "here's the roast:",
    "sure, here's the roast:",
    "sure, here's a roast:",
    "sure, here is a roast:",
    "let's craft something like:",
    "let's craft something like",
    "let's craft something",
    "let's write something",
    "let me write something",
    "i'll write something",
    "i will write something",
    "let's see:",
    "let's see",
    "output:",
    "output only:",
    "result:",
    "answer:",
    "final:",
)


def _strip_reasoning_prefix(line: str) -> str:
    """If a line starts with a known reasoning preamble, return the suffix.

    Returns the original line unchanged when no prefix matches, so the caller
    can detect the no-op by identity comparison.
    """
    stripped = line.lstrip()
    lower = stripped.lower()
    for prefix in _REASONING_PREFIXES:
        if lower.startswith(prefix):
            return stripped[len(prefix) :].lstrip()
    return line


async def roast_listener(profile_context: dict[str, Any]) -> str:
    """Call OpenRouter chat completions and return roast text."""
    if not config.LLM_API_KEY:
        raise RoastNotConfiguredError("LLM_API_KEY is not configured")

    messages = [
        {"role": "system", "content": ROAST_SYSTEM_PROMPT},
        {"role": "user", "content": _format_user_prompt(profile_context)},
    ]

    headers = {
        "Authorization": f"Bearer {config.LLM_API_KEY}",
        "HTTP-Referer": "https://github.com/sodrooome/lastfm-achievements",
        "X-Title": "lastfm-achievements",
        "Content-Type": "application/json",
    }

    payload = {
        "model": ROAST_MODEL,
        "messages": messages,
        "temperature": ROAST_TEMPERATURE,
        "max_tokens": ROAST_MAX_TOKENS,
        "stream": False,
    }

    url = f"{config.OPENROUTER_BASE_URL}/chat/completions"

    async with httpx.AsyncClient(timeout=LLM_TIMEOUT_SECONDS) as client:
        try:
            response = await client.post(url, headers=headers, json=payload)
            logger.info(f"OpenRouter response status: {response.status_code}")
        except httpx.HTTPError as exc:
            raise RoastServiceUnavailableError(
                f"HTTP error calling OpenRouter: {exc}"
            ) from exc

    if response.status_code >= 400:
        raise RoastServiceUnavailableError(
            f"OpenRouter returned HTTP {response.status_code}"
        )

    try:
        data: dict[str, Any] = response.json()
    except Exception as exc:
        raise RoastServiceUnavailableError(f"Invalid JSON response: {exc}") from exc

    try:
        roast: str = data["choices"][0]["message"]["content"].strip()
    except (KeyError, IndexError, AttributeError) as exc:
        raise RoastServiceUnavailableError(f"Unexpected response shape: {exc}") from exc

    roast = _clean_roast_output(roast)

    return roast


async def get_or_cache_roast(
    username: str, context_builder: Callable[[], dict[str, Any]]
) -> tuple[str, bool]:
    """Return roast for a user.

    First ROAST_LIMIT_PER_USER calls always hit the LLM (no cache serving)
    so the user gets 3 fresh roasts. The result of each call is cached. On
    the 4th+ call the cached result from the most-recent LLM call is returned
    and the button is disabled on the frontend.
    """
    count = _ROAST_COUNTS.get(username, 0)

    if count >= ROAST_LIMIT_PER_USER:
        cached = _ROAST_CACHE.get(username)
        if cached:
            return cached["roast"], True
        raise RoastLimitExceededError(f"Roast limit exceeded for: {username}")

    roast = await roast_listener(context_builder())
    _ROAST_COUNTS[username] = count + 1
    _ROAST_CACHE[username] = {"roast": roast, "generated_at": time.time()}
    return roast, False


def get_remaining_roasts(username: str) -> int:
    """Return the number of remaining roasts for a user."""
    return max(0, ROAST_LIMIT_PER_USER - _ROAST_COUNTS.get(username, 0))
