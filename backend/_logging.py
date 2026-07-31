import logging
import json
import sys
from datetime import datetime, timezone


class JsonFormatter(logging.Formatter):
    def format(self, record):
        payload = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)

        if hasattr(record, "endpoint"):
            payload["endpoint"] = record.endpoint

        if hasattr(record, "username"):
            payload["username"] = record.username

        if hasattr(record, "user1"):
            payload["user1"] = record.user1

        if hasattr(record, "user2"):
            payload["user2"] = record.user2

        return json.dumps(payload)


def configure_logging():
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter())
    root = logging.getLogger()
    root.handlers.clear()
    root.setLevel(logging.INFO)
    root.addHandler(handler)
