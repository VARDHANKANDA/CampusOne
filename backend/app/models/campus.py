import enum
import uuid

from sqlalchemy import ARRAY, Boolean, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, UUIDPrimaryKeyMixin, pg_enum


class RoomType(str, enum.Enum):
    CLASSROOM = "classroom"
    LAB = "lab"
    AUDITORIUM = "auditorium"
    SEMINAR_HALL = "seminar_hall"


class Building(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "buildings"

    name: Mapped[str] = mapped_column(String, nullable=False)
    code: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    location: Mapped[str | None] = mapped_column(String, nullable=True)


class Room(UUIDPrimaryKeyMixin, Base):
    """Unified classrooms/labs/venues table (docs/DECISIONS.md ADR-003)."""

    __tablename__ = "rooms"

    building_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("buildings.id", ondelete="RESTRICT"), nullable=False
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    type: Mapped[RoomType] = mapped_column(pg_enum(RoomType, name="room_type"), nullable=False)
    capacity: Mapped[int] = mapped_column(Integer, nullable=False)
    equipment_tags: Mapped[list[str]] = mapped_column(ARRAY(String), nullable=False, default=list)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    # Admin-configurable per docs/DECISIONS.md ADR-012: bookings for a room flagged
    # here are created 'pending' and need admin approval; everything else auto-confirms.
    requires_approval: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
