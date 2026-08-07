from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.user import Role
from tests.integration.auth_helpers import auth_headers, create_user


def test_admin_sees_all_users(client: TestClient, db_session: Session) -> None:
    create_user(db_session, Role.STUDENT)
    create_user(db_session, Role.MAINTENANCE_STAFF)
    admin = create_user(db_session, Role.ADMIN)

    response = client.get("/api/v1/users", headers=auth_headers(admin))
    assert response.status_code == 200
    assert len(response.json()) == 3


def test_warden_only_sees_maintenance_staff_regardless_of_filter(
    client: TestClient, db_session: Session
) -> None:
    create_user(db_session, Role.STUDENT)
    staff = create_user(db_session, Role.MAINTENANCE_STAFF)
    warden = create_user(db_session, Role.WARDEN)

    response = client.get("/api/v1/users", params={"role": "student"}, headers=auth_headers(warden))
    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["id"] == str(staff.id)


def test_student_cannot_list_users(client: TestClient, db_session: Session) -> None:
    student = create_user(db_session, Role.STUDENT)
    response = client.get("/api/v1/users", headers=auth_headers(student))
    assert response.status_code == 403
