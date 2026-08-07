"""Per docs/TESTING.md §2.2: happy path + RBAC failure + conflict failure per
endpoint, plus the concurrency-adjacent state-transition rules around approval.
"""

import uuid
from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.campus import Building, Room, RoomType
from app.models.user import Role
from tests.integration.auth_helpers import auth_headers, create_user

BASE = datetime(2026, 9, 15, 10, 0, tzinfo=UTC)


def _make_room(db: Session, requires_approval: bool = False) -> Room:
    building = Building(id=uuid.uuid4(), name="Science Block", code=f"SB-{uuid.uuid4().hex[:6]}")
    db.add(building)
    db.commit()
    room = Room(
        id=uuid.uuid4(),
        building_id=building.id,
        name="Lecture Hall A",
        type=RoomType.CLASSROOM,
        capacity=100,
        requires_approval=requires_approval,
    )
    db.add(room)
    db.commit()
    db.refresh(room)
    return room


def _booking_payload(room: Room, start: datetime = BASE, hours: int = 1) -> dict:
    return {
        "room_id": str(room.id),
        "start_time": start.isoformat(),
        "end_time": (start + timedelta(hours=hours)).isoformat(),
        "purpose": "Guest lecture",
    }


def test_faculty_can_create_booking_and_it_auto_confirms(
    client: TestClient, db_session: Session
) -> None:
    faculty = create_user(db_session, Role.FACULTY)
    room = _make_room(db_session)

    response = client.post(
        "/api/v1/bookings", json=_booking_payload(room), headers=auth_headers(faculty)
    )
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["status"] == "confirmed"
    assert body["requester_id"] == str(faculty.id)


def test_student_cannot_create_booking(client: TestClient, db_session: Session) -> None:
    student = create_user(db_session, Role.STUDENT)
    room = _make_room(db_session)

    response = client.post(
        "/api/v1/bookings", json=_booking_payload(room), headers=auth_headers(student)
    )
    assert response.status_code == 403


def test_overlapping_booking_returns_409_with_conflicting_window(
    client: TestClient, db_session: Session
) -> None:
    faculty = create_user(db_session, Role.FACULTY)
    room = _make_room(db_session)

    first = client.post(
        "/api/v1/bookings", json=_booking_payload(room), headers=auth_headers(faculty)
    )
    assert first.status_code == 201

    second = client.post(
        "/api/v1/bookings",
        json=_booking_payload(room, start=BASE + timedelta(minutes=30)),
        headers=auth_headers(faculty),
    )
    assert second.status_code == 409
    body = second.json()
    assert body["error"]["code"] == "RESOURCE_CONFLICT"
    assert body["error"]["details"]["reason"] == "booking"
    assert "conflicting_window" in body["error"]["details"]


def test_faculty_sees_only_their_own_bookings(client: TestClient, db_session: Session) -> None:
    faculty_a = create_user(db_session, Role.FACULTY, email="a@example.edu")
    faculty_b = create_user(db_session, Role.FACULTY, email="b@example.edu")
    room = _make_room(db_session)

    client.post("/api/v1/bookings", json=_booking_payload(room), headers=auth_headers(faculty_a))
    client.post(
        "/api/v1/bookings",
        json=_booking_payload(room, start=BASE + timedelta(hours=5)),
        headers=auth_headers(faculty_b),
    )

    response = client.get("/api/v1/bookings", headers=auth_headers(faculty_a))
    assert response.status_code == 200
    bookings = response.json()
    assert len(bookings) == 1
    assert bookings[0]["requester_id"] == str(faculty_a.id)


def test_admin_sees_all_bookings(client: TestClient, db_session: Session) -> None:
    faculty = create_user(db_session, Role.FACULTY)
    admin = create_user(db_session, Role.ADMIN)
    room = _make_room(db_session)
    client.post("/api/v1/bookings", json=_booking_payload(room), headers=auth_headers(faculty))

    response = client.get("/api/v1/bookings", headers=auth_headers(admin))
    assert response.status_code == 200
    assert len(response.json()) == 1


def test_owner_can_cancel_their_booking(client: TestClient, db_session: Session) -> None:
    faculty = create_user(db_session, Role.FACULTY)
    room = _make_room(db_session)
    created = client.post(
        "/api/v1/bookings", json=_booking_payload(room), headers=auth_headers(faculty)
    ).json()

    response = client.patch(
        f"/api/v1/bookings/{created['id']}/cancel", headers=auth_headers(faculty)
    )
    assert response.status_code == 200
    assert response.json()["status"] == "cancelled"


