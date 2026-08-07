"""Per docs/TESTING.md §2.2 and docs/PRD.md FR-3.1-FR-3.4."""

import uuid
from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.campus import Building, Room, RoomType
from app.models.user import Role
from tests.integration.auth_helpers import auth_headers, create_user

BASE = datetime(2026, 11, 1, 9, 0, tzinfo=UTC)


def _make_room(db: Session, room_type: RoomType = RoomType.LAB) -> Room:
    building = Building(id=uuid.uuid4(), name="CS Block", code=f"CS-{uuid.uuid4().hex[:6]}")
    db.add(building)
    db.commit()
    room = Room(
        id=uuid.uuid4(),
        building_id=building.id,
        name="Networking Lab",
        type=room_type,
        capacity=20,
    )
    db.add(room)
    db.commit()
    db.refresh(room)
    return room


def _reservation_payload(room: Room, start: datetime = BASE) -> dict:
    return {
        "room_id": str(room.id),
        "start_time": start.isoformat(),
        "end_time": (start + timedelta(hours=1)).isoformat(),
    }


def test_student_can_reserve_a_lab(client: TestClient, db_session: Session) -> None:
    student = create_user(db_session, Role.STUDENT)
    room = _make_room(db_session)

    response = client.post(
        "/api/v1/labs/reservations",
        json=_reservation_payload(room),
        headers=auth_headers(student),
    )
    assert response.status_code == 201, response.text
    assert response.json()["status"] == "confirmed"


def test_faculty_can_also_reserve_a_lab(client: TestClient, db_session: Session) -> None:
    faculty = create_user(db_session, Role.FACULTY)
    room = _make_room(db_session)

    response = client.post(
        "/api/v1/labs/reservations",
        json=_reservation_payload(room),
        headers=auth_headers(faculty),
    )
    assert response.status_code == 201


def test_warden_cannot_reserve_a_lab(client: TestClient, db_session: Session) -> None:
    warden = create_user(db_session, Role.WARDEN)
    room = _make_room(db_session)

    response = client.post(
        "/api/v1/labs/reservations",
        json=_reservation_payload(room),
        headers=auth_headers(warden),
    )
    assert response.status_code == 403


def test_reserving_a_classroom_through_the_lab_endpoint_is_rejected(
    client: TestClient, db_session: Session
) -> None:
    student = create_user(db_session, Role.STUDENT)
    classroom = _make_room(db_session, room_type=RoomType.CLASSROOM)

    response = client.post(
        "/api/v1/labs/reservations",
        json=_reservation_payload(classroom),
        headers=auth_headers(student),
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "WRONG_ROOM_TYPE"


def test_overlapping_lab_reservation_returns_409(client: TestClient, db_session: Session) -> None:
    student_a = create_user(db_session, Role.STUDENT, email="a@example.edu")
    student_b = create_user(db_session, Role.STUDENT, email="b@example.edu")
    room = _make_room(db_session)

    client.post(
        "/api/v1/labs/reservations",
        json=_reservation_payload(room),
        headers=auth_headers(student_a),
    )
    response = client.post(
        "/api/v1/labs/reservations",
        json=_reservation_payload(room, start=BASE + timedelta(minutes=15)),
        headers=auth_headers(student_b),
    )
    assert response.status_code == 409


def test_a_student_can_view_and_cancel_their_own_lab_reservation(
    client: TestClient, db_session: Session
) -> None:
    student = create_user(db_session, Role.STUDENT)
    room = _make_room(db_session)
    created = client.post(
        "/api/v1/labs/reservations",
        json=_reservation_payload(room),
        headers=auth_headers(student),
    ).json()

    listed = client.get("/api/v1/bookings", headers=auth_headers(student))
    assert listed.status_code == 200
    assert len(listed.json()) == 1

    cancelled = client.patch(
        f"/api/v1/bookings/{created['id']}/cancel", headers=auth_headers(student)
    )
    assert cancelled.status_code == 200
    assert cancelled.json()["status"] == "cancelled"


def test_cannot_join_waitlist_for_an_open_slot(client: TestClient, db_session: Session) -> None:
    student = create_user(db_session, Role.STUDENT)
    room = _make_room(db_session)

    response = client.post(
        "/api/v1/labs/waitlist",
        json=_reservation_payload(room),
        headers=auth_headers(student),
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "SLOT_AVAILABLE"


def test_can_join_waitlist_when_slot_is_taken_and_admin_can_view_it(
    client: TestClient, db_session: Session
) -> None:
    student_a = create_user(db_session, Role.STUDENT, email="a@example.edu")
    student_b = create_user(db_session, Role.STUDENT, email="b@example.edu")
    admin = create_user(db_session, Role.ADMIN)
    room = _make_room(db_session)

    client.post(
        "/api/v1/labs/reservations",
        json=_reservation_payload(room),
        headers=auth_headers(student_a),
    )

    join_response = client.post(
        "/api/v1/labs/waitlist",
        json=_reservation_payload(room),
        headers=auth_headers(student_b),
    )
    assert join_response.status_code == 201
    assert join_response.json()["position"] == 1

    waitlist = client.get(f"/api/v1/labs/waitlist/{room.id}", headers=auth_headers(admin))
    assert waitlist.status_code == 200
    assert len(waitlist.json()) == 1
    assert waitlist.json()[0]["user_id"] == str(student_b.id)


def test_faculty_cannot_view_the_waitlist(client: TestClient, db_session: Session) -> None:
    faculty = create_user(db_session, Role.FACULTY)
    room = _make_room(db_session)

    response = client.get(f"/api/v1/labs/waitlist/{room.id}", headers=auth_headers(faculty))
    assert response.status_code == 403
