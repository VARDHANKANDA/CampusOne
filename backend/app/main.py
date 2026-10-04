from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.errors import register_exception_handlers
from app.core.logging import configure_logging
from app.core.migrations import run_database_migrations

configure_logging()
settings = get_settings()


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan context manager.

    Executes Alembic migrations to ensure the PostgreSQL database schema is
    fully initialized before the application begins accepting requests.
    """
    run_database_migrations()
    yield


app = FastAPI(title="CampusOne API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)


@app.get("/health", tags=["system"])
def health() -> dict[str, str]:
    """Liveness/readiness probe target (docs/DEPLOYMENT.md §4.1, §7)."""
    return {"status": "ok"}


# Domain routers are mounted here as each module lands (docs/ARCHITECTURE.md §3).
# See docs/API.md for the full endpoint contract each router implements.
from app.services.analytics.router import router as analytics_router  # noqa: E402
from app.services.attendance.router import router as attendance_router  # noqa: E402
from app.services.audit.router import router as audit_router  # noqa: E402
from app.services.auth.router import router as auth_router  # noqa: E402
from app.services.booking.labs_router import router as labs_router  # noqa: E402
from app.services.booking.router import router as booking_router  # noqa: E402
from app.services.campus.router import router as campus_router  # noqa: E402
from app.services.complaint.router import router as complaint_router  # noqa: E402
from app.services.equipment.router import router as equipment_router  # noqa: E402
from app.services.event.router import router as event_router  # noqa: E402
from app.services.lost_found.router import router as lost_found_router  # noqa: E402
from app.services.maintenance.router import router as maintenance_router  # noqa: E402
from app.services.notification.router import router as notification_router  # noqa: E402
from app.services.search.router import router as search_router  # noqa: E402
from app.services.users.router import router as users_router  # noqa: E402

app.include_router(auth_router, prefix="/api/v1")
app.include_router(users_router, prefix="/api/v1")
app.include_router(campus_router, prefix="/api/v1")
app.include_router(booking_router, prefix="/api/v1")
app.include_router(labs_router, prefix="/api/v1")
app.include_router(complaint_router, prefix="/api/v1")
app.include_router(maintenance_router, prefix="/api/v1")
app.include_router(equipment_router, prefix="/api/v1")
app.include_router(lost_found_router, prefix="/api/v1")
app.include_router(attendance_router, prefix="/api/v1")
app.include_router(event_router, prefix="/api/v1")
app.include_router(notification_router, prefix="/api/v1")
app.include_router(search_router, prefix="/api/v1")
app.include_router(analytics_router, prefix="/api/v1")
app.include_router(audit_router, prefix="/api/v1")
