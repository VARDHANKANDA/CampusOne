"""Per docs/TESTING.md §2.2 and docs/PRD.md FR-9.x, docs/DECISIONS.md ADR-016."""

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.user import Role
from tests.integration.auth_helpers import auth_headers, create_user

FAKE_IMAGE = ("photo.jpg", b"fake-image-bytes", "image/jpeg")


def _assigned_complaint_and_request(client: TestClient, db_session: Session):
    student = create_user(db_session, Role.STUDENT)
    warden = create_user(db_session, Role.WARDEN)
    staff = create_user(db_session, Role.MAINTENANCE_STAFF)

    complaint = client.post(
        "/api/v1/complaints",
        data={"category": "electrical", "description": "Broken socket", "priority": "high"},
        files={"image": FAKE_IMAGE},
        headers=auth_headers(student),
    ).json()
    client.patch(
        f"/api/v1/complaints/{complaint['id']}/assign",
        json={"assigned_to": str(staff.id)},
        headers=auth_headers(warden),
    )

    requests = client.get("/api/v1/maintenance-requests", headers=auth_headers(staff)).json()
    assert len(requests) == 1
    return staff, requests[0]


def test_assigning_a_complaint_creates_a_maintenance_request(
    client: TestClient, db_session: Session
) -> None:
    staff, maintenance_request = _assigned_complaint_and_request(client, db_session)
    assert maintenance_request["technician_id"] == str(staff.id)
    assert maintenance_request["status"] == "pending"
    assert maintenance_request["actual_completion"] is None


def test_technician_sees_only_their_own_requests(client: TestClient, db_session: Session) -> None:
    staff, _ = _assigned_complaint_and_request(client, db_session)
    other_staff = create_user(db_session, Role.MAINTENANCE_STAFF, email="other@example.edu")

    response = client.get("/api/v1/maintenance-requests", headers=auth_headers(other_staff))
    assert response.status_code == 200
    assert response.json() == []


def test_warden_sees_all_maintenance_requests(client: TestClient, db_session: Session) -> None:
    _staff, _ = _assigned_complaint_and_request(client, db_session)
    warden = create_user(db_session, Role.WARDEN, email="warden2@example.edu")

    response = client.get("/api/v1/maintenance-requests", headers=auth_headers(warden))
    assert response.status_code == 200
    assert len(response.json()) == 1


def test_assigned_technician_can_update_status_and_feedback(
    client: TestClient, db_session: Session
) -> None:
    staff, maintenance_request = _assigned_complaint_and_request(client, db_session)

    response = client.patch(
        f"/api/v1/maintenance-requests/{maintenance_request['id']}",
        data={"status": "in_progress", "feedback": "Ordered a replacement part"},
        headers=auth_headers(staff),
    )
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "in_progress"
    assert body["feedback"] == "Ordered a replacement part"


def test_completing_a_request_sets_actual_completion_and_photo(
    client: TestClient, db_session: Session
) -> None:
    staff, maintenance_request = _assigned_complaint_and_request(client, db_session)

    response = client.patch(
        f"/api/v1/maintenance-requests/{maintenance_request['id']}",
        data={"status": "completed"},
        files={"photo": ("done.jpg", b"done-bytes", "image/jpeg")},
        headers=auth_headers(staff),
    )
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "completed"
    assert body["actual_completion"] is not None
    assert body["completion_photo_url"] is not None


def test_unassigned_technician_cannot_update_someone_elses_request(
    client: TestClient, db_session: Session
) -> None:
    _staff, maintenance_request = _assigned_complaint_and_request(client, db_session)
    other_staff = create_user(db_session, Role.MAINTENANCE_STAFF, email="other@example.edu")

    response = client.patch(
        f"/api/v1/maintenance-requests/{maintenance_request['id']}",
        data={"status": "in_progress"},
        headers=auth_headers(other_staff),
    )
    assert response.status_code == 403


def test_warden_cannot_update_a_maintenance_request(
    client: TestClient, db_session: Session
) -> None:
    _staff, maintenance_request = _assigned_complaint_and_request(client, db_session)
    warden = create_user(db_session, Role.WARDEN, email="warden3@example.edu")

    response = client.patch(
        f"/api/v1/maintenance-requests/{maintenance_request['id']}",
        data={"status": "in_progress"},
        headers=auth_headers(warden),
    )
    assert response.status_code == 403
