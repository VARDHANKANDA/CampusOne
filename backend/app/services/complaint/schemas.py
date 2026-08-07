from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from app.models.complaint import ComplaintCategory, ComplaintPriority, ComplaintStatus


class ComplaintOut(BaseModel):
    id: UUID
    reporter_id: UUID
    category: ComplaintCategory
    description: str
    image_url: str | None
    completion_image_url: str | None
    priority: ComplaintPriority
    status: ComplaintStatus
    assigned_to: UUID | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ComplaintAssignRequest(BaseModel):
    assigned_to: UUID
