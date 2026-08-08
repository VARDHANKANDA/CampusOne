from datetime import datetime, timedelta
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import AppError, ConflictError, NotFoundError
from app.models.campus import Room, RoomType
from app.models.reservation import Booking, BookingStatus, RecurrenceType
from app.services.booking.conflicts import conflict_to_error, find_conflict


def create_booking_or_raise(
    db: Session,
    room_id: UUID,
    requester_id: UUID,
    start_time: datetime,
    end_time: datetime,
    purpose: str | None,
    expected_type: RoomType | None = None,
    recurrence_type: RecurrenceType = RecurrenceType.NONE,
    recurrence_end_date: datetime | None = None,
    seat_number: int | None = None,
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

    # 1. Resolve all slots to check
    slots: list[tuple[datetime, datetime]] = []
    if recurrence_type != RecurrenceType.NONE and recurrence_end_date is not None:
        curr_start = start_time
        curr_end = end_time
        while curr_start <= recurrence_end_date:
            slots.append((curr_start, curr_end))
            if recurrence_type == RecurrenceType.DAILY:
                curr_start += timedelta(days=1)
                curr_end += timedelta(days=1)
            elif recurrence_type == RecurrenceType.WEEKLY:
                curr_start += timedelta(weeks=1)
                curr_end += timedelta(weeks=1)
            else:
                break
    else:
        slots.append((start_time, end_time))

    # 2. Check conflicts for ALL slots in advance
    for s_start, s_end in slots:
        conflict = find_conflict(db, room.id, s_start, s_end, seat_number=seat_number)
        if conflict is not None:
            if recurrence_type == RecurrenceType.NONE:
                raise conflict_to_error(conflict)
            else:
                date_str = s_start.strftime("%Y-%m-%d")
                window = f"{s_start.strftime('%H:%M')} - {s_end.strftime('%H:%M')}"
                raise ConflictError(
                    f"Recurrence slot conflict on {date_str} ({window}).",
                    details={
                        "conflict_date": date_str,
                        "start": s_start.isoformat(),
                        "end": s_end.isoformat(),
                    },
                )

    # 3. Create parent booking
    parent_status = BookingStatus.PENDING if room.requires_approval else BookingStatus.CONFIRMED
    booking = Booking(
        room_id=room.id,
        requester_id=requester_id,
        start_time=slots[0][0],
        end_time=slots[0][1],
        purpose=purpose,
        status=parent_status,
        recurrence_type=recurrence_type,
        recurrence_end_date=recurrence_end_date,
        seat_number=seat_number,
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

    # 4. Create child bookings (if recurring)
    if len(slots) > 1:
        for s_start, s_end in slots[1:]:
            child_booking = Booking(
                room_id=room.id,
                requester_id=requester_id,
                start_time=s_start,
                end_time=s_end,
                purpose=purpose,
                status=parent_status,
                recurrence_type=RecurrenceType.NONE,
                recurrence_parent_id=booking.id,
                seat_number=seat_number,
            )
            db.add(child_booking)
        try:
            db.commit()
        except IntegrityError as exc:
            db.rollback()
            raise ConflictError(
                "A recurring slot conflict occurred under concurrent edits.",
                details={"reason": "recurrence_booking"},
            ) from exc

    return booking
