from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Environment-driven configuration. Never hardcode values here — see docs/DEPLOYMENT.md §3."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    supabase_url: str = ""
    supabase_service_key: str = ""
    jwt_secret: str = ""
    database_url: str = "postgresql+psycopg://campus:campus@localhost:5432/smart_campus"
    allowed_cors_origins: str = "http://localhost:5173"
    env: str = "local"

    @property
    def cors_origins(self) -> list[str]:
        return [
            origin.strip().rstrip("/")
            for origin in self.allowed_cors_origins.split(",")
            if origin.strip()
        ]

    @property
    def is_production(self) -> bool:
        return self.env == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
