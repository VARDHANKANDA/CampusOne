"""Classroom booking — docs/API.md §5. Lab Reservation (Module 4, `labs_router.py`)
reuses `create_booking_or_raise` and the RBAC/ownership helpers below.
"""

from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, Query, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.errors import AppError, ConflictError, ForbiddenError, NotFoundError
from app.core.security import CurrentUser, require_role
from app.models.campus import Room, RoomType
from app.models.reservation import Booking, BookingStatus
from app.models.user import Role
from app.services.audit.service import record_audit_log
from app.services.booking.conflicts import conflict_to_error, find_conflict
from app.services.booking.schemas import AvailabilityResult, BookingCreate, BookingOut
from app.services.booking.service import create_booking_or_raise
from app.services.campus.schemas import RoomOut
from app.services.notification.service import promote_waitlist, queue_notification

router = APIRouter(prefix="/bookings", tags=["bookings"])

# A booking's requester can be a student or faculty (labs allow both, per
# docs/API.md §6); ownership/admin checks below apply regardless of which.
BOOKING_VIEWER_ROLES = (Role.STUDENT, Role.FACULTY, Role.ADMIN)


@router.get("/availability", response_model=list[AvailabilityResult])
def check_availability(
    start_time: datetime,
    end_time: datetime,
    building_id: UUID | None = None,
    type: RoomType | None = None,  # noqa: A002
    min_capacity: int | None = Query(default=None, gt=0),
    db: Session = Depends(get_db),
    _current_user: CurrentUser = Depends(require_role(Role.FACULTY, Role.ADMIN)),
) -> list[AvailabilityResult]:
    if end_time <= start_time:
        raise AppError("INVALID_WINDOW", "end_time must be after start_time")

    query = select(Room).where(Room.is_active.is_(True))
    if building_id is not None:
        query = query.where(Room.building_id == building_id)
    if type is not None:
        query = query.where(Room.type == type)
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


@router.post("", response_model=BookingOut, status_code=status.HTTP_201_CREATED)
def create_booking(
    payload: BookingCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role(Role.FACULTY)),
) -> Booking:
    booking = create_booking_or_raise(
        db,
        room_id=payload.room_id,
        requester_id=current_user.id,
        start_time=payload.start_time,
        end_time=payload.end_time,
        purpose=payload.purpose,
        expected_type=RoomType.CLASSROOM,
    )

    background_tasks.add_task(
        record_audit_log,
        current_user.id,
        "booking.created",
        "booking",
        booking.id,
        after_state=BookingOut.model_validate(booking).model_dump(mode="json"),
    )
    if booking.status == BookingStatus.CONFIRMED:
        background_tasks.add_task(
            queue_notification,
            booking.requester_id,
            "booking_confirmed",
            {"booking_id": str(booking.id), "room_id": str(booking.room_id)},
        )
    return booking


@router.get("", response_model=list[BookingOut])
def list_bookings(
    room_id: UUID | None = None,
    status_filter: BookingStatus | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role(*BOOKING_VIEWER_ROLES)),
) -> list[Booking]:
    query = select(Booking)
    if current_user.role != Role.ADMIN:
        query = query.where(Booking.requester_id == current_user.id)
    if room_id is not None:
        query = query.where(Booking.room_id == room_id)
    if status_filter is not None:
        query = query.where(Booking.status == status_filter)
    return list(db.execute(query.order_by(Booking.start_time.desc())).scalars().all())


def get_owned_or_admin_booking(db: Session, booking_id: UUID, current_user: CurrentUser) -> Booking:
    booking = db.get(Booking, booking_id)
    if booking is None:
        raise NotFoundError("Booking not found")
    if current_user.role != Role.ADMIN and booking.requester_id != current_user.id:
        raise ForbiddenError("You may only access your own bookings.")
    return booking


@router.get("/{booking_id}", response_model=BookingOut)
def get_booking(
    booking_id: UUID,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role(*BOOKING_VIEWER_ROLES)),
) -> Booking:
    return get_owned_or_admin_booking(db, booking_id, current_user)


@router.patch("/{booking_id}/cancel", response_model=BookingOut)
def cancel_booking(
    booking_id: UUID,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role(*BOOKING_VIEWER_ROLES)),
) -> Booking:
    booking = get_owned_or_admin_booking(db, booking_id, current_user)
    if booking.status not in (BookingStatus.PENDING, BookingStatus.CONFIRMED):
        raise AppError(
            "INVALID_STATE_TRANSITION",
            f"Cannot cancel a booking in status '{booking.status.value}'.",
            status_code=400,
        )

    before = BookingOut.model_validate(booking).model_dump(mode="json")
    booking.status = BookingStatus.CANCELLED
    db.commit()
    db.refresh(booking)

    background_tasks.add_task(
        queue_notification,
        booking.requester_id,
        "booking_cancelled",
        {"booking_id": str(booking.id), "room_id": str(booking.room_id)},
    )
    # Notifies the top of this room's waitlist if the freed window matches
    # what they requested (docs/PRD.md FR-3.4, docs/DECISIONS.md ADR-013).
    background_tasks.add_task(
        promote_waitlist, booking.room_id, booking.start_time, booking.end_time
    )

    background_tasks.add_task(
        record_audit_log,
        current_user.id,
        "booking.cancelled",
        "booking",
        booking.id,
        before_state=before,
        after_state=BookingOut.model_validate(booking).model_dump(mode="json"),
    )
    return booking


@router.patch("/{booking_id}/approve", response_model=BookingOut)
def approve_booking(
    booking_id: UUID,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role(Role.ADMIN)),
) -> Booking:
    booking = db.get(Booking, booking_id)
    if booking is None:
        raise NotFoundError("Booking not found")
    if booking.status != BookingStatus.PENDING:
        raise AppError(
            "INVALID_STATE_TRANSITION",
            f"Only pending bookings can be approved (current status: '{booking.status.value}').",
            status_code=400,
        )

    # Re-check: time has passed since submission, another booking may have
    # taken the slot in the meantime.
    conflict = find_conflict(
        db, booking.room_id, booking.start_time, booking.end_time, exclude_booking_id=booking.id
    )
    if conflict is not None:
        raise conflict_to_error(conflict)

    before = BookingOut.model_validate(booking).model_dump(mode="json")
    booking.status = BookingStatus.CONFIRMED
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise ConflictError("Room already booked for the requested window.") from exc
    db.refresh(booking)

    background_tasks.add_task(
        record_audit_log,
        current_user.id,
        "booking.approved",
        "booking",
        booking.id,
        before_state=before,
        after_state=BookingOut.model_validate(booking).model_dump(mode="json"),
    )
    return booking


@router.patch("/{booking_id}/reject", response_model=BookingOut)
def reject_booking(
    booking_id: UUID,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role(Role.ADMIN)),
) -> Booking:
    booking = db.get(Booking, booking_id)
    if booking is None:
        raise NotFoundError("Booking not found")
    if booking.status != BookingStatus.PENDING:
        raise AppError(
            "INVALID_STATE_TRANSITION",
            f"Only pending bookings can be rejected (current status: '{booking.status.value}').",
            status_code=400,
        )

    before = BookingOut.model_validate(booking).model_dump(mode="json")
    booking.status = BookingStatus.REJECTED
    db.commit()
    db.refresh(booking)

    background_tasks.add_task(
        record_audit_log,
        current_user.id,
        "booking.rejected",
        "booking",
        booking.id,
        before_state=before,
        after_state=BookingOut.model_validate(booking).model_dump(mode="json"),
    )
    return booking
