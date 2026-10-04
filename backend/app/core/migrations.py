import logging
import os

from alembic import command
from alembic.config import Config

from app.core.config import get_settings

logger = logging.getLogger(__name__)


def run_database_migrations() -> None:
    """Execute Alembic migrations up to head automatically.

    Safe for production startup. Ensures all tables, constraints, and types
    are initialized before the application begins accepting requests.
    """
    logger.info("Initializing database schema via Alembic migrations...")
    current_dir = os.path.dirname(os.path.abspath(__file__))
    # app/core/migrations.py -> app/core -> app -> backend root
    backend_dir = os.path.abspath(os.path.join(current_dir, "..", ".."))
    ini_path = os.path.join(backend_dir, "alembic.ini")
    if not os.path.exists(ini_path):
        ini_path = "alembic.ini"

    alembic_cfg = Config(ini_path)
    database_url = get_settings().database_url.replace("%", "%%")
    alembic_cfg.set_main_option("sqlalchemy.url", database_url)

    try:
        command.upgrade(alembic_cfg, "head")
        logger.info("Database migrations applied successfully.")
    except Exception as exc:
        logger.exception("Failed to apply database migrations: %s", exc)
        raise RuntimeError(f"Database migration failed: {exc}") from exc
