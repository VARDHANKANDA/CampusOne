import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.models.base import Base, UUIDPrimaryKeyMixin, pg_enum


class MaintenanceSchedule(UUIDPrimaryKeyMixin, Base):
    """Blocks bookings for a room during planned maintenance (docs/DATABASE.md §2.5)."""

    __tablename__ = "maintenance_schedules"

    room_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False
    )
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)


class MaintenanceRequestStatus(str, enum.Enum):
    """docs/DECISIONS.md ADR-016 — added since docs/API.md §11 promises a status
    update but the table originally had no status column.
    """

    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


class MaintenanceRequest(UUIDPrimaryKeyMixin, Base):
    """Standalone or complaint-linked repair task (docs/DATABASE.md §2.8).

    Currently created only as a side effect of assigning a complaint
    (docs/DECISIONS.md ADR-016) — there is no standalone creation endpoint yet.
    """

    __tablename__ = "maintenance_requests"

    complaint_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("complaints.id", ondelete="SET NULL"), nullable=True
    )
    equipment_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("equipment.id", ondelete="SET NULL"), nullable=True
    )
    technician_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    status: Mapped[MaintenanceRequestStatus] = mapped_column(
        pg_enum(MaintenanceRequestStatus, name="maintenance_request_status"),
        nullable=False,
        default=MaintenanceRequestStatus.PENDING,
    )
    estimated_completion: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    actual_completion: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    completion_photo_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    feedback: Mapped[str | None] = mapped_column(Text, nullable=True)
    cost: Mapped[float | None] = mapped_column(nullable=True)
    # Added for FR-12.1's maintenance-performance metric (time to resolution),
    # which is otherwise uncomputable — docs/DECISIONS.md ADR-019.
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
