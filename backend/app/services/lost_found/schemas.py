from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel

from app.models.lost_found import LostFoundStatus, LostFoundType


class LostFoundStatusUpdate(BaseModel):
    status: Literal["matched", "closed"]


class LostFoundOut(BaseModel):
    id: UUID
    reporter_id: UUID
    type: LostFoundType
    description: str
    image_url: str | None
    status: LostFoundStatus
    created_at: datetime

    model_config = {"from_attributes": True}
