from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ValidationInfo, field_validator

from app.models.reservation import BookingStatus
from app.services.campus.schemas import RoomOut


class BookingCreate(BaseModel):
    room_id: UUID
    start_time: datetime
    end_time: datetime
    purpose: str | None = None

    @field_validator("end_time")
    @classmethod
    def end_after_start(cls, end_time: datetime, info: ValidationInfo) -> datetime:
        start_time = info.data.get("start_time")
        if start_time is not None and end_time <= start_time:
            raise ValueError("end_time must be after start_time")
        return end_time


class BookingOut(BaseModel):
    id: UUID
    room_id: UUID
    requester_id: UUID
    start_time: datetime
    end_time: datetime
    status: BookingStatus
    purpose: str | None

    model_config = {"from_attributes": True}


class AvailabilityResult(BaseModel):
    room: RoomOut
    available: bool
    conflicting_window: tuple[datetime, datetime] | None = None
