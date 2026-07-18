"""Base exceptions for the backend"""


class RoastNotConfiguredError(Exception):
    """Raised when the LLM API key is missing."""


class RoastServiceUnavailableError(Exception):
    """Raised when the LLM service returns an error or unexpected response."""


class RoastLimitExceededError(Exception):
    """Raised when a user has exhausted their roast quota."""
