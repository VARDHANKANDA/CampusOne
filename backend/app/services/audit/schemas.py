from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel


class AuditLogOut(BaseModel):
    id: UUID
    actor_id: UUID | None
    action: str
    entity_type: str
    entity_id: UUID
    before_state: dict[str, Any] | None
    after_state: dict[str, Any] | None
    created_at: datetime

    model_config = {"from_attributes": True}
