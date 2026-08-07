from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ValidationInfo, field_validator

from app.models.reservation import BookingStatus, RecurrenceType
from app.services.campus.schemas import RoomOut


class BookingCreate(BaseModel):
    room_id: UUID
    start_time: datetime
    end_time: datetime
    purpose: str | None = None
    recurrence_type: RecurrenceType = RecurrenceType.NONE
    recurrence_end_date: datetime | None = None
    seat_number: int | None = None

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
    recurrence_type: RecurrenceType
    recurrence_end_date: datetime | None
    recurrence_parent_id: UUID | None
    checked_in_at: datetime | None
    seat_number: int | None

    model_config = {"from_attributes": True}


class AvailabilityResult(BaseModel):
    room: RoomOut
    available: bool
    conflicting_window: tuple[datetime, datetime] | None = None

