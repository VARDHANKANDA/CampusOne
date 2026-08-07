"""Per docs/TESTING.md §2.2 and docs/PRD.md FR-12.x."""

import uuid
from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.campus import Building, Room, RoomType
from app.models.equipment import Equipment, EquipmentCategory, EquipmentStatus
from app.models.user import Role
from tests.integration.auth_helpers import auth_headers, create_user

BASE = datetime(2027, 2, 1, 9, 0, tzinfo=UTC)
FAKE_IMAGE = ("photo.jpg", b"fake-image-bytes", "image/jpeg")


def _make_room(db: Session) -> Room:
    building = Building(id=uuid.uuid4(), name="Analytics Hall", code=f"AH-{uuid.uuid4().hex[:6]}")
    db.add(building)
    db.commit()
    room = Room(
        id=uuid.uuid4(),
        building_id=building.id,
        name="Room A1",
        type=RoomType.CLASSROOM,
        capacity=30,
    )
    db.add(room)
    db.commit()
    db.refresh(room)
    return room


def test_admin_room_utilization_counts_confirmed_bookings(
    client: TestClient, db_session: Session
) -> None:
    faculty = create_user(db_session, Role.FACULTY)
    admin = create_user(db_session, Role.ADMIN)
    room = _make_room(db_session)
    client.post(
        "/api/v1/bookings",
        json={
            "room_id": str(room.id),
            "start_time": BASE.isoformat(),
            "end_time": (BASE + timedelta(hours=2)).isoformat(),
        },
        headers=auth_headers(faculty),
    )

    response = client.get("/api/v1/analytics/room-utilization", headers=auth_headers(admin))
    assert response.status_code == 200
    result = next(r for r in response.json() if r["room_id"] == str(room.id))
    assert result["confirmed_bookings"] == 1
    assert result["total_hours"] == 2.0


def test_faculty_cannot_view_room_utilization(client: TestClient, db_session: Session) -> None:
    faculty = create_user(db_session, Role.FACULTY)
    response = client.get("/api/v1/analytics/room-utilization", headers=auth_headers(faculty))
    assert response.status_code == 403


def test_warden_can_view_complaint_stats(client: TestClient, db_session: Session) -> None:
    student = create_user(db_session, Role.STUDENT)
    warden = create_user(db_session, Role.WARDEN)
    client.post(
        "/api/v1/complaints",
        data={"category": "plumbing", "description": "Leak", "priority": "high"},
        files={"image": FAKE_IMAGE},
        headers=auth_headers(student),
    )

    response = client.get("/api/v1/analytics/complaints", headers=auth_headers(warden))
    assert response.status_code == 200
    body = response.json()
    assert body["by_status"]["submitted"] == 1
    assert body["by_priority"]["high"] == 1


def test_student_cannot_view_complaint_stats(client: TestClient, db_session: Session) -> None:
    student = create_user(db_session, Role.STUDENT)
    response = client.get("/api/v1/analytics/complaints", headers=auth_headers(student))
    assert response.status_code == 403


def test_attendance_analytics_matches_attendance_reports(
    client: TestClient, db_session: Session
) -> None:
    faculty = create_user(db_session, Role.FACULTY)
    client.post(
        "/api/v1/attendance/sessions",
        json={"course_code": "CS201", "duration_minutes": 5},
        headers=auth_headers(faculty),
    )

    via_attendance = client.get("/api/v1/attendance/reports", headers=auth_headers(faculty)).json()
    via_analytics = client.get("/api/v1/analytics/attendance", headers=auth_headers(faculty)).json()
    assert via_attendance == via_analytics


def test_admin_equipment_stats(client: TestClient, db_session: Session) -> None:
    admin = create_user(db_session, Role.ADMIN)
    db_session.add(
        Equipment(
            id=uuid.uuid4(),
            name="Projector",
            category=EquipmentCategory.PROJECTOR,
            status=EquipmentStatus.AVAILABLE,
        )
    )
    db_session.commit()

    response = client.get("/api/v1/analytics/equipment", headers=auth_headers(admin))
    assert response.status_code == 200
    assert response.json()["by_status"]["available"] == 1


def test_admin_maintenance_stats_computes_average_resolution(
    client: TestClient, db_session: Session
) -> None:
    student = create_user(db_session, Role.STUDENT)
    warden = create_user(db_session, Role.WARDEN)
    staff = create_user(db_session, Role.MAINTENANCE_STAFF)
    admin = create_user(db_session, Role.ADMIN)

    complaint = client.post(
        "/api/v1/complaints",
        data={"category": "electrical", "description": "Broken switch", "priority": "medium"},
        files={"image": FAKE_IMAGE},
        headers=auth_headers(student),
    ).json()
    client.patch(
        f"/api/v1/complaints/{complaint['id']}/assign",
        json={"assigned_to": str(staff.id)},
        headers=auth_headers(warden),
    )
    tasks = client.get("/api/v1/maintenance-requests", headers=auth_headers(staff)).json()
    client.patch(
        f"/api/v1/maintenance-requests/{tasks[0]['id']}",
        data={"status": "in_progress"},
        headers=auth_headers(staff),
    )
    client.patch(
        f"/api/v1/maintenance-requests/{tasks[0]['id']}",
        data={"status": "completed"},
        headers=auth_headers(staff),
    )

    response = client.get("/api/v1/analytics/maintenance", headers=auth_headers(admin))
    assert response.status_code == 200
    body = response.json()
    assert body["total_requests"] == 1
    assert body["completed_requests"] == 1
    assert body["average_resolution_hours"] is not None
    assert body["average_resolution_hours"] >= 0
