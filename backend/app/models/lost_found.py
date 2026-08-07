import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.models.base import Base, UUIDPrimaryKeyMixin


class LostFoundType(str, enum.Enum):
    LOST = "lost"
    FOUND = "found"


class LostFoundStatus(str, enum.Enum):
    OPEN = "open"
    MATCHED = "matched"
    CLOSED = "closed"


class LostFoundItem(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "lost_found_items"

    reporter_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    type: Mapped[LostFoundType] = mapped_column(
        Enum(LostFoundType, name="lost_found_type"), nullable=False
    )
    description: Mapped[str] = mapped_column(Text, nullable=False)
    image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[LostFoundStatus] = mapped_column(
        Enum(LostFoundStatus, name="lost_found_status"),
        nullable=False,
        default=LostFoundStatus.OPEN,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
