"""Per docs/TESTING.md §2.2 and docs/PRD.md FR-14.1."""

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.user import Role
from tests.integration.auth_helpers import auth_headers, create_user


def test_admin_can_view_any_user(client: TestClient, db_session: Session) -> None:
    admin = create_user(db_session, Role.ADMIN)
    student = create_user(db_session, Role.STUDENT)

    response = client.get(f"/api/v1/users/{student.id}", headers=auth_headers(admin))
    assert response.status_code == 200
    assert response.json()["id"] == str(student.id)


def test_user_can_view_their_own_profile(client: TestClient, db_session: Session) -> None:
    student = create_user(db_session, Role.STUDENT)
    response = client.get(f"/api/v1/users/{student.id}", headers=auth_headers(student))
    assert response.status_code == 200


def test_user_cannot_view_someone_elses_profile(client: TestClient, db_session: Session) -> None:
    student_a = create_user(db_session, Role.STUDENT, email="a@example.edu")
    student_b = create_user(db_session, Role.STUDENT, email="b@example.edu")
    response = client.get(f"/api/v1/users/{student_b.id}", headers=auth_headers(student_a))
    assert response.status_code == 403


def test_admin_can_promote_a_student_to_faculty(client: TestClient, db_session: Session) -> None:
    admin = create_user(db_session, Role.ADMIN)
    student = create_user(db_session, Role.STUDENT)

    response = client.patch(
        f"/api/v1/users/{student.id}",
        json={"role": "faculty", "department": "Physics"},
        headers=auth_headers(admin),
    )
    assert response.status_code == 200
    body = response.json()
    assert body["role"] == "faculty"
    assert body["department"] == "Physics"


def test_non_admin_cannot_update_users(client: TestClient, db_session: Session) -> None:
    student = create_user(db_session, Role.STUDENT)
    other = create_user(db_session, Role.STUDENT, email="other@example.edu")
    response = client.patch(
        f"/api/v1/users/{other.id}", json={"role": "admin"}, headers=auth_headers(student)
    )
    assert response.status_code == 403


def test_admin_can_deactivate_a_user_and_they_can_no_longer_authenticate(
    client: TestClient, db_session: Session
) -> None:
    admin = create_user(db_session, Role.ADMIN)
    student = create_user(db_session, Role.STUDENT)

    response = client.delete(f"/api/v1/users/{student.id}", headers=auth_headers(admin))
    assert response.status_code == 200
    assert response.json()["is_active"] is False

    me_response = client.get("/api/v1/auth/me", headers=auth_headers(student))
    assert me_response.status_code == 401


def test_deactivated_users_are_excluded_from_listing(
    client: TestClient, db_session: Session
) -> None:
    admin = create_user(db_session, Role.ADMIN)
    student = create_user(db_session, Role.STUDENT)
    client.delete(f"/api/v1/users/{student.id}", headers=auth_headers(admin))

    response = client.get("/api/v1/users", params={"role": "student"}, headers=auth_headers(admin))
    assert response.status_code == 200
    assert all(u["id"] != str(student.id) for u in response.json())


def test_admin_can_find_and_reactivate_a_deactivated_user(
    client: TestClient, db_session: Session
) -> None:
    admin = create_user(db_session, Role.ADMIN)
    student = create_user(db_session, Role.STUDENT)
    client.delete(f"/api/v1/users/{student.id}", headers=auth_headers(admin))

    listing = client.get(
        "/api/v1/users",
        params={"role": "student", "include_inactive": True},
        headers=auth_headers(admin),
    )
    assert listing.status_code == 200
    assert any(u["id"] == str(student.id) for u in listing.json())

    reactivate = client.patch(
        f"/api/v1/users/{student.id}", json={"is_active": True}, headers=auth_headers(admin)
    )
    assert reactivate.status_code == 200
    assert reactivate.json()["is_active"] is True
