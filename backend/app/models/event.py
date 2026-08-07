import enum
import uuid
from datetime import datetime

from sqlalchemy import Computed, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import TSTZRANGE, UUID, ExcludeConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, UUIDPrimaryKeyMixin, pg_enum


class EventStatus(str, enum.Enum):
    SCHEDULED = "scheduled"
    CANCELLED = "cancelled"


class Event(UUIDPrimaryKeyMixin, Base):
    """Shares the bookings overlap-prevention pattern (docs/DATABASE.md §2.9)."""

    __tablename__ = "events"

    room_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("rooms.id", ondelete="RESTRICT"), nullable=False
    )
    organizer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    title: Mapped[str] = mapped_column(String, nullable=False)
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    time_range = mapped_column(
        TSTZRANGE,
        Computed("tstzrange(start_time, end_time, '[)')", persisted=True),
    )
    status: Mapped[EventStatus] = mapped_column(
        pg_enum(EventStatus, name="event_status"), nullable=False, default=EventStatus.SCHEDULED
    )

    __table_args__ = (
        ExcludeConstraint(
            ("room_id", "="),
            ("time_range", "&&"),
            name="events_no_overlap_when_scheduled",
            where="status = 'scheduled'",
            using="gist",
        ),
    )
