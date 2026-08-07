"""Per docs/TESTING.md §2.1-2.2: complaint state-machine transitions (valid vs.
invalid) are critical-path logic, plus RBAC/ownership at each step.
"""

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.user import Role
from tests.integration.auth_helpers import auth_headers, create_user

FAKE_IMAGE = ("photo.jpg", b"fake-image-bytes", "image/jpeg")


def _submit_complaint(client: TestClient, student, priority: str = "medium") -> dict:
    response = client.post(
        "/api/v1/complaints",
        data={"category": "plumbing", "description": "Leaky faucet", "priority": priority},
        files={"image": FAKE_IMAGE},
        headers=auth_headers(student),
    )
    assert response.status_code == 201, response.text
    return response.json()


def test_student_can_submit_a_complaint_with_image(client: TestClient, db_session: Session) -> None:
    student = create_user(db_session, Role.STUDENT)
    body = _submit_complaint(client, student)
    assert body["status"] == "submitted"
    assert body["image_url"].startswith("https://fake-storage.local/complaint-images/")
    assert body["completion_image_url"] is None


def test_faculty_cannot_submit_a_complaint(client: TestClient, db_session: Session) -> None:
    faculty = create_user(db_session, Role.FACULTY)
    response = client.post(
        "/api/v1/complaints",
        data={"category": "plumbing", "description": "x", "priority": "low"},
        files={"image": FAKE_IMAGE},
        headers=auth_headers(faculty),
    )
    assert response.status_code == 403


