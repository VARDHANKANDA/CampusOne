"""Integration tests need a real Postgres (exclusion constraints, ARRAY/JSONB
columns aren't SQLite-portable). Run `docker compose up -d postgres` locally,
or rely on CI's Postgres service container (.github/workflows/ci.yml).
"""

from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings
from app.core.database import get_db
from app.main import app
from app.models.base import Base
from tests.integration.fakes import FakeSupabaseClient

settings = get_settings()


def _postgres_reachable() -> bool:
    try:
        engine = create_engine(settings.database_url)
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        engine.dispose()
        return True
    except Exception:
        return False


@pytest.fixture(scope="module")
def engine():
    if not _postgres_reachable():
        pytest.skip("Integration tests require a reachable Postgres at DATABASE_URL")

    eng = create_engine(settings.database_url)
    Base.metadata.create_all(eng)
    yield eng
    Base.metadata.drop_all(eng)
    eng.dispose()


@pytest.fixture
def db_session(engine) -> Generator[Session, None, None]:
    connection = engine.connect()
    transaction = connection.begin()
    session_factory = sessionmaker(bind=connection)
    session = session_factory()
    yield session
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def fake_supabase(monkeypatch) -> FakeSupabaseClient:
    fake = FakeSupabaseClient()
    monkeypatch.setattr("app.services.auth.router.get_supabase_client", lambda: fake)
    monkeypatch.setattr("app.core.storage.get_supabase_client", lambda: fake)
    return fake


@pytest.fixture
def client(
    db_session: Session, fake_supabase: FakeSupabaseClient, monkeypatch
) -> Generator[TestClient, None, None]:
    def _get_db_override() -> Generator[Session, None, None]:
        yield db_session

    app.dependency_overrides[get_db] = _get_db_override

    # Prevent commits on the main db_session to avoid closing connection transaction
    monkeypatch.setattr(db_session, "commit", db_session.flush)

    def mock_session_local() -> Session:
        conn = db_session.connection()
        s = Session(bind=conn)
        s.commit = s.flush
        return s

    monkeypatch.setattr("app.services.audit.service.SessionLocal", mock_session_local)
    monkeypatch.setattr("app.services.notification.service.SessionLocal", mock_session_local)

    yield TestClient(app)
    app.dependency_overrides.clear()