def test_other_faculty_cannot_cancel_someone_elses_booking(
    client: TestClient, db_session: Session
) -> None:
    owner = create_user(db_session, Role.FACULTY, email="owner@example.edu")
    other = create_user(db_session, Role.FACULTY, email="other@example.edu")
    room = _make_room(db_session)
    created = client.post(
        "/api/v1/bookings", json=_booking_payload(room), headers=auth_headers(owner)
    ).json()

    response = client.patch(f"/api/v1/bookings/{created['id']}/cancel", headers=auth_headers(other))
    assert response.status_code == 403


def test_cancelling_an_already_cancelled_booking_is_rejected(
    client: TestClient, db_session: Session
) -> None:
    faculty = create_user(db_session, Role.FACULTY)
    room = _make_room(db_session)
    created = client.post(
        "/api/v1/bookings", json=_booking_payload(room), headers=auth_headers(faculty)
    ).json()
    client.patch(f"/api/v1/bookings/{created['id']}/cancel", headers=auth_headers(faculty))

    response = client.patch(
        f"/api/v1/bookings/{created['id']}/cancel", headers=auth_headers(faculty)
    )
    assert response.status_code == 400


def test_cancelling_frees_the_slot_for_a_new_booking(
    client: TestClient, db_session: Session
) -> None:
    faculty = create_user(db_session, Role.FACULTY)
    room = _make_room(db_session)
    created = client.post(
        "/api/v1/bookings", json=_booking_payload(room), headers=auth_headers(faculty)
    ).json()
    client.patch(f"/api/v1/bookings/{created['id']}/cancel", headers=auth_headers(faculty))

    response = client.post(
        "/api/v1/bookings", json=_booking_payload(room), headers=auth_headers(faculty)
    )
    assert response.status_code == 201


def test_room_requiring_approval_creates_pending_booking(
    client: TestClient, db_session: Session
) -> None:
    faculty = create_user(db_session, Role.FACULTY)
    room = _make_room(db_session, requires_approval=True)

    response = client.post(
        "/api/v1/bookings", json=_booking_payload(room), headers=auth_headers(faculty)
    )
    assert response.status_code == 201
    assert response.json()["status"] == "pending"


def test_admin_can_approve_a_pending_booking(client: TestClient, db_session: Session) -> None:
    faculty = create_user(db_session, Role.FACULTY)
    admin = create_user(db_session, Role.ADMIN)
    room = _make_room(db_session, requires_approval=True)
    created = client.post(
        "/api/v1/bookings", json=_booking_payload(room), headers=auth_headers(faculty)
    ).json()

    response = client.patch(
        f"/api/v1/bookings/{created['id']}/approve", headers=auth_headers(admin)
    )
    assert response.status_code == 200
    assert response.json()["status"] == "confirmed"


def test_admin_can_reject_a_pending_booking(client: TestClient, db_session: Session) -> None:
    faculty = create_user(db_session, Role.FACULTY)
    admin = create_user(db_session, Role.ADMIN)
    room = _make_room(db_session, requires_approval=True)
    created = client.post(
        "/api/v1/bookings", json=_booking_payload(room), headers=auth_headers(faculty)
    ).json()

    response = client.patch(f"/api/v1/bookings/{created['id']}/reject", headers=auth_headers(admin))
    assert response.status_code == 200
    assert response.json()["status"] == "rejected"


def test_faculty_cannot_approve_bookings(client: TestClient, db_session: Session) -> None:
    faculty = create_user(db_session, Role.FACULTY)
    room = _make_room(db_session, requires_approval=True)
    created = client.post(
        "/api/v1/bookings", json=_booking_payload(room), headers=auth_headers(faculty)
    ).json()

    response = client.patch(
        f"/api/v1/bookings/{created['id']}/approve", headers=auth_headers(faculty)
    )
    assert response.status_code == 403


def test_approving_an_already_confirmed_booking_is_rejected(
    client: TestClient, db_session: Session
) -> None:
    faculty = create_user(db_session, Role.FACULTY)
    admin = create_user(db_session, Role.ADMIN)
    room = _make_room(db_session)  # auto-confirms
    created = client.post(
        "/api/v1/bookings", json=_booking_payload(room), headers=auth_headers(faculty)
    ).json()

    response = client.patch(
        f"/api/v1/bookings/{created['id']}/approve", headers=auth_headers(admin)
    )
    assert response.status_code == 400
