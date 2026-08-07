import logging
import sys

from app.core.config import get_settings


def configure_logging() -> None:
    """Structured-enough logging for a capstone deployment: level + module + message.

    Server-side logs may contain full error detail; client-facing responses never do
    (docs/SECURITY.md §9). Nothing here should ever log request bodies containing
    personal data (docs/RULES.md §8) — log identifiers (user id, entity id), not payloads.
    """
    settings = get_settings()
    level = logging.DEBUG if settings.env == "local" else logging.INFO

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(name)s: %(message)s"))

    root = logging.getLogger()
    root.setLevel(level)
    root.handlers = [handler]

    # Uvicorn's own loggers otherwise double-configure themselves.
    for noisy in ("uvicorn", "uvicorn.error", "uvicorn.access"):
        logging.getLogger(noisy).handlers = [handler]
        logging.getLogger(noisy).propagate = False
