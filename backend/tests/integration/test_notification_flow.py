"""Per docs/TESTING.md §2.2 and docs/PRD.md FR-11.x. `queue_notification`/
`promote_waitlist` are called via BackgroundTasks in production; TestClient
runs background tasks synchronously before returning the response, so these
tests can assert on the resulting rows directly.
"""

import uuid
from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.campus import Building, Room, RoomType
from app.models.notification import Notification
from app.models.reservation import WaitlistEntry
from app.models.user import Role
from tests.integration.auth_helpers import auth_headers, create_user

BASE = datetime(2027, 1, 10, 9, 0, tzinfo=UTC)


def _make_room(db: Session) -> Room:
    building = Building(id=uuid.uuid4(), name="Notif Hall", code=f"NH-{uuid.uuid4().hex[:6]}")
    db.add(building)
    db.commit()
    room = Room(
        id=uuid.uuid4(),
        building_id=building.id,
        name="Room N1",
        type=RoomType.CLASSROOM,
        capacity=30,
    )
    db.add(room)
    db.commit()
    db.refresh(room)
    return room


def test_confirming_a_booking_notifies_the_requester(
    client: TestClient, db_session: Session
) -> None:
    faculty = create_user(db_session, Role.FACULTY)
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

    response = client.get("/api/v1/notifications", headers=auth_headers(faculty))
    assert response.status_code == 200
    types = [n["type"] for n in response.json()]
    assert "booking_confirmed" in types


def test_unread_filter_and_mark_as_read(client: TestClient, db_session: Session) -> None:
    faculty = create_user(db_session, Role.FACULTY)
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

    unread = client.get(
        "/api/v1/notifications", params={"unread": True}, headers=auth_headers(faculty)
    ).json()
    assert len(unread) == 1

    read_response = client.patch(
        f"/api/v1/notifications/{unread[0]['id']}/read", headers=auth_headers(faculty)
    )
    assert read_response.status_code == 200
    assert read_response.json()["read_at"] is not None

    unread_after = client.get(
        "/api/v1/notifications", params={"unread": True}, headers=auth_headers(faculty)
    ).json()
    assert len(unread_after) == 0


def test_cannot_mark_someone_elses_notification_as_read(
    client: TestClient, db_session: Session
) -> None:
    faculty = create_user(db_session, Role.FACULTY)
    other = create_user(db_session, Role.FACULTY, email="other@example.edu")
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
    notification = client.get("/api/v1/notifications", headers=auth_headers(faculty)).json()[0]

    response = client.patch(
        f"/api/v1/notifications/{notification['id']}/read", headers=auth_headers(other)
    )
    assert response.status_code == 403


def test_cancelling_a_booking_promotes_the_waitlist(
    client: TestClient, db_session: Session
) -> None:
    faculty = create_user(db_session, Role.FACULTY)
    waitlisted_student = create_user(db_session, Role.STUDENT)
    room = _make_room(db_session)

    booking = client.post(
        "/api/v1/bookings",
        json={
            "room_id": str(room.id),
            "start_time": BASE.isoformat(),
            "end_time": (BASE + timedelta(hours=1)).isoformat(),
        },
        headers=auth_headers(faculty),
    ).json()

    db_session.add(
        WaitlistEntry(
            room_id=room.id,
            user_id=waitlisted_student.id,
            requested_start=BASE,
            requested_end=BASE + timedelta(hours=1),
            position=1,
        )
    )
    db_session.commit()

    client.patch(f"/api/v1/bookings/{booking['id']}/cancel", headers=auth_headers(faculty))

    notifications = (
        db_session.execute(
            select(Notification).where(Notification.user_id == waitlisted_student.id)
        )
        .scalars()
        .all()
    )
    assert any(n.type == "waitlist_slot_opened" for n in notifications)

    entry = db_session.execute(
        select(WaitlistEntry).where(WaitlistEntry.user_id == waitlisted_student.id)
    ).scalar_one()
    assert entry.notified_at is not None


def test_admin_can_list_and_update_notification_settings(
    client: TestClient, db_session: Session
) -> None:
    admin = create_user(db_session, Role.ADMIN)

    listing = client.get("/api/v1/admin/notification-settings", headers=auth_headers(admin))
    assert listing.status_code == 200
    assert len(listing.json()) > 0
    event_type = listing.json()[0]["event_type"]

    response = client.patch(
        f"/api/v1/admin/notification-settings/{event_type}",
        json={"email_enabled": True},
        headers=auth_headers(admin),
    )
    assert response.status_code == 200
    assert response.json()["email_enabled"] is True


def test_non_admin_cannot_view_notification_settings(
    client: TestClient, db_session: Session
) -> None:
    faculty = create_user(db_session, Role.FACULTY)
    response = client.get("/api/v1/admin/notification-settings", headers=auth_headers(faculty))
    assert response.status_code == 403
