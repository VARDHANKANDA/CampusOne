from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from app.models.maintenance import MaintenanceRequestStatus


class MaintenanceRequestOut(BaseModel):
    id: UUID
    complaint_id: UUID | None
    equipment_id: UUID | None
    technician_id: UUID
    status: MaintenanceRequestStatus
    estimated_completion: datetime | None
    actual_completion: datetime | None
    completion_photo_url: str | None
    feedback: str | None

    model_config = {"from_attributes": True}
