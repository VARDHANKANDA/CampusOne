from functools import lru_cache

from supabase import Client, create_client

from app.core.config import get_settings


@lru_cache
def get_supabase_client() -> Client:
    """Service-role Supabase client. Never exposed to the frontend — the backend
    is the only holder of SUPABASE_SERVICE_KEY (docs/DEPLOYMENT.md §3).
    """
    settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_service_key)
