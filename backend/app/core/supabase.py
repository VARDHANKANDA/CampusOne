import logging

from supabase import Client, create_client

from app.core.config import get_settings
from app.core.errors import AppError

logger = logging.getLogger(__name__)


def get_supabase_client() -> Client:
    """Service-role Supabase client. Never exposed to the frontend — the backend
    is the only holder of SUPABASE_SERVICE_KEY (docs/DEPLOYMENT.md §3).

    Deliberately not cached/reused across requests (docs/DECISIONS.md ADR-022):
    a long-lived client's pooled HTTP/2 connection goes stale after sitting
    idle, and Supabase's edge then rejects requests sent over it as 403
    `bad_jwt` even though the key itself is valid — building a fresh client
    (and connection) per call avoids that entirely, at the cost of one extra
    TLS handshake per Auth call.
    """
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_key:
        raise AppError(
            code="SUPABASE_NOT_CONFIGURED",
            message="Supabase authentication service is not configured on the server.",
            status_code=500,
        )
    try:
        return create_client(settings.supabase_url, settings.supabase_service_key)
    except Exception as exc:
        logger.exception("Failed to initialize Supabase client: %s", exc)
        raise AppError(
            code="SUPABASE_INIT_ERROR",
            message="Failed to initialize authentication client. Verify server config.",
            status_code=500,
        ) from exc
