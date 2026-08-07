"""Per docs/TESTING.md §2.1-2.2 and docs/PRD.md FR-5.x."""

import uuid
from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.campus import Building, Room, RoomType
from app.models.user import Role
from tests.integration.auth_helpers import auth_headers, create_user

BASE = datetime(2026, 12, 1, 18, 0, tzinfo=UTC)


def _make_venue(db: Session) -> Room:
    building = Building(id=uuid.uuid4(), name="Convocation Hall", code=f"CH-{uuid.uuid4().hex[:6]}")
    db.add(building)
    db.commit()
    room = Room(
        id=uuid.uuid4(),
        building_id=building.id,
        name="Main Auditorium",
        type=RoomType.AUDITORIUM,
        capacity=500,
    )
    db.add(room)
    db.commit()
    db.refresh(room)
    return room


def _payload(room: Room, start: datetime = BASE, title: str = "Tech Fest") -> dict:
    return {
        "room_id": str(room.id),
        "title": title,
        "start_time": start.isoformat(),
        "end_time": (start + timedelta(hours=3)).isoformat(),
    }


def test_faculty_can_schedule_an_event(client: TestClient, db_session: Session) -> None:
    faculty = create_user(db_session, Role.FACULTY)
    room = _make_venue(db_session)

    response = client.post("/api/v1/events", json=_payload(room), headers=auth_headers(faculty))
    assert response.status_code == 201
    assert response.json()["status"] == "scheduled"


def test_admin_can_also_schedule_an_event(client: TestClient, db_session: Session) -> None:
    admin = create_user(db_session, Role.ADMIN)
    room = _make_venue(db_session)

    response = client.post("/api/v1/events", json=_payload(room), headers=auth_headers(admin))
    assert response.status_code == 201


def test_student_cannot_schedule_an_event(client: TestClient, db_session: Session) -> None:
    student = create_user(db_session, Role.STUDENT)
    room = _make_venue(db_session)

    response = client.post("/api/v1/events", json=_payload(room), headers=auth_headers(student))
    assert response.status_code == 403


def test_overlapping_event_returns_409(client: TestClient, db_session: Session) -> None:
    faculty = create_user(db_session, Role.FACULTY)
    room = _make_venue(db_session)
    client.post("/api/v1/events", json=_payload(room), headers=auth_headers(faculty))

    response = client.post(
        "/api/v1/events",
        json=_payload(room, start=BASE + timedelta(hours=1), title="Overlapping Talk"),
        headers=auth_headers(faculty),
    )
    assert response.status_code == 409
    assert response.json()["error"]["details"]["reason"] == "event"


def test_non_overlapping_event_at_the_same_venue_succeeds(
    client: TestClient, db_session: Session
) -> None:
    faculty = create_user(db_session, Role.FACULTY)
    room = _make_venue(db_session)
    client.post("/api/v1/events", json=_payload(room), headers=auth_headers(faculty))

    response = client.post(
        "/api/v1/events",
        json=_payload(room, start=BASE + timedelta(hours=3), title="Next Session"),
        headers=auth_headers(faculty),
    )
    assert response.status_code == 201


def test_organizer_can_cancel_their_event(client: TestClient, db_session: Session) -> None:
    faculty = create_user(db_session, Role.FACULTY)
    room = _make_venue(db_session)
    event = client.post("/api/v1/events", json=_payload(room), headers=auth_headers(faculty)).json()

    response = client.patch(f"/api/v1/events/{event['id']}/cancel", headers=auth_headers(faculty))
    assert response.status_code == 200
    assert response.json()["status"] == "cancelled"


def test_other_faculty_cannot_cancel_someone_elses_event(
    client: TestClient, db_session: Session
) -> None:
    organizer = create_user(db_session, Role.FACULTY, email="organizer@example.edu")
    other = create_user(db_session, Role.FACULTY, email="other@example.edu")
    room = _make_venue(db_session)
    event = client.post(
        "/api/v1/events", json=_payload(room), headers=auth_headers(organizer)
    ).json()

    response = client.patch(f"/api/v1/events/{event['id']}/cancel", headers=auth_headers(other))
    assert response.status_code == 403


def test_cancelling_frees_the_venue_for_a_new_event(
    client: TestClient, db_session: Session
) -> None:
    faculty = create_user(db_session, Role.FACULTY)
    room = _make_venue(db_session)
    event = client.post("/api/v1/events", json=_payload(room), headers=auth_headers(faculty)).json()
    client.patch(f"/api/v1/events/{event['id']}/cancel", headers=auth_headers(faculty))

    response = client.post("/api/v1/events", json=_payload(room), headers=auth_headers(faculty))
    assert response.status_code == 201


def test_any_authenticated_role_can_list_events(client: TestClient, db_session: Session) -> None:
    student = create_user(db_session, Role.STUDENT)
    response = client.get("/api/v1/events", headers=auth_headers(student))
    assert response.status_code == 200
