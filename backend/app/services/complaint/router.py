"""Hostel Complaint Management — docs/API.md §7, docs/PRD.md FR-4.x.

State machine enforcement (docs/RULES.md, docs/TESTING.md §2.1 critical path):
every transition is checked against VALID_COMPLAINT_TRANSITIONS before the
write — invalid transitions 400, never silently succeed or no-op.
"""

from datetime import datetime, timedelta, UTC
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.errors import AppError, ForbiddenError, NotFoundError
from app.core.security import CurrentUser, get_current_user, require_role
from app.core.storage import upload_image
from app.models.complaint import (
    VALID_COMPLAINT_TRANSITIONS,
    Complaint,
    ComplaintCategory,
    ComplaintPriority,
    ComplaintStatus,
)
from app.models.maintenance import MaintenanceRequest
from app.models.user import Role, User
from app.services.audit.service import record_audit_log
from app.services.complaint.schemas import ComplaintAssignRequest, ComplaintOut
from app.services.notification.service import queue_notification

router = APIRouter(prefix="/complaints", tags=["complaints"])


def _require_transition(current: ComplaintStatus, target: ComplaintStatus) -> None:
    if target not in VALID_COMPLAINT_TRANSITIONS[current]:
        raise AppError(
            "INVALID_STATE_TRANSITION",
            f"Cannot move a complaint from '{current.value}' to '{target.value}'.",
            status_code=400,
        )


@router.post("", response_model=ComplaintOut, status_code=status.HTTP_201_CREATED)
async def submit_complaint(
    background_tasks: BackgroundTasks,
    category: ComplaintCategory = Form(...),
    description: str = Form(..., min_length=1, max_length=2000),
    priority: ComplaintPriority = Form(...),
    image: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role(Role.STUDENT)),
) -> Complaint:
    image_url = await upload_image("complaint-images", image, prefix=f"{current_user.id}/")

    now = datetime.now(UTC)
    sla_hours = {
        ComplaintPriority.URGENT: 4,
        ComplaintPriority.HIGH: 24,
        ComplaintPriority.MEDIUM: 72,
        ComplaintPriority.LOW: 168,
    }
    hours = sla_hours.get(priority, 72)
    sla_due_at = now + timedelta(hours=hours)

    complaint = Complaint(
        reporter_id=current_user.id,
        category=category,
        description=description,
        priority=priority,
        image_url=image_url,
        status=ComplaintStatus.SUBMITTED,
        sla_due_at=sla_due_at,
    )
    db.add(complaint)
    db.commit()
    db.refresh(complaint)

    background_tasks.add_task(
        record_audit_log,
        current_user.id,
        "complaint.created",
        "complaint",
        complaint.id,
        after_state=ComplaintOut.model_validate(complaint).model_dump(mode="json"),
    )
    return complaint


def _update_complaint_sla(db: Session, complaint: Complaint) -> None:
    if (
        complaint.sla_due_at
        and complaint.status not in (ComplaintStatus.COMPLETED, ComplaintStatus.VERIFIED)
    ):
        now = datetime.now(UTC)
        if now > complaint.sla_due_at:
            if not complaint.sla_breached or not complaint.escalated_to_admin:
                complaint.sla_breached = True
                complaint.escalated_to_admin = True
                db.commit()


def _format_complaint_out(db: Session, complaint: Complaint) -> dict:
    from app.models.maintenance import MaintenanceRequest
    req = db.execute(
        select(MaintenanceRequest).where(MaintenanceRequest.complaint_id == complaint.id)
    ).scalars().first()
    
    return {
        "id": complaint.id,
        "reporter_id": complaint.reporter_id,
        "category": complaint.category,
        "description": complaint.description,
        "image_url": complaint.image_url,
        "completion_image_url": complaint.completion_image_url,
        "priority": complaint.priority,
        "status": complaint.status,
        "assigned_to": complaint.assigned_to,
        "created_at": complaint.created_at,
        "updated_at": complaint.updated_at,
        "sla_due_at": complaint.sla_due_at,
        "sla_breached": complaint.sla_breached,
        "escalated_to_admin": complaint.escalated_to_admin,
        "feedback": req.feedback if req else None,
        "cost": req.cost if req else None,
    }


@router.get("", response_model=list[ComplaintOut])
def list_complaints(
    status_filter: ComplaintStatus | None = None,
    category: ComplaintCategory | None = None,
    priority: ComplaintPriority | None = None,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(
        require_role(Role.STUDENT, Role.WARDEN, Role.ADMIN, Role.MAINTENANCE_STAFF)
    ),
) -> list[dict]:
    query = select(Complaint)
    if current_user.role == Role.STUDENT:
        query = query.where(Complaint.reporter_id == current_user.id)
    elif current_user.role == Role.MAINTENANCE_STAFF:
        query = query.where(Complaint.assigned_to == current_user.id)
    if status_filter is not None:
        query = query.where(Complaint.status == status_filter)
    if category is not None:
        query = query.where(Complaint.category == category)
    if priority is not None:
        query = query.where(Complaint.priority == priority)
    
    complaints = list(db.execute(query.order_by(Complaint.created_at.desc())).scalars().all())
    for c in complaints:
        _update_complaint_sla(db, c)
    return [_format_complaint_out(db, c) for c in complaints]


