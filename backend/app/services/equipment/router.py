"""Equipment Inventory — docs/API.md §4 (equipment rows), docs/PRD.md FR-7.x."""

from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.errors import AppError, NotFoundError
from app.core.security import CurrentUser, get_current_user, require_role
from app.models.equipment import (
    Equipment,
    EquipmentCategory,
    EquipmentRequest,
    EquipmentRequestStatus,
    EquipmentStatus,
)
from app.models.user import Role
from app.services.audit.service import record_audit_log
from app.services.equipment.schemas import (
    EquipmentCreate,
    EquipmentOut,
    EquipmentRequestCreate,
    EquipmentRequestOut,
    EquipmentUpdate,
)

router = APIRouter(prefix="/equipment", tags=["equipment"])


@router.get("", response_model=list[EquipmentOut])
def list_equipment(
    category: EquipmentCategory | None = None,
    status_filter: EquipmentStatus | None = None,
    db: Session = Depends(get_db),
    _current_user: CurrentUser = Depends(get_current_user),
) -> list[Equipment]:
    query = select(Equipment)
    if category is not None:
        query = query.where(Equipment.category == category)
    if status_filter is not None:
        query = query.where(Equipment.status == status_filter)
    return list(db.execute(query.order_by(Equipment.name)).scalars().all())


@router.post("", response_model=EquipmentOut, status_code=status.HTTP_201_CREATED)
def create_equipment(
    payload: EquipmentCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role(Role.ADMIN)),
) -> Equipment:
    equipment = Equipment(**payload.model_dump())
    db.add(equipment)
    db.commit()
    db.refresh(equipment)

    background_tasks.add_task(
        record_audit_log,
        current_user.id,
        "equipment.created",
        "equipment",
        equipment.id,
        after_state=EquipmentOut.model_validate(equipment).model_dump(mode="json"),
    )
    return equipment


@router.get("/requests", response_model=list[EquipmentRequestOut])
def list_equipment_requests(
    db: Session = Depends(get_db),
    _current_user: CurrentUser = Depends(require_role(Role.ADMIN)),
) -> list[EquipmentRequest]:
    query = select(EquipmentRequest).order_by(EquipmentRequest.created_at.desc())
    return list(db.execute(query).scalars().all())


@router.post(
    "/{equipment_id}/request",
    response_model=EquipmentRequestOut,
    status_code=status.HTTP_201_CREATED,
)
def request_equipment(
    equipment_id: UUID,
    payload: EquipmentRequestCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role(Role.FACULTY)),
) -> EquipmentRequest:
    equipment = db.get(Equipment, equipment_id)
    if equipment is None:
        raise NotFoundError("Equipment not found")
    if equipment.status != EquipmentStatus.AVAILABLE:
        raise AppError(
            "EQUIPMENT_UNAVAILABLE",
            f"Equipment is currently '{equipment.status.value}', not available to request.",
            status_code=400,
        )

    request = EquipmentRequest(
        equipment_id=equipment.id, requester_id=current_user.id, purpose=payload.purpose
    )
    db.add(request)
    db.commit()
    db.refresh(request)

    background_tasks.add_task(
        record_audit_log,
        current_user.id,
        "equipment_request.created",
        "equipment_request",
        request.id,
        after_state=EquipmentRequestOut.model_validate(request).model_dump(mode="json"),
    )
    return request


def _get_pending_request(db: Session, request_id: UUID) -> EquipmentRequest:
    request = db.get(EquipmentRequest, request_id)
    if request is None:
        raise NotFoundError("Equipment request not found")
    if request.status != EquipmentRequestStatus.PENDING:
        raise AppError(
            "INVALID_STATE_TRANSITION",
            f"Only pending requests can be actioned (current status: '{request.status.value}').",
            status_code=400,
        )
    return request


@router.patch("/requests/{request_id}/approve", response_model=EquipmentRequestOut)
def approve_equipment_request(
    request_id: UUID,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role(Role.ADMIN)),
) -> EquipmentRequest:
    request = _get_pending_request(db, request_id)
    equipment = db.get(Equipment, request.equipment_id)
    if equipment is None or equipment.status != EquipmentStatus.AVAILABLE:
        raise AppError(
            "EQUIPMENT_UNAVAILABLE", "Equipment is no longer available.", status_code=400
        )

    request.status = EquipmentRequestStatus.APPROVED
    equipment.status = EquipmentStatus.IN_USE
    db.commit()
    db.refresh(request)

    background_tasks.add_task(
        record_audit_log,
        current_user.id,
        "equipment_request.approved",
        "equipment_request",
        request.id,
        after_state=EquipmentRequestOut.model_validate(request).model_dump(mode="json"),
    )
    return request


@router.patch("/requests/{request_id}/reject", response_model=EquipmentRequestOut)
def reject_equipment_request(
    request_id: UUID,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role(Role.ADMIN)),
) -> EquipmentRequest:
    request = _get_pending_request(db, request_id)
    request.status = EquipmentRequestStatus.REJECTED
    db.commit()
    db.refresh(request)

    background_tasks.add_task(
        record_audit_log,
        current_user.id,
        "equipment_request.rejected",
        "equipment_request",
        request.id,
        after_state=EquipmentRequestOut.model_validate(request).model_dump(mode="json"),
    )
    return request


@router.patch("/{equipment_id}", response_model=EquipmentOut)
def update_equipment(
    equipment_id: UUID,
    payload: EquipmentUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role(Role.ADMIN)),
) -> Equipment:
    equipment = db.get(Equipment, equipment_id)
    if equipment is None:
        raise NotFoundError("Equipment not found")

    before = EquipmentOut.model_validate(equipment).model_dump(mode="json")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(equipment, field, value)
    db.commit()
    db.refresh(equipment)

    background_tasks.add_task(
        record_audit_log,
        current_user.id,
        "equipment.updated",
        "equipment",
        equipment.id,
        before_state=before,
        after_state=EquipmentOut.model_validate(equipment).model_dump(mode="json"),
    )
    return equipment
