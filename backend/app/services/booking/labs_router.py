"""Lab Reservation — docs/API.md §6. Reuses the classroom booking infrastructure
(same `bookings` table, same conflict logic) since docs/DECISIONS.md ADR-003
unifies rooms across classroom/lab/venue; only the RBAC and room-type
constraint differ from Classroom Booking (Module 3).
"""

from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.errors import AppError
from app.core.security import CurrentUser, require_role
from app.models.campus import Room, RoomType
from app.models.reservation import Booking, BookingStatus, WaitlistEntry
from app.models.user import Role
from app.services.audit.service import record_audit_log
from app.services.booking.conflicts import find_conflict
from app.services.booking.labs_schemas import WaitlistEntryOut, WaitlistJoinRequest
from app.services.booking.schemas import AvailabilityResult, BookingCreate, BookingOut
from app.services.booking.service import create_booking_or_raise
from app.services.campus.schemas import RoomOut

router = APIRouter(prefix="/labs", tags=["labs"])

LAB_ROLES = (Role.STUDENT, Role.FACULTY)


@router.get("/availability", response_model=list[AvailabilityResult])
def check_lab_availability(
    start_time: datetime,
    end_time: datetime,
    building_id: UUID | None = None,
    min_capacity: int | None = Query(default=None, gt=0),
    db: Session = Depends(get_db),
    _current_user: CurrentUser = Depends(require_role(*LAB_ROLES)),
) -> list[AvailabilityResult]:
    if end_time <= start_time:
        raise AppError("INVALID_WINDOW", "end_time must be after start_time")

    query = select(Room).where(Room.is_active.is_(True), Room.type == RoomType.LAB)
    if building_id is not None:
        query = query.where(Room.building_id == building_id)
    if min_capacity is not None:
        query = query.where(Room.capacity >= min_capacity)

    rooms = db.execute(query.order_by(Room.name)).scalars().all()

    results: list[AvailabilityResult] = []
    for room in rooms:
        conflict = find_conflict(db, room.id, start_time, end_time)
        results.append(
            AvailabilityResult(
                room=RoomOut.model_validate(room),
                available=conflict is None,
                conflicting_window=conflict.window if conflict else None,
            )
        )
    return results


@router.post("/reservations", response_model=BookingOut, status_code=201)
def reserve_lab(
    payload: BookingCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role(*LAB_ROLES)),
) -> Booking:
    booking = create_booking_or_raise(
        db,
        room_id=payload.room_id,
        requester_id=current_user.id,
        start_time=payload.start_time,
        end_time=payload.end_time,
        purpose=payload.purpose,
        expected_type=RoomType.LAB,
        recurrence_type=payload.recurrence_type,
        recurrence_end_date=payload.recurrence_end_date,
        seat_number=payload.seat_number,
    )

    background_tasks.add_task(
        record_audit_log,
        current_user.id,
        "lab_reservation.created",
        "booking",
        booking.id,
        after_state=BookingOut.model_validate(booking).model_dump(mode="json"),
    )
    return booking


@router.post("/waitlist", response_model=WaitlistEntryOut, status_code=201)
def join_waitlist(
    payload: WaitlistJoinRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role(*LAB_ROLES)),
) -> WaitlistEntry:
    room = db.get(Room, payload.room_id)
    if room is None or room.type != RoomType.LAB:
        raise AppError("NOT_A_LAB", "This room is not a lab.", status_code=400)

    conflict = find_conflict(db, room.id, payload.start_time, payload.end_time)
    if conflict is None:
        raise AppError(
            "SLOT_AVAILABLE",
            "This slot is currently available — reserve it directly instead of waitlisting.",
            status_code=400,
        )

    next_position = (
        db.execute(
            select(func.coalesce(func.max(WaitlistEntry.position), 0)).where(
                WaitlistEntry.room_id == room.id
            )
        ).scalar_one()
        + 1
    )

    entry = WaitlistEntry(
        room_id=room.id,
        user_id=current_user.id,
        requested_start=payload.start_time,
        requested_end=payload.end_time,
        position=next_position,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.get("/waitlist/{room_id}", response_model=list[WaitlistEntryOut])
def view_waitlist(
    room_id: UUID,
    db: Session = Depends(get_db),
    _current_user: CurrentUser = Depends(require_role(Role.ADMIN)),
) -> list[WaitlistEntry]:
    query = (
        select(WaitlistEntry)
        .where(WaitlistEntry.room_id == room_id)
        .order_by(WaitlistEntry.position)
    )
    return list(db.execute(query).scalars().all())


@router.get("/{room_id}/occupied-seats", response_model=list[int])
def get_occupied_seats(
    room_id: UUID,
    start_time: datetime,
    end_time: datetime,
    db: Session = Depends(get_db),
    _current_user: CurrentUser = Depends(require_role(*LAB_ROLES)),
) -> list[int]:
    if end_time <= start_time:
        raise AppError("INVALID_WINDOW", "end_time must be after start_time")
    query = select(Booking.seat_number).where(
        Booking.room_id == room_id,
        Booking.status == BookingStatus.CONFIRMED,
        Booking.seat_number.is_not(None),
        Booking.start_time < end_time,
        Booking.end_time > start_time,
    )
    return [seat for seat in db.execute(query).scalars().all() if seat is not None]
