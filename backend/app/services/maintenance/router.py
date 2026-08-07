"""Maintenance Tracking — docs/API.md §11, docs/PRD.md FR-9.x.

Rows are currently created only as a side effect of complaint assignment
(docs/DECISIONS.md ADR-016) — there is no standalone creation endpoint.
"""

from datetime import UTC, datetime
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.errors import ForbiddenError, NotFoundError
from app.core.security import CurrentUser, require_role
from app.core.storage import upload_image
from app.models.maintenance import MaintenanceRequest, MaintenanceRequestStatus
from app.models.user import Role
from app.services.audit.service import record_audit_log
from app.services.maintenance.schemas import MaintenanceRequestOut

router = APIRouter(prefix="/maintenance-requests", tags=["maintenance"])


@router.get("", response_model=list[MaintenanceRequestOut])
def list_maintenance_requests(
    status_filter: MaintenanceRequestStatus | None = None,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(
        require_role(Role.MAINTENANCE_STAFF, Role.WARDEN, Role.ADMIN)
    ),
) -> list[MaintenanceRequest]:
    query = select(MaintenanceRequest)
    if current_user.role == Role.MAINTENANCE_STAFF:
        query = query.where(MaintenanceRequest.technician_id == current_user.id)
    if status_filter is not None:
        query = query.where(MaintenanceRequest.status == status_filter)
    return list(db.execute(query).scalars().all())


@router.patch("/{request_id}", response_model=MaintenanceRequestOut)
async def update_maintenance_request(
    request_id: UUID,
    background_tasks: BackgroundTasks,
    new_status: Literal["pending", "in_progress", "completed"] = Form(..., alias="status"),
    feedback: str | None = Form(None),
    photo: UploadFile | None = File(None),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role(Role.MAINTENANCE_STAFF)),
) -> MaintenanceRequest:
    maintenance_request = db.get(MaintenanceRequest, request_id)
    if maintenance_request is None:
        raise NotFoundError("Maintenance request not found")
    if maintenance_request.technician_id != current_user.id:
        raise ForbiddenError("You are not assigned to this maintenance request.")

    before = MaintenanceRequestOut.model_validate(maintenance_request).model_dump(mode="json")

    maintenance_request.status = MaintenanceRequestStatus(new_status)
    if feedback is not None:
        maintenance_request.feedback = feedback
    if photo is not None:
        maintenance_request.completion_photo_url = await upload_image(
            "maintenance-completion-photos", photo, prefix=f"{maintenance_request.id}/"
        )
    if (
        maintenance_request.status == MaintenanceRequestStatus.COMPLETED
        and maintenance_request.actual_completion is None
    ):
        maintenance_request.actual_completion = datetime.now(UTC)

    db.commit()
    db.refresh(maintenance_request)

    background_tasks.add_task(
        record_audit_log,
        current_user.id,
        "maintenance_request.updated",
        "maintenance_request",
        maintenance_request.id,
        before_state=before,
        after_state=MaintenanceRequestOut.model_validate(maintenance_request).model_dump(
            mode="json"
        ),
    )
    return maintenance_request
