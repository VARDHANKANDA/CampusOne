"""Critical-path coverage per docs/TESTING.md §2.1: overlap detection at window
edges (touching is not a conflict; any real overlap is), cancellation freeing a
slot, and maintenance-block exclusion.
"""

import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy.orm import Session

from app.models.campus import Building, Room, RoomType
from app.models.maintenance import MaintenanceSchedule
from app.models.reservation import Booking, BookingStatus
from app.models.user import Role
from app.services.booking.conflicts import find_conflict
from tests.integration.auth_helpers import create_user

BASE = datetime(2026, 9, 1, 9, 0, tzinfo=UTC)


def _make_room(db: Session) -> Room:
    building = Building(id=uuid.uuid4(), name="Main Hall", code=f"MH-{uuid.uuid4().hex[:6]}")
    db.add(building)
    db.commit()
    room = Room(
        id=uuid.uuid4(),
        building_id=building.id,
        name="Room 101",
        type=RoomType.CLASSROOM,
        capacity=40,
    )
    db.add(room)
    db.commit()
    db.refresh(room)
    return room


def _make_booking(
    db: Session, room: Room, start: datetime, end: datetime, status: BookingStatus
) -> Booking:
    requester = create_user(db, Role.FACULTY)
    booking = Booking(
        room_id=room.id, requester_id=requester.id, start_time=start, end_time=end, status=status
    )
    db.add(booking)
    db.commit()
    return booking


def test_no_conflict_when_room_has_no_bookings(db_session: Session) -> None:
    room = _make_room(db_session)
    assert find_conflict(db_session, room.id, BASE, BASE + timedelta(hours=1)) is None


def test_exact_overlap_is_a_conflict(db_session: Session) -> None:
    room = _make_room(db_session)
    _make_booking(db_session, room, BASE, BASE + timedelta(hours=1), BookingStatus.CONFIRMED)

    conflict = find_conflict(db_session, room.id, BASE, BASE + timedelta(hours=1))
    assert conflict is not None
    assert conflict.reason == "booking"


def test_partial_overlap_is_a_conflict(db_session: Session) -> None:
    room = _make_room(db_session)
    _make_booking(
        db_session,
        room,
        BASE,
        BASE + timedelta(hours=2),
        BookingStatus.CONFIRMED,
    )

    # Requested window starts 30 min into the existing booking.
    conflict = find_conflict(
        db_session, room.id, BASE + timedelta(minutes=30), BASE + timedelta(hours=3)
    )
    assert conflict is not None


def test_touching_boundary_is_not_a_conflict(db_session: Session) -> None:
    room = _make_room(db_session)
    _make_booking(db_session, room, BASE, BASE + timedelta(hours=1), BookingStatus.CONFIRMED)

    # New request starts exactly when the existing one ends — half-open
    # interval means this is adjacent, not overlapping.
    conflict = find_conflict(
        db_session, room.id, BASE + timedelta(hours=1), BASE + timedelta(hours=2)
    )
    assert conflict is None


def test_cancelled_booking_does_not_block_the_slot(db_session: Session) -> None:
    room = _make_room(db_session)
    _make_booking(db_session, room, BASE, BASE + timedelta(hours=1), BookingStatus.CANCELLED)

    conflict = find_conflict(db_session, room.id, BASE, BASE + timedelta(hours=1))
    assert conflict is None


def test_pending_booking_does_not_block_the_slot(db_session: Session) -> None:
    room = _make_room(db_session)
    _make_booking(db_session, room, BASE, BASE + timedelta(hours=1), BookingStatus.PENDING)

    conflict = find_conflict(db_session, room.id, BASE, BASE + timedelta(hours=1))
    assert conflict is None


def test_maintenance_block_is_a_conflict(db_session: Session) -> None:
    room = _make_room(db_session)
    db_session.add(
        MaintenanceSchedule(
            id=uuid.uuid4(),
            room_id=room.id,
            start_time=BASE,
            end_time=BASE + timedelta(hours=4),
            reason="AC repair",
        )
    )
    db_session.commit()

    conflict = find_conflict(
        db_session, room.id, BASE + timedelta(hours=1), BASE + timedelta(hours=2)
    )
    assert conflict is not None
    assert conflict.reason == "maintenance"


def test_exclude_booking_id_lets_a_booking_ignore_itself(db_session: Session) -> None:
    room = _make_room(db_session)
    booking = _make_booking(
        db_session, room, BASE, BASE + timedelta(hours=1), BookingStatus.CONFIRMED
    )

    # Re-checking the same booking's own window (e.g. during approval) should
    # not conflict with itself.
    conflict = find_conflict(
        db_session, room.id, BASE, BASE + timedelta(hours=1), exclude_booking_id=booking.id
    )
    assert conflict is None
