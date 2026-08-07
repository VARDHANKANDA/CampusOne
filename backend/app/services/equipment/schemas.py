from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel

from app.models.equipment import EquipmentCategory, EquipmentRequestStatus, EquipmentStatus


class EquipmentCreate(BaseModel):
    name: str
    category: EquipmentCategory
    building_id: UUID | None = None
    department: str | None = None
    purchase_date: date | None = None
    warranty_expiry: date | None = None


class EquipmentUpdate(BaseModel):
    name: str | None = None
    building_id: UUID | None = None
    department: str | None = None
    purchase_date: date | None = None
    warranty_expiry: date | None = None
    status: EquipmentStatus | None = None


class EquipmentOut(BaseModel):
    id: UUID
    name: str
    category: EquipmentCategory
    building_id: UUID | None
    department: str | None
    purchase_date: date | None
    warranty_expiry: date | None
    status: EquipmentStatus

    model_config = {"from_attributes": True}


class EquipmentRequestCreate(BaseModel):
    purpose: str | None = None


class EquipmentRequestOut(BaseModel):
    id: UUID
    equipment_id: UUID
    requester_id: UUID
    purpose: str | None
    status: EquipmentRequestStatus
    created_at: datetime

    model_config = {"from_attributes": True}
