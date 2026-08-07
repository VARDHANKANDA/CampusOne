import enum
import uuid

from sqlalchemy import ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin, pg_enum


class ComplaintCategory(str, enum.Enum):
    PLUMBING = "plumbing"
    ELECTRICAL = "electrical"
    NETWORK = "network"
    FURNITURE = "furniture"
    OTHER = "other"


class ComplaintPriority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class ComplaintStatus(str, enum.Enum):
    """docs/PRD.md FR-4.2: Submitted -> Assigned -> In Progress -> Completed -> Verified."""

    SUBMITTED = "submitted"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    VERIFIED = "verified"


VALID_COMPLAINT_TRANSITIONS: dict[ComplaintStatus, set[ComplaintStatus]] = {
    ComplaintStatus.SUBMITTED: {ComplaintStatus.ASSIGNED},
    ComplaintStatus.ASSIGNED: {ComplaintStatus.IN_PROGRESS},
    ComplaintStatus.IN_PROGRESS: {ComplaintStatus.COMPLETED},
    ComplaintStatus.COMPLETED: {ComplaintStatus.VERIFIED},
    ComplaintStatus.VERIFIED: set(),
}


class Complaint(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "complaints"

    reporter_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    category: Mapped[ComplaintCategory] = mapped_column(
        pg_enum(ComplaintCategory, name="complaint_category"), nullable=False
    )
    description: Mapped[str] = mapped_column(Text, nullable=False)
    image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Distinct from image_url (the original report photo) so evidence of the
    # problem isn't overwritten by evidence of the fix (docs/DECISIONS.md ADR-014).
    completion_image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    priority: Mapped[ComplaintPriority] = mapped_column(
        pg_enum(ComplaintPriority, name="complaint_priority"), nullable=False
    )
    status: Mapped[ComplaintStatus] = mapped_column(
        pg_enum(ComplaintStatus, name="complaint_status"),
        nullable=False,
        default=ComplaintStatus.SUBMITTED,
    )
    assigned_to: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
