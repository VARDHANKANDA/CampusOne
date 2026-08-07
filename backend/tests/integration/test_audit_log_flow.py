"""Per docs/TESTING.md §2.2 and docs/PRD.md FR-13.x."""

import uuid
from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.campus import Building, Room, RoomType
from app.models.user import Role
from tests.integration.auth_helpers import auth_headers, create_user

BASE = datetime(2027, 3, 1, 9, 0, tzinfo=UTC)


def _make_room(db: Session) -> Room:
    building = Building(id=uuid.uuid4(), name="Audit Hall", code=f"AU-{uuid.uuid4().hex[:6]}")
    db.add(building)
    db.commit()
    room = Room(
        id=uuid.uuid4(),
        building_id=building.id,
        name="Room AU1",
        type=RoomType.CLASSROOM,
        capacity=20,
    )
    db.add(room)
    db.commit()
    db.refresh(room)
    return room


def test_booking_creation_is_audit_logged(client: TestClient, db_session: Session) -> None:
    faculty = create_user(db_session, Role.FACULTY)
    admin = create_user(db_session, Role.ADMIN)
    room = _make_room(db_session)

    client.post(
        "/api/v1/bookings",
        json={
            "room_id": str(room.id),
            "start_time": BASE.isoformat(),
            "end_time": (BASE + timedelta(hours=1)).isoformat(),
        },
        headers=auth_headers(faculty),
    )

    response = client.get(
        "/api/v1/audit-logs", params={"entity_type": "booking"}, headers=auth_headers(admin)
    )
    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["action"] == "booking.created"
    assert body[0]["actor_id"] == str(faculty.id)
    assert body[0]["after_state"] is not None


def test_filter_by_actor_id(client: TestClient, db_session: Session) -> None:
    faculty_a = create_user(db_session, Role.FACULTY, email="a@example.edu")
    faculty_b = create_user(db_session, Role.FACULTY, email="b@example.edu")
    admin = create_user(db_session, Role.ADMIN)
    room = _make_room(db_session)

    client.post(
        "/api/v1/bookings",
        json={
            "room_id": str(room.id),
            "start_time": BASE.isoformat(),
            "end_time": (BASE + timedelta(hours=1)).isoformat(),
        },
        headers=auth_headers(faculty_a),
    )
    client.post(
        "/api/v1/bookings",
        json={
            "room_id": str(room.id),
            "start_time": (BASE + timedelta(hours=2)).isoformat(),
            "end_time": (BASE + timedelta(hours=3)).isoformat(),
        },
        headers=auth_headers(faculty_b),
    )

    response = client.get(
        "/api/v1/audit-logs", params={"actor_id": str(faculty_a.id)}, headers=auth_headers(admin)
    )
    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["actor_id"] == str(faculty_a.id)


def test_non_admin_cannot_view_audit_logs(client: TestClient, db_session: Session) -> None:
    faculty = create_user(db_session, Role.FACULTY)
    response = client.get("/api/v1/audit-logs", headers=auth_headers(faculty))
    assert response.status_code == 403


def test_audit_logs_are_paginated(client: TestClient, db_session: Session) -> None:
    admin = create_user(db_session, Role.ADMIN)
    response = client.get(
        "/api/v1/audit-logs", params={"page": 1, "page_size": 5}, headers=auth_headers(admin)
    )
    assert response.status_code == 200
    assert len(response.json()) <= 5
