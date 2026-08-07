"""Conflict-detection core (docs/RULES.md §3.3). Shared by Classroom Booking
(Module 3) and Lab Reservation (Module 4) — both write to the same `bookings`
table (docs/DECISIONS.md ADR-003), so they share one conflict-checking path.

Overlap uses a half-open interval [start, end): two windows that only touch at
a boundary do NOT conflict, matching the Postgres exclusion constraint's `[)`
bound (docs/DATABASE.md §2.4) and docs/TESTING.md §2.1's boundary-case rule.
"""

from dataclasses import dataclass
from datetime import datetime
from typing import Literal
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import ConflictError
from app.models.maintenance import MaintenanceSchedule
from app.models.reservation import Booking, BookingStatus


@dataclass(frozen=True)
class ConflictInfo:
    reason: Literal["maintenance", "booking"]
    conflicting_id: UUID | None
    window: tuple[datetime, datetime]


def find_conflict(
    db: Session,
    room_id: UUID,
    start: datetime,
    end: datetime,
    exclude_booking_id: UUID | None = None,
) -> ConflictInfo | None:
    maintenance = (
        db.execute(
            select(MaintenanceSchedule).where(
                MaintenanceSchedule.room_id == room_id,
                MaintenanceSchedule.start_time < end,
                MaintenanceSchedule.end_time > start,
            )
        )
        .scalars()
        .first()
    )
    if maintenance is not None:
        return ConflictInfo(
            reason="maintenance",
            conflicting_id=None,
            window=(maintenance.start_time, maintenance.end_time),
        )

    query = select(Booking).where(
        Booking.room_id == room_id,
        Booking.status == BookingStatus.CONFIRMED,
        Booking.start_time < end,
        Booking.end_time > start,
    )
    if exclude_booking_id is not None:
        query = query.where(Booking.id != exclude_booking_id)

    conflicting_booking = db.execute(query).scalars().first()
    if conflicting_booking is not None:
        return ConflictInfo(
            reason="booking",
            conflicting_id=conflicting_booking.id,
            window=(conflicting_booking.start_time, conflicting_booking.end_time),
        )

    return None


def conflict_to_error(conflict: ConflictInfo) -> ConflictError:
    """Matches docs/API.md §5's 409 error shape exactly."""
    window = [conflict.window[0].isoformat(), conflict.window[1].isoformat()]
    if conflict.reason == "maintenance":
        return ConflictError(
            "Room is under scheduled maintenance during the requested window.",
            details={"reason": "maintenance", "conflicting_window": window},
        )
    return ConflictError(
        "Room already booked for the requested window.",
        details={
            "reason": "booking",
            "conflicting_booking_id": str(conflict.conflicting_id),
            "conflicting_window": window,
        },
    )
