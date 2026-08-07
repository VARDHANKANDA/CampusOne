"""Per docs/TESTING.md §2.1-2.2: expired token rejected, duplicate scan
rejected, valid scan recorded once — the platform's non-negotiable invariant
#5 (short-lived, session-scoped, single-use QR tokens).
"""

import uuid
from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.session import AttendanceSession
from app.models.user import Role
from tests.integration.auth_helpers import auth_headers, create_user


def _make_session(db: Session, faculty_id, *, expired: bool = False) -> AttendanceSession:
    session = AttendanceSession(
        id=uuid.uuid4(),
        faculty_id=faculty_id,
        course_code="CS101",
        qr_token=f"token-{uuid.uuid4().hex}",
        expires_at=datetime.now(UTC) + (timedelta(minutes=-1) if expired else timedelta(minutes=5)),
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def test_faculty_can_generate_a_session(client: TestClient, db_session: Session) -> None:
    faculty = create_user(db_session, Role.FACULTY)
    response = client.post(
        "/api/v1/attendance/sessions",
        json={"course_code": "CS101", "duration_minutes": 5},
        headers=auth_headers(faculty),
    )
    assert response.status_code == 201
    body = response.json()
    assert body["course_code"] == "CS101"
    assert len(body["qr_token"]) > 20


def test_duration_minutes_is_capped_at_30(client: TestClient, db_session: Session) -> None:
    faculty = create_user(db_session, Role.FACULTY)
    response = client.post(
        "/api/v1/attendance/sessions",
        json={"course_code": "CS101", "duration_minutes": 999},
        headers=auth_headers(faculty),
    )
    assert response.status_code == 422


def test_student_can_scan_a_valid_session(client: TestClient, db_session: Session) -> None:
    faculty = create_user(db_session, Role.FACULTY)
    student = create_user(db_session, Role.STUDENT)
    session = _make_session(db_session, faculty.id)

    response = client.post(
        "/api/v1/attendance/scan",
        json={"qr_token": session.qr_token},
        headers=auth_headers(student),
    )
    assert response.status_code == 201
    assert response.json()["student_id"] == str(student.id)


def test_scanning_an_expired_token_is_rejected(client: TestClient, db_session: Session) -> None:
    faculty = create_user(db_session, Role.FACULTY)
    student = create_user(db_session, Role.STUDENT)
    session = _make_session(db_session, faculty.id, expired=True)

    response = client.post(
        "/api/v1/attendance/scan",
        json={"qr_token": session.qr_token},
        headers=auth_headers(student),
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "TOKEN_EXPIRED"


def test_scanning_an_unknown_token_is_rejected(client: TestClient, db_session: Session) -> None:
    student = create_user(db_session, Role.STUDENT)
    response = client.post(
        "/api/v1/attendance/scan",
        json={"qr_token": "not-a-real-token"},
        headers=auth_headers(student),
    )
    assert response.status_code == 404


def test_duplicate_scan_by_same_student_is_rejected(
    client: TestClient, db_session: Session
) -> None:
    faculty = create_user(db_session, Role.FACULTY)
    student = create_user(db_session, Role.STUDENT)
    session = _make_session(db_session, faculty.id)

    first = client.post(
        "/api/v1/attendance/scan",
        json={"qr_token": session.qr_token},
        headers=auth_headers(student),
    )
    assert first.status_code == 201

    second = client.post(
        "/api/v1/attendance/scan",
        json={"qr_token": session.qr_token},
        headers=auth_headers(student),
    )
    assert second.status_code == 409
    assert second.json()["error"]["code"] == "DUPLICATE_SCAN"


def test_faculty_can_view_their_own_session_records(
    client: TestClient, db_session: Session
) -> None:
    faculty = create_user(db_session, Role.FACULTY)
    student = create_user(db_session, Role.STUDENT)
    session = _make_session(db_session, faculty.id)
    client.post(
        "/api/v1/attendance/scan",
        json={"qr_token": session.qr_token},
        headers=auth_headers(student),
    )

    response = client.get(
        f"/api/v1/attendance/sessions/{session.id}/records", headers=auth_headers(faculty)
    )
    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["student_name"] == student.full_name


def test_other_faculty_cannot_view_someone_elses_session_records(
    client: TestClient, db_session: Session
) -> None:
    faculty = create_user(db_session, Role.FACULTY, email="owner@example.edu")
    other_faculty = create_user(db_session, Role.FACULTY, email="other@example.edu")
    session = _make_session(db_session, faculty.id)

    response = client.get(
        f"/api/v1/attendance/sessions/{session.id}/records", headers=auth_headers(other_faculty)
    )
    assert response.status_code == 403


def test_attendance_reports_scoped_to_own_sessions_for_faculty(
    client: TestClient, db_session: Session
) -> None:
    faculty_a = create_user(db_session, Role.FACULTY, email="a@example.edu")
    faculty_b = create_user(db_session, Role.FACULTY, email="b@example.edu")
    _make_session(db_session, faculty_a.id)
    _make_session(db_session, faculty_b.id)

    response = client.get("/api/v1/attendance/reports", headers=auth_headers(faculty_a))
    assert response.status_code == 200
    assert len(response.json()) == 1


def test_admin_sees_all_sessions_in_reports(client: TestClient, db_session: Session) -> None:
    faculty_a = create_user(db_session, Role.FACULTY, email="a@example.edu")
    faculty_b = create_user(db_session, Role.FACULTY, email="b@example.edu")
    admin = create_user(db_session, Role.ADMIN)
    _make_session(db_session, faculty_a.id)
    _make_session(db_session, faculty_b.id)

    response = client.get("/api/v1/attendance/reports", headers=auth_headers(admin))
    assert response.status_code == 200
    assert len(response.json()) == 2
