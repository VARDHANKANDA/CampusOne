"""Reports & Analytics — docs/API.md §13, docs/PRD.md FR-12.x.

Role-scoped per FR-12.4: admin sees everything; warden gets complaint stats
only (hostel-related); faculty gets attendance only (their own sessions).
"""

from datetime import datetime
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import InstrumentedAttribute, Session

from app.core.database import get_db
from app.core.security import CurrentUser, require_role
from app.models.campus import Room
from app.models.complaint import Complaint
from app.models.equipment import Equipment
from app.models.maintenance import MaintenanceRequest, MaintenanceRequestStatus
from app.models.reservation import Booking, BookingStatus
from app.models.user import Role
from app.services.analytics.schemas import (
    ComplaintStatsOut,
    EquipmentStatsOut,
    MaintenanceStatsOut,
    RoomUtilizationOut,
)
from app.services.attendance.schemas import SessionReportOut
from app.services.attendance.service import get_session_reports

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/room-utilization", response_model=list[RoomUtilizationOut])
def room_utilization(
    building_id: UUID | None = None,
    from_time: datetime | None = Query(default=None, alias="from"),
    to_time: datetime | None = Query(default=None, alias="to"),
    db: Session = Depends(get_db),
    _current_user: CurrentUser = Depends(require_role(Role.ADMIN)),
) -> list[RoomUtilizationOut]:
    query = select(
        Room.id,
        Room.name,
        func.count(Booking.id),
        func.coalesce(
            func.sum(func.extract("epoch", Booking.end_time - Booking.start_time) / 3600), 0.0
        ),
    ).outerjoin(Booking, (Booking.room_id == Room.id) & (Booking.status == BookingStatus.CONFIRMED))
    if building_id is not None:
        query = query.where(Room.building_id == building_id)
    if from_time is not None:
        query = query.where((Booking.id.is_(None)) | (Booking.end_time >= from_time))
    if to_time is not None:
        query = query.where((Booking.id.is_(None)) | (Booking.start_time <= to_time))

    query = query.group_by(Room.id, Room.name).order_by(Room.name)
    rows = db.execute(query).all()
    return [
        RoomUtilizationOut(
            room_id=room_id, room_name=room_name, confirmed_bookings=count, total_hours=float(hours)
        )
        for room_id, room_name, count, hours in rows
    ]


def _count_by(db: Session, column: InstrumentedAttribute[Any]) -> dict[str, int]:
    rows = db.execute(select(column, func.count()).group_by(column)).all()
    return {value.value: count for value, count in rows}


@router.get("/complaints", response_model=ComplaintStatsOut)
def complaint_stats(
    db: Session = Depends(get_db),
    _current_user: CurrentUser = Depends(require_role(Role.ADMIN, Role.WARDEN)),
) -> ComplaintStatsOut:
    return ComplaintStatsOut(
        by_status=_count_by(db, Complaint.status),
        by_category=_count_by(db, Complaint.category),
        by_priority=_count_by(db, Complaint.priority),
    )


@router.get("/attendance", response_model=list[SessionReportOut])
def attendance_stats(
    course_code: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role(Role.FACULTY, Role.ADMIN)),
) -> list[SessionReportOut]:
    return get_session_reports(db, current_user, course_code)


@router.get("/equipment", response_model=EquipmentStatsOut)
def equipment_stats(
    db: Session = Depends(get_db),
    _current_user: CurrentUser = Depends(require_role(Role.ADMIN)),
) -> EquipmentStatsOut:
    return EquipmentStatsOut(
        by_status=_count_by(db, Equipment.status),
        by_category=_count_by(db, Equipment.category),
    )


@router.get("/maintenance", response_model=MaintenanceStatsOut)
def maintenance_stats(
    from_time: datetime | None = Query(default=None, alias="from"),
    to_time: datetime | None = Query(default=None, alias="to"),
    db: Session = Depends(get_db),
    _current_user: CurrentUser = Depends(require_role(Role.ADMIN)),
) -> MaintenanceStatsOut:
    query = select(MaintenanceRequest)
    if from_time is not None:
        query = query.where(MaintenanceRequest.created_at >= from_time)
    if to_time is not None:
        query = query.where(MaintenanceRequest.created_at <= to_time)

    requests = list(db.execute(query).scalars().all())
    resolution_seconds = [
        (r.actual_completion - r.created_at).total_seconds()
        for r in requests
        if r.status == MaintenanceRequestStatus.COMPLETED and r.actual_completion is not None
    ]

    average_hours = None
    if resolution_seconds:
        average_hours = (sum(resolution_seconds) / len(resolution_seconds)) / 3600

    return MaintenanceStatsOut(
        total_requests=len(requests),
        completed_requests=len(resolution_seconds),
        average_resolution_hours=average_hours,
    )
