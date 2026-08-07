"""Per docs/TESTING.md §2.2 and docs/PRD.md FR-7.x, docs/DECISIONS.md ADR-017."""

import uuid

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.equipment import Equipment, EquipmentCategory, EquipmentStatus
from app.models.user import Role
from tests.integration.auth_helpers import auth_headers, create_user


def _make_equipment(db: Session, status: EquipmentStatus = EquipmentStatus.AVAILABLE) -> Equipment:
    equipment = Equipment(
        id=uuid.uuid4(),
        name="Projector A",
        category=EquipmentCategory.PROJECTOR,
        status=status,
    )
    db.add(equipment)
    db.commit()
    db.refresh(equipment)
    return equipment


def test_admin_can_create_equipment(client: TestClient, db_session: Session) -> None:
    admin = create_user(db_session, Role.ADMIN)
    response = client.post(
        "/api/v1/equipment",
        json={"name": "Smart Board 1", "category": "smart_board"},
        headers=auth_headers(admin),
    )
    assert response.status_code == 201
    assert response.json()["status"] == "available"


def test_any_authenticated_role_can_list_equipment(client: TestClient, db_session: Session) -> None:
    student = create_user(db_session, Role.STUDENT)
    response = client.get("/api/v1/equipment", headers=auth_headers(student))
    assert response.status_code == 200


def test_faculty_can_request_available_equipment(client: TestClient, db_session: Session) -> None:
    faculty = create_user(db_session, Role.FACULTY)
    equipment = _make_equipment(db_session)

    response = client.post(
        f"/api/v1/equipment/{equipment.id}/request",
        json={"purpose": "Guest lecture"},
        headers=auth_headers(faculty),
    )
    assert response.status_code == 201
    assert response.json()["status"] == "pending"


def test_cannot_request_unavailable_equipment(client: TestClient, db_session: Session) -> None:
    faculty = create_user(db_session, Role.FACULTY)
    equipment = _make_equipment(db_session, status=EquipmentStatus.UNDER_REPAIR)

    response = client.post(
        f"/api/v1/equipment/{equipment.id}/request",
        json={},
        headers=auth_headers(faculty),
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "EQUIPMENT_UNAVAILABLE"


def test_student_cannot_request_equipment(client: TestClient, db_session: Session) -> None:
    student = create_user(db_session, Role.STUDENT)
    equipment = _make_equipment(db_session)

    response = client.post(
        f"/api/v1/equipment/{equipment.id}/request",
        json={},
        headers=auth_headers(student),
    )
    assert response.status_code == 403


def test_admin_approving_a_request_marks_equipment_in_use(
    client: TestClient, db_session: Session
) -> None:
    faculty = create_user(db_session, Role.FACULTY)
    admin = create_user(db_session, Role.ADMIN)
    equipment = _make_equipment(db_session)
    request = client.post(
        f"/api/v1/equipment/{equipment.id}/request",
        json={},
        headers=auth_headers(faculty),
    ).json()

    response = client.patch(
        f"/api/v1/equipment/requests/{request['id']}/approve", headers=auth_headers(admin)
    )
    assert response.status_code == 200
    assert response.json()["status"] == "approved"

    equipment_after = client.get("/api/v1/equipment", headers=auth_headers(admin)).json()
    assert equipment_after[0]["status"] == "in_use"


def test_admin_can_reject_a_request(client: TestClient, db_session: Session) -> None:
    faculty = create_user(db_session, Role.FACULTY)
    admin = create_user(db_session, Role.ADMIN)
    equipment = _make_equipment(db_session)
    request = client.post(
        f"/api/v1/equipment/{equipment.id}/request",
        json={},
        headers=auth_headers(faculty),
    ).json()

    response = client.patch(
        f"/api/v1/equipment/requests/{request['id']}/reject", headers=auth_headers(admin)
    )
    assert response.status_code == 200
    assert response.json()["status"] == "rejected"


def test_actioning_an_already_actioned_request_fails(
    client: TestClient, db_session: Session
) -> None:
    faculty = create_user(db_session, Role.FACULTY)
    admin = create_user(db_session, Role.ADMIN)
    equipment = _make_equipment(db_session)
    request = client.post(
        f"/api/v1/equipment/{equipment.id}/request",
        json={},
        headers=auth_headers(faculty),
    ).json()
    client.patch(f"/api/v1/equipment/requests/{request['id']}/reject", headers=auth_headers(admin))

    response = client.patch(
        f"/api/v1/equipment/requests/{request['id']}/approve", headers=auth_headers(admin)
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "INVALID_STATE_TRANSITION"


def test_faculty_cannot_view_equipment_requests_list(
    client: TestClient, db_session: Session
) -> None:
    faculty = create_user(db_session, Role.FACULTY)
    response = client.get("/api/v1/equipment/requests", headers=auth_headers(faculty))
    assert response.status_code == 403
