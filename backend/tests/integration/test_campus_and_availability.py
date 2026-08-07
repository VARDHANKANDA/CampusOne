import uuid
from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.campus import Building
from app.models.user import Role
from tests.integration.auth_helpers import auth_headers, create_user

BASE = datetime(2026, 10, 1, 9, 0, tzinfo=UTC)


def test_admin_can_create_building_and_room(client: TestClient, db_session: Session) -> None:
    admin = create_user(db_session, Role.ADMIN)

    building_response = client.post(
        "/api/v1/buildings",
        json={"name": "Engineering Block", "code": f"ENG-{uuid.uuid4().hex[:6]}"},
        headers=auth_headers(admin),
    )
    assert building_response.status_code == 201
    building_id = building_response.json()["id"]

    room_response = client.post(
        "/api/v1/rooms",
        json={
            "building_id": building_id,
            "name": "Room 210",
            "type": "classroom",
            "capacity": 60,
        },
        headers=auth_headers(admin),
    )
    assert room_response.status_code == 201
    assert room_response.json()["is_active"] is True


def test_student_cannot_create_room(client: TestClient, db_session: Session) -> None:
    student = create_user(db_session, Role.STUDENT)
    building = Building(id=uuid.uuid4(), name="X", code=f"X-{uuid.uuid4().hex[:6]}")
    db_session.add(building)
    db_session.commit()

    response = client.post(
        "/api/v1/rooms",
        json={"building_id": str(building.id), "name": "R1", "type": "classroom", "capacity": 10},
        headers=auth_headers(student),
    )
    assert response.status_code == 403


def test_any_authenticated_role_can_list_rooms(client: TestClient, db_session: Session) -> None:
    student = create_user(db_session, Role.STUDENT)
    response = client.get("/api/v1/rooms", headers=auth_headers(student))
    assert response.status_code == 200


def test_availability_reflects_an_existing_confirmed_booking(
    client: TestClient, db_session: Session
) -> None:
    admin = create_user(db_session, Role.ADMIN)
    faculty = create_user(db_session, Role.FACULTY)

    building = client.post(
        "/api/v1/buildings",
        json={"name": "Arts Block", "code": f"ART-{uuid.uuid4().hex[:6]}"},
        headers=auth_headers(admin),
    ).json()
    room = client.post(
        "/api/v1/rooms",
        json={
            "building_id": building["id"],
            "name": "Studio 1",
            "type": "classroom",
            "capacity": 25,
        },
        headers=auth_headers(admin),
    ).json()

    client.post(
        "/api/v1/bookings",
        json={
            "room_id": room["id"],
            "start_time": BASE.isoformat(),
            "end_time": (BASE + timedelta(hours=1)).isoformat(),
        },
        headers=auth_headers(faculty),
    )

    window_params = {
        "start_time": BASE.isoformat(),
        "end_time": (BASE + timedelta(hours=1)).isoformat(),
    }
    response = client.get(
        "/api/v1/bookings/availability", params=window_params, headers=auth_headers(faculty)
    )
    assert response.status_code == 200
    result = next(r for r in response.json() if r["room"]["id"] == room["id"])
    assert result["available"] is False
    assert result["conflicting_window"] is not None
