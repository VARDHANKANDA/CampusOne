from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ValidationInfo, field_validator


class WaitlistJoinRequest(BaseModel):
    room_id: UUID
    start_time: datetime
    end_time: datetime

    @field_validator("end_time")
    @classmethod
    def end_after_start(cls, end_time: datetime, info: ValidationInfo) -> datetime:
        start_time = info.data.get("start_time")
        if start_time is not None and end_time <= start_time:
            raise ValueError("end_time must be after start_time")
        return end_time


class WaitlistEntryOut(BaseModel):
    id: UUID
    room_id: UUID
    user_id: UUID
    requested_start: datetime
    requested_end: datetime
    position: int
    notified_at: datetime | None

    model_config = {"from_attributes": True}
