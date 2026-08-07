"""Per docs/TESTING.md §2.2 and docs/PRD.md FR-8.x."""

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.user import Role
from tests.integration.auth_helpers import auth_headers, create_user


def test_student_can_report_a_lost_item_without_photo(
    client: TestClient, db_session: Session
) -> None:
    student = create_user(db_session, Role.STUDENT)
    response = client.post(
        "/api/v1/lost-found",
        data={"type": "lost", "description": "Blue water bottle near the library"},
        headers=auth_headers(student),
    )
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["status"] == "open"
    assert body["image_url"] is None


def test_student_can_report_a_found_item_with_photo(
    client: TestClient, db_session: Session
) -> None:
    student = create_user(db_session, Role.STUDENT)
    response = client.post(
        "/api/v1/lost-found",
        data={"type": "found", "description": "Set of keys"},
        files={"image": ("keys.jpg", b"fake-bytes", "image/jpeg")},
        headers=auth_headers(student),
    )
    assert response.status_code == 201
    assert response.json()["image_url"] is not None


def test_faculty_cannot_report_an_item(client: TestClient, db_session: Session) -> None:
    faculty = create_user(db_session, Role.FACULTY)
    response = client.post(
        "/api/v1/lost-found",
        data={"type": "lost", "description": "x"},
        headers=auth_headers(faculty),
    )
    assert response.status_code == 403


def test_any_authenticated_role_can_search_items(client: TestClient, db_session: Session) -> None:
    student = create_user(db_session, Role.STUDENT)
    faculty = create_user(db_session, Role.FACULTY, email="faculty@example.edu")
    client.post(
        "/api/v1/lost-found",
        data={"type": "lost", "description": "Red umbrella"},
        headers=auth_headers(student),
    )

    response = client.get(
        "/api/v1/lost-found", params={"keyword": "umbrella"}, headers=auth_headers(faculty)
    )
    assert response.status_code == 200
    assert len(response.json()) == 1


def test_reporter_can_mark_their_item_matched(client: TestClient, db_session: Session) -> None:
    student = create_user(db_session, Role.STUDENT)
    item = client.post(
        "/api/v1/lost-found",
        data={"type": "lost", "description": "Laptop charger"},
        headers=auth_headers(student),
    ).json()

    response = client.patch(
        f"/api/v1/lost-found/{item['id']}/status",
        json={"status": "matched"},
        headers=auth_headers(student),
    )
    assert response.status_code == 200
    assert response.json()["status"] == "matched"


def test_admin_can_close_someone_elses_item(client: TestClient, db_session: Session) -> None:
    student = create_user(db_session, Role.STUDENT)
    admin = create_user(db_session, Role.ADMIN)
    item = client.post(
        "/api/v1/lost-found",
        data={"type": "found", "description": "Notebook"},
        headers=auth_headers(student),
    ).json()

    response = client.patch(
        f"/api/v1/lost-found/{item['id']}/status",
        json={"status": "closed"},
        headers=auth_headers(admin),
    )
    assert response.status_code == 200
    assert response.json()["status"] == "closed"


def test_unrelated_student_cannot_update_someone_elses_item_status(
    client: TestClient, db_session: Session
) -> None:
    student = create_user(db_session, Role.STUDENT)
    other_student = create_user(db_session, Role.STUDENT, email="other@example.edu")
    item = client.post(
        "/api/v1/lost-found",
        data={"type": "lost", "description": "Wallet"},
        headers=auth_headers(student),
    ).json()

    response = client.patch(
        f"/api/v1/lost-found/{item['id']}/status",
        json={"status": "closed"},
        headers=auth_headers(other_student),
    )
    assert response.status_code == 403
