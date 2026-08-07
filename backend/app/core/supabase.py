from supabase import Client, create_client

from app.core.config import get_settings


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
    return create_client(settings.supabase_url, settings.supabase_service_key)
