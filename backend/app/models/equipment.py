import enum
import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.models.base import Base, UUIDPrimaryKeyMixin, pg_enum


class EquipmentCategory(str, enum.Enum):
    PROJECTOR = "projector"
    COMPUTER = "computer"
    LAB_EQUIPMENT = "lab_equipment"
    SMART_BOARD = "smart_board"
    FURNITURE = "furniture"
    OTHER = "other"


class EquipmentStatus(str, enum.Enum):
    AVAILABLE = "available"
    IN_USE = "in_use"
    UNDER_REPAIR = "under_repair"
    DECOMMISSIONED = "decommissioned"


class Equipment(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "equipment"

    name: Mapped[str] = mapped_column(String, nullable=False)
    category: Mapped[EquipmentCategory] = mapped_column(
        pg_enum(EquipmentCategory, name="equipment_category"), nullable=False
    )
    building_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("buildings.id", ondelete="SET NULL"), nullable=True
    )
    department: Mapped[str | None] = mapped_column(String, nullable=True)
    purchase_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    warranty_expiry: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[EquipmentStatus] = mapped_column(
        pg_enum(EquipmentStatus, name="equipment_status"),
        nullable=False,
        default=EquipmentStatus.AVAILABLE,
    )


class EquipmentRequestStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class EquipmentRequest(UUIDPrimaryKeyMixin, Base):
    """docs/PRD.md FR-7.3, docs/DECISIONS.md ADR-017."""

    __tablename__ = "equipment_requests"

    equipment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("equipment.id", ondelete="CASCADE"), nullable=False
    )
    requester_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    purpose: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[EquipmentRequestStatus] = mapped_column(
        pg_enum(EquipmentRequestStatus, name="equipment_request_status"),
        nullable=False,
        default=EquipmentRequestStatus.PENDING,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
