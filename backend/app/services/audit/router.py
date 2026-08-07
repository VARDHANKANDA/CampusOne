"""Audit Logs — docs/API.md §14, docs/PRD.md FR-13.x.

Read-only: every other module's routers already write to `audit_logs` via
`app/services/audit/service.py::record_audit_log`. This is the query side.
The table itself is append-only at the DB grant level (docs/DATABASE.md §2.16).
"""

from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import CurrentUser, require_role
from app.models.audit import AuditLog
from app.models.user import Role
from app.services.audit.schemas import AuditLogOut

router = APIRouter(prefix="/audit-logs", tags=["audit-logs"])


@router.get("", response_model=list[AuditLogOut])
def list_audit_logs(
    actor_id: UUID | None = None,
    entity_type: str | None = None,
    from_time: datetime | None = Query(default=None, alias="from"),
    to_time: datetime | None = Query(default=None, alias="to"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    _current_user: CurrentUser = Depends(require_role(Role.ADMIN)),
) -> list[AuditLog]:
    query = select(AuditLog)
    if actor_id is not None:
        query = query.where(AuditLog.actor_id == actor_id)
    if entity_type is not None:
        query = query.where(AuditLog.entity_type == entity_type)
    if from_time is not None:
        query = query.where(AuditLog.created_at >= from_time)
    if to_time is not None:
        query = query.where(AuditLog.created_at <= to_time)

    query = (
        query.order_by(AuditLog.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    )
    return list(db.execute(query).scalars().all())
