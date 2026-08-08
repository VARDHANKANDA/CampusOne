from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ValidationInfo, field_validator

from app.models.event import EventStatus


class EventCreate(BaseModel):
    room_id: UUID
    title: str
    start_time: datetime
    end_time: datetime

    @field_validator("end_time")
    @classmethod
    def end_after_start(cls, end_time: datetime, info: ValidationInfo) -> datetime:
        start_time = info.data.get("start_time")
        if start_time is not None and end_time <= start_time:
            raise ValueError("end_time must be after start_time")
        return end_time


class EventOut(BaseModel):
    id: UUID
    room_id: UUID
    organizer_id: UUID
    title: str
    start_time: datetime
    end_time: datetime
    status: EventStatus

    model_config = {"from_attributes": True}


class AttendeeOut(BaseModel):
    id: UUID
    full_name: str
    email: str
    department: str | None = None

    model_config = {"from_attributes": True}


class EventRSVPStatusOut(BaseModel):
    rsvp_count: int
    user_rsvped: bool