def _get_visible_complaint(db: Session, complaint_id: UUID, current_user: CurrentUser) -> Complaint:
    complaint = db.get(Complaint, complaint_id)
    if complaint is None:
        raise NotFoundError("Complaint not found")
    _update_complaint_sla(db, complaint)
    
    is_visible = (
        current_user.role in (Role.WARDEN, Role.ADMIN)
        or complaint.reporter_id == current_user.id
        or complaint.assigned_to == current_user.id
    )
    if not is_visible:
        raise ForbiddenError("You do not have access to this complaint.")
    return complaint


@router.get("/{complaint_id}", response_model=ComplaintOut)
def get_complaint(
    complaint_id: UUID,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> dict:
    complaint = _get_visible_complaint(db, complaint_id, current_user)
    return _format_complaint_out(db, complaint)


@router.patch("/{complaint_id}/assign", response_model=ComplaintOut)
def assign_complaint(
    complaint_id: UUID,
    payload: ComplaintAssignRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role(Role.WARDEN)),
) -> dict:
    complaint = db.get(Complaint, complaint_id)
    if complaint is None:
        raise NotFoundError("Complaint not found")
    _require_transition(complaint.status, ComplaintStatus.ASSIGNED)

    assignee = db.get(User, payload.assigned_to)
    if assignee is None or assignee.role != Role.MAINTENANCE_STAFF:
        raise AppError(
            "INVALID_ASSIGNEE", "assigned_to must be an active maintenance_staff user.", 400
        )

    before = ComplaintOut.model_validate(complaint).model_dump(mode="json")
    complaint.status = ComplaintStatus.ASSIGNED
    complaint.assigned_to = payload.assigned_to
    # Gives maintenance staff a real, populated task list (docs/DECISIONS.md ADR-016)
    # — this is currently the only path that creates a maintenance_requests row.
    maintenance_request = MaintenanceRequest(
        complaint_id=complaint.id, technician_id=payload.assigned_to
    )
    db.add(maintenance_request)
    db.commit()
    db.refresh(complaint)

    background_tasks.add_task(
        record_audit_log,
        current_user.id,
        "maintenance_request.created",
        "maintenance_request",
        maintenance_request.id,
        after_state={"complaint_id": str(complaint.id), "technician_id": str(payload.assigned_to)},
    )
    background_tasks.add_task(
        record_audit_log,
        current_user.id,
        "complaint.assigned",
        "complaint",
        complaint.id,
        before_state=before,
        after_state=ComplaintOut.model_validate(complaint).model_dump(mode="json"),
    )
    background_tasks.add_task(
        queue_notification,
        complaint.reporter_id,
        "complaint_status_changed",
        {"complaint_id": str(complaint.id), "status": complaint.status.value},
    )
    background_tasks.add_task(
        queue_notification,
        payload.assigned_to,
        "maintenance_assigned",
        {"complaint_id": str(complaint.id)},
    )
    return _format_complaint_out(db, complaint)


@router.patch("/{complaint_id}/status", response_model=ComplaintOut)
async def update_complaint_status(
    complaint_id: UUID,
    background_tasks: BackgroundTasks,
    new_status: Literal["in_progress", "completed"] = Form(..., alias="status"),
    photo: UploadFile | None = File(None),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role(Role.MAINTENANCE_STAFF)),
) -> dict:
    complaint = db.get(Complaint, complaint_id)
    if complaint is None:
        raise NotFoundError("Complaint not found")
    if complaint.assigned_to != current_user.id:
        raise ForbiddenError("You are not assigned to this complaint.")

    target = ComplaintStatus(new_status)
    _require_transition(complaint.status, target)

    before = ComplaintOut.model_validate(complaint).model_dump(mode="json")
    complaint.status = target
    if target == ComplaintStatus.COMPLETED and photo is not None:
        complaint.completion_image_url = await upload_image(
            "maintenance-completion-photos", photo, prefix=f"{complaint.id}/"
        )
    db.commit()
    db.refresh(complaint)

    background_tasks.add_task(
        record_audit_log,
        current_user.id,
        "complaint.status_updated",
        "complaint",
        complaint.id,
        before_state=before,
        after_state=ComplaintOut.model_validate(complaint).model_dump(mode="json"),
    )
    background_tasks.add_task(
        queue_notification,
        complaint.reporter_id,
        "complaint_status_changed",
        {"complaint_id": str(complaint.id), "status": complaint.status.value},
    )
    return _format_complaint_out(db, complaint)


@router.patch("/{complaint_id}/verify", response_model=ComplaintOut)
def verify_complaint(
    complaint_id: UUID,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role(Role.STUDENT)),
) -> dict:
    complaint = db.get(Complaint, complaint_id)
    if complaint is None:
        raise NotFoundError("Complaint not found")
    if complaint.reporter_id != current_user.id:
        raise ForbiddenError("Only the original reporter can verify this complaint.")
    _require_transition(complaint.status, ComplaintStatus.VERIFIED)

    before = ComplaintOut.model_validate(complaint).model_dump(mode="json")
    complaint.status = ComplaintStatus.VERIFIED
    db.commit()
    db.refresh(complaint)

    background_tasks.add_task(
        record_audit_log,
        current_user.id,
        "complaint.verified",
        "complaint",
        complaint.id,
        before_state=before,
        after_state=ComplaintOut.model_validate(complaint).model_dump(mode="json"),
    )
    return _format_complaint_out(db, complaint)
