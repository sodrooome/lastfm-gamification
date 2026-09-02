import time
import logging
import httpx
import config
from typing import Any, Awaitable, Callable
from exceptions import (
    RoastLimitExceededError,
    RoastNotConfiguredError,
    RoastServiceUnavailableError,
)

logger = logging.getLogger(__name__)

# roasting configuration model through OpenRouter services
ROAST_MODEL = "google/gemini-2.5-flash"
ROAST_TEMPERATURE = 0.9
ROAST_MAX_TOKENS = 256
LLM_TIMEOUT_SECONDS = 30.0
ROAST_LIMIT_PER_USER = 3
JOINT_ROAST_MAX_TOKENS = 300
JOINT_ROAST_TEMPERATURE = 0.9

ROAST_SYSTEM_PROMPT = (
    "You're a savage comedian roasting a Last.fm listener using their real listening "
    "stats. Be genuinely mean and cutting, not lighthearted — no compliment sandwich, "
    "no softening the blow at the end. Mock their specific numbers directly (scrobbles, "
    "top artist, account age, level, achievements) and land at least one harsh, "
    "quotable line, exaggerating for comedic effect.\n\n"
    "Rules: ground every joke in the given data, no outside assumptions. No slurs, "
    "harassment, body-shaming, medical jokes, or remarks about age, gender, appearance, "
    "or other protected traits. One paragraph, under 300 characters. Reply with ONLY "
    "the roast — no reasoning, no preamble, no explanation, nothing else."
)

CASUAL_ROAST_SYSTEM_PROMPT = (
    "You're a witty friend gently ribbing a Last.fm listener using their real listening "
    "stats. Keep it playful and lighthearted, teasing rather than mean — poke fun at "
    "their specific numbers (scrobbles, top artist, account age, level, achievements) "
    "with a fun, self-aware punchline, but stay warm, never cutting.\n\n"
    "Rules: ground every joke in the given data, no outside assumptions. No slurs, "
    "harassment, body-shaming, medical jokes, or remarks about age, gender, appearance, "
    "or other protected traits. One paragraph, under 300 characters. Reply with ONLY "
    "the roast — no reasoning, no preamble, no explanation, nothing else."
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


async def roast_listener(profile_context: dict[str, Any], tone: str = "savage") -> str:
    """Call OpenRouter chat completions and return roast text."""
    if not config.LLM_API_KEY:
        raise RoastNotConfiguredError("LLM_API_KEY is not configured")

    system_prompt = (
        CASUAL_ROAST_SYSTEM_PROMPT if tone == "casual" else ROAST_SYSTEM_PROMPT
    )
    messages = [
        {"role": "system", "content": system_prompt},
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
    username: str,
    context_builder: Callable[[], dict[str, Any]],
    listener: Callable[[dict[str, Any]], Awaitable[str]] | None = None,
) -> tuple[str, bool]:
    """Return roast for a user (or any other daily-limited roast key, e.g. a
    joint-roast pair key).

    First ROAST_LIMIT_PER_USER calls always hit the LLM (no cache serving)
    so the user gets 3 fresh roasts. The result of each call is cached. On
    the 4th+ call the cached result from the most-recent LLM call is returned
    and the button is disabled on the frontend.
    """
    listener = listener or roast_listener
    count = _ROAST_COUNTS.get(username, 0)

    if count >= ROAST_LIMIT_PER_USER:
        cached = _ROAST_CACHE.get(username)
        if cached:
            return cached["roast"], True
        raise RoastLimitExceededError(f"Roast limit exceeded for: {username}")

    roast = await listener(context_builder())
    _ROAST_COUNTS[username] = count + 1
    _ROAST_CACHE[username] = {"roast": roast, "generated_at": time.time()}
    return roast, False


def get_remaining_roasts(username: str) -> int:
    """Return the number of remaining roasts for a user."""
    return max(0, ROAST_LIMIT_PER_USER - _ROAST_COUNTS.get(username, 0))


JOINT_ROAST_SYSTEM_PROMPT = (
    "You're a savage, deadpan comedian delivering a joint roast comparing two "
    "people's Last.fm listening habits. Be genuinely cutting, not a soft compliment "
    "in disguise — land the punch, don't pull it. Dry and punchy, zero exclamation "
    "points, emoji, or hashtags.\n\n"
    "Structure (2-4 sentences, 50-80 words):\n"
    "1. Label each person's musical essence in one devastating phrase.\n"
    "2. Weaponize their compatibility score or shared/missing artists to mock their "
    "dynamic — total mismatch is a tragedy, identical taste is an uninspired echo chamber.\n"
    "3. Land a brutal, quotable closing verdict crowning the weaker taste.\n\n"
    "Rules: ground every joke in the given data, no outside assumptions. No slurs, "
    "harassment, body-shaming, medical jokes, or remarks about age, gender, appearance, "
    "or other protected traits. Mild comedic profanity is fine if it fits the tone. "
    "Reply with ONLY the raw roast text — no preamble, labels, quotation marks, or "
    "markdown."
)


def _format_joint_roast_prompt(ctx: dict[str, Any]) -> str:
    parts: list[str] = []
    parts.append(f"User A: {ctx.get('user1', 'Unknown')}")
    parts.append(f"User B: {ctx.get('user2', 'Unknown')}")
    parts.append(f"Compatibility score: {ctx.get('compatibility_score', 'N/A')}%")
    if ctx.get("shared_artists"):
        parts.append(f"Shared artists: {', '.join(ctx['shared_artists'])}")
    else:
        parts.append("Shared artists: none")
    parts.append(
        f"User A top artists: {', '.join(ctx.get('user1_top_artists', ['Unknown']))}"
    )
    parts.append(
        f"User B top artists: {', '.join(ctx.get('user2_top_artists', ['Unknown']))}"
    )
    parts.append(f"User A scrobbles: {ctx.get('user1_scrobbles', 'N/A')}")
    parts.append(f"User B scrobbles: {ctx.get('user2_scrobbles', 'N/A')}")
    if ctx.get("user1_account_age"):
        parts.append(f"User A account age: {ctx['user1_account_age']:.1f} years")
    if ctx.get("user2_account_age"):
        parts.append(f"User B account age: {ctx['user2_account_age']:.1f} years")
    return "\n".join(parts)


async def roast_joint_listener(ctx: dict[str, Any]) -> str:
    if not config.LLM_API_KEY:
        raise RoastNotConfiguredError("LLM_API_KEY is not configured")

    messages = [
        {"role": "system", "content": JOINT_ROAST_SYSTEM_PROMPT},
        {"role": "user", "content": _format_joint_roast_prompt(ctx)},
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
        "temperature": JOINT_ROAST_TEMPERATURE,
        "max_tokens": JOINT_ROAST_MAX_TOKENS,
        "stream": False,
    }

    url = f"{config.OPENROUTER_BASE_URL}/chat/completions"

    async with httpx.AsyncClient(timeout=LLM_TIMEOUT_SECONDS) as client:
        try:
            response = await client.post(url, headers=headers, json=payload)
            logger.info(f"OpenRouter joint roast response: {response.status_code}")
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