def test_unsupported_file_type_is_rejected(client: TestClient, db_session: Session) -> None:
    student = create_user(db_session, Role.STUDENT)
    response = client.post(
        "/api/v1/complaints",
        data={"category": "plumbing", "description": "x", "priority": "low"},
        files={"image": ("doc.pdf", b"not-an-image", "application/pdf")},
        headers=auth_headers(student),
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "UNSUPPORTED_FILE_TYPE"


def test_warden_can_assign_to_maintenance_staff(client: TestClient, db_session: Session) -> None:
    student = create_user(db_session, Role.STUDENT)
    warden = create_user(db_session, Role.WARDEN)
    staff = create_user(db_session, Role.MAINTENANCE_STAFF)
    complaint = _submit_complaint(client, student)

    response = client.patch(
        f"/api/v1/complaints/{complaint['id']}/assign",
        json={"assigned_to": str(staff.id)},
        headers=auth_headers(warden),
    )
    assert response.status_code == 200
    assert response.json()["status"] == "assigned"
    assert response.json()["assigned_to"] == str(staff.id)


def test_warden_cannot_assign_to_a_non_maintenance_user(
    client: TestClient, db_session: Session
) -> None:
    student = create_user(db_session, Role.STUDENT)
    warden = create_user(db_session, Role.WARDEN)
    other_student = create_user(db_session, Role.STUDENT, email="other@example.edu")
    complaint = _submit_complaint(client, student)

    response = client.patch(
        f"/api/v1/complaints/{complaint['id']}/assign",
        json={"assigned_to": str(other_student.id)},
        headers=auth_headers(warden),
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "INVALID_ASSIGNEE"


def test_assigning_an_already_assigned_complaint_fails(
    client: TestClient, db_session: Session
) -> None:
    student = create_user(db_session, Role.STUDENT)
    warden = create_user(db_session, Role.WARDEN)
    staff = create_user(db_session, Role.MAINTENANCE_STAFF)
    complaint = _submit_complaint(client, student)
    client.patch(
        f"/api/v1/complaints/{complaint['id']}/assign",
        json={"assigned_to": str(staff.id)},
        headers=auth_headers(warden),
    )

    response = client.patch(
        f"/api/v1/complaints/{complaint['id']}/assign",
        json={"assigned_to": str(staff.id)},
        headers=auth_headers(warden),
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "INVALID_STATE_TRANSITION"


def _assigned_complaint(client: TestClient, db_session: Session):
    student = create_user(db_session, Role.STUDENT)
    warden = create_user(db_session, Role.WARDEN)
    staff = create_user(db_session, Role.MAINTENANCE_STAFF)
    complaint = _submit_complaint(client, student)
    client.patch(
        f"/api/v1/complaints/{complaint['id']}/assign",
        json={"assigned_to": str(staff.id)},
        headers=auth_headers(warden),
    )
    return student, staff, complaint


def test_assigned_staff_can_progress_and_complete_with_photo(
    client: TestClient, db_session: Session
) -> None:
    _student, staff, complaint = _assigned_complaint(client, db_session)

    in_progress = client.patch(
        f"/api/v1/complaints/{complaint['id']}/status",
        data={"status": "in_progress"},
        headers=auth_headers(staff),
    )
    assert in_progress.status_code == 200
    assert in_progress.json()["status"] == "in_progress"

    completed = client.patch(
        f"/api/v1/complaints/{complaint['id']}/status",
        data={"status": "completed"},
        files={"photo": ("fixed.jpg", b"fixed-bytes", "image/jpeg")},
        headers=auth_headers(staff),
    )
    assert completed.status_code == 200
    body = completed.json()
    assert body["status"] == "completed"
    assert body["completion_image_url"] is not None
    # Original report photo is preserved, not overwritten (docs/DECISIONS.md ADR-014).
    assert body["image_url"] != body["completion_image_url"]


def test_unassigned_staff_cannot_update_status(client: TestClient, db_session: Session) -> None:
    _student, _staff, complaint = _assigned_complaint(client, db_session)
    other_staff = create_user(db_session, Role.MAINTENANCE_STAFF, email="other@example.edu")

    response = client.patch(
        f"/api/v1/complaints/{complaint['id']}/status",
        data={"status": "in_progress"},
        headers=auth_headers(other_staff),
    )
    assert response.status_code == 403


def test_skipping_in_progress_straight_to_completed_is_rejected(
    client: TestClient, db_session: Session
) -> None:
    _student, staff, complaint = _assigned_complaint(client, db_session)

    response = client.patch(
        f"/api/v1/complaints/{complaint['id']}/status",
        data={"status": "completed"},
        headers=auth_headers(staff),
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "INVALID_STATE_TRANSITION"


def test_reporter_can_verify_a_completed_complaint(client: TestClient, db_session: Session) -> None:
    student, staff, complaint = _assigned_complaint(client, db_session)
    client.patch(
        f"/api/v1/complaints/{complaint['id']}/status",
        data={"status": "in_progress"},
        headers=auth_headers(staff),
    )
    client.patch(
        f"/api/v1/complaints/{complaint['id']}/status",
        data={"status": "completed"},
        headers=auth_headers(staff),
    )

    response = client.patch(
        f"/api/v1/complaints/{complaint['id']}/verify", headers=auth_headers(student)
    )
    assert response.status_code == 200
    assert response.json()["status"] == "verified"


def test_non_reporter_cannot_verify(client: TestClient, db_session: Session) -> None:
    student, staff, complaint = _assigned_complaint(client, db_session)
    other_student = create_user(db_session, Role.STUDENT, email="notreporter@example.edu")
    client.patch(
        f"/api/v1/complaints/{complaint['id']}/status",
        data={"status": "in_progress"},
        headers=auth_headers(staff),
    )
    client.patch(
        f"/api/v1/complaints/{complaint['id']}/status",
        data={"status": "completed"},
        headers=auth_headers(staff),
    )

    response = client.patch(
        f"/api/v1/complaints/{complaint['id']}/verify", headers=auth_headers(other_student)
    )
    assert response.status_code == 403


def test_student_sees_only_their_own_complaints(client: TestClient, db_session: Session) -> None:
    student_a = create_user(db_session, Role.STUDENT, email="a@example.edu")
    student_b = create_user(db_session, Role.STUDENT, email="b@example.edu")
    _submit_complaint(client, student_a)
    _submit_complaint(client, student_b)

    response = client.get("/api/v1/complaints", headers=auth_headers(student_a))
    assert response.status_code == 200
    assert len(response.json()) == 1


def test_warden_sees_all_complaints(client: TestClient, db_session: Session) -> None:
    student = create_user(db_session, Role.STUDENT)
    warden = create_user(db_session, Role.WARDEN)
    _submit_complaint(client, student)

    response = client.get("/api/v1/complaints", headers=auth_headers(warden))
    assert response.status_code == 200
    assert len(response.json()) == 1


def test_unrelated_student_cannot_view_someone_elses_complaint(
    client: TestClient, db_session: Session
) -> None:
    student = create_user(db_session, Role.STUDENT)
    other_student = create_user(db_session, Role.STUDENT, email="other@example.edu")
    complaint = _submit_complaint(client, student)

    response = client.get(
        f"/api/v1/complaints/{complaint['id']}", headers=auth_headers(other_student)
    )
    assert response.status_code == 403
