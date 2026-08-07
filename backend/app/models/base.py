import enum
import uuid
from datetime import datetime
from typing import TypeVar

from sqlalchemy import DateTime, Enum, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

_E = TypeVar("_E", bound=enum.Enum)


class Base(DeclarativeBase):
    pass


def pg_enum(enum_cls: type[_E], *, name: str) -> Enum:
    """Postgres ENUM column type storing each member's `.value` (e.g. "student"),
    not its `.name` (e.g. "STUDENT") — SQLAlchemy defaults to the latter, which
    doesn't match the lowercase labels the Alembic migration creates.
    """
    return Enum(enum_cls, name=name, values_callable=lambda e: [m.value for m in e])


class UUIDPrimaryKeyMixin:
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
