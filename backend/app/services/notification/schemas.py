from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel


class NotificationOut(BaseModel):
    id: UUID
    user_id: UUID
    type: str
    payload: dict[str, Any]
    read_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class NotificationSettingOut(BaseModel):
    id: UUID
    event_type: str
    email_enabled: bool
    updated_by: UUID | None
    updated_at: datetime

    model_config = {"from_attributes": True}


class NotificationSettingUpdate(BaseModel):
    email_enabled: bool
