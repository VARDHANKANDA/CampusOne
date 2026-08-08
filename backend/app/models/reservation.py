import enum
import uuid
from datetime import datetime

from sqlalchemy import Computed, DateTime, ForeignKey, Integer, Text
from sqlalchemy.dialects.postgresql import TSTZRANGE, UUID, ExcludeConstraint
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin, pg_enum


class BookingStatus(str, enum.Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"
    REJECTED = "rejected"


class RecurrenceType(str, enum.Enum):
    NONE = "none"
    DAILY = "daily"
    WEEKLY = "weekly"


class Booking(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Classroom/lab booking (docs/DATABASE.md §2.4).

    The GiST exclusion constraint is the database-level backstop for the
    platform's core invariant (docs/RULES.md Non-Negotiable Invariants #1):
    no two *confirmed* bookings may overlap for the same room. Application-layer
    validation (services/booking) is the primary gate; this constraint catches
    anything that slips past it under concurrency (docs/DECISIONS.md ADR-002).
    """

    __tablename__ = "bookings"

    room_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("rooms.id", ondelete="RESTRICT"), nullable=False
    )
    requester_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    time_range = mapped_column(
        TSTZRANGE,
        Computed("tstzrange(start_time, end_time, '[)')", persisted=True),
    )
    status: Mapped[BookingStatus] = mapped_column(
        pg_enum(BookingStatus, name="booking_status"),
        nullable=False,
        default=BookingStatus.PENDING,
    )
    purpose: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Recurrence support
    recurrence_type: Mapped[RecurrenceType] = mapped_column(
        pg_enum(RecurrenceType, name="recurrence_type"),
        nullable=False,
        default=RecurrenceType.NONE,
    )
    recurrence_end_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    recurrence_parent_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("bookings.id", ondelete="CASCADE"), nullable=True
    )

    # Check-in tracking
    checked_in_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Lab seat selection
    seat_number: Mapped[int | None] = mapped_column(Integer, nullable=True)

    __table_args__ = (
        ExcludeConstraint(
            ("room_id", "="),
            ("time_range", "&&"),
            name="bookings_no_overlap_when_confirmed",
            where="status = 'confirmed'",
            using="gist",
        ),
    )


class WaitlistEntry(UUIDPrimaryKeyMixin, Base):
    """Lab-session waitlist (docs/DATABASE.md §2.6, PRD.md FR-3.3/3.4)."""

    __tablename__ = "waitlist_entries"

    room_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    requested_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    requested_end: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    notified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
