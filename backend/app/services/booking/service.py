"""Shared create-booking logic for Classroom Booking (Module 3) and Lab
Reservation (Module 4) — both write the same `bookings` table (docs/DECISIONS.md
ADR-003) through the same validation order (docs/RULES.md §3.3).
"""

from datetime import datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import AppError, ConflictError, NotFoundError
from app.models.campus import Room, RoomType
from app.models.reservation import Booking, BookingStatus
from app.services.booking.conflicts import conflict_to_error, find_conflict


def create_booking_or_raise(
    db: Session,
    room_id: UUID,
    requester_id: UUID,
    start_time: datetime,
    end_time: datetime,
    purpose: str | None,
    expected_type: RoomType | None = None,
) -> Booking:
    # Row-level lock serializes concurrent booking attempts on this room for
    # the lifetime of this transaction (docs/RULES.md §3.2); the DB exclusion
    # constraint below is the second line of defense (docs/DECISIONS.md ADR-002).
    room = db.execute(select(Room).where(Room.id == room_id).with_for_update()).scalar_one_or_none()
    if room is None:
        raise NotFoundError("Room not found")
    if expected_type is not None and room.type != expected_type:
        raise AppError(
            "WRONG_ROOM_TYPE",
            f"Room '{room.name}' is not a {expected_type.value}.",
            status_code=400,
        )
    if not room.is_active:
        raise AppError(
            "ROOM_INACTIVE", "This room is not active and cannot be booked.", status_code=400
        )

    conflict = find_conflict(db, room.id, start_time, end_time)
    if conflict is not None:
        raise conflict_to_error(conflict)

    booking = Booking(
        room_id=room.id,
        requester_id=requester_id,
        start_time=start_time,
        end_time=end_time,
        purpose=purpose,
        status=BookingStatus.PENDING if room.requires_approval else BookingStatus.CONFIRMED,
    )
    db.add(booking)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise ConflictError(
            "Room already booked for the requested window.",
            details={"reason": "booking"},
        ) from exc
    db.refresh(booking)
    return booking
