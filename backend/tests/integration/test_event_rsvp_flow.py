import uuid
from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.campus import Building, Room, RoomType
from app.models.event import Event, EventStatus
from app.models.user import Role
from tests.integration.auth_helpers import auth_headers, create_user

BASE = datetime(2027, 4, 1, 10, 0, tzinfo=UTC)


def _make_room(db: Session) -> Room:
    building = Building(id=uuid.uuid4(), name="Event Hall B", code=f"EH-{uuid.uuid4().hex[:6]}")
    db.add(building)
    db.commit()
    room = Room(
        id=uuid.uuid4(),
        building_id=building.id,
        name="Auditorium B",
        type=RoomType.AUDITORIUM,
        capacity=100,
    )
    db.add(room)
    db.commit()
    db.refresh(room)
    return room


def _make_event(db: Session, organizer_id: uuid.UUID, room_id: uuid.UUID) -> Event:
    event = Event(
        id=uuid.uuid4(),
        room_id=room_id,
        organizer_id=organizer_id,
        title="AI Seminar",
        start_time=BASE,
        end_time=BASE + timedelta(hours=2),
        status=EventStatus.SCHEDULED,
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


def test_student_rsvp_and_status(client: TestClient, db_session: Session) -> None:
    student = create_user(db_session, Role.STUDENT)
    faculty = create_user(db_session, Role.FACULTY)
    room = _make_room(db_session)
    event = _make_event(db_session, faculty.id, room.id)

    # 1. Fetch initial status: not RSVP'd, count 0
    status_resp = client.get(f"/api/v1/events/{event.id}/rsvp", headers=auth_headers(student))
    assert status_resp.status_code == 200
    assert status_resp.json() == {"rsvp_count": 0, "user_rsvped": False}

    # 2. RSVP to event
    rsvp_resp = client.post(f"/api/v1/events/{event.id}/rsvp", headers=auth_headers(student))
    assert rsvp_resp.status_code == 200
    assert rsvp_resp.json() == {"rsvp_count": 1, "user_rsvped": True}

    # 3. Fetch status again to verify persistence
    status_resp_2 = client.get(f"/api/v1/events/{event.id}/rsvp", headers=auth_headers(student))
    assert status_resp_2.json() == {"rsvp_count": 1, "user_rsvped": True}

    # 4. Cancel RSVP
    cancel_resp = client.delete(f"/api/v1/events/{event.id}/rsvp", headers=auth_headers(student))
    assert cancel_resp.status_code == 200
    assert cancel_resp.json() == {"rsvp_count": 0, "user_rsvped": False}


def test_event_attendees_permissions(client: TestClient, db_session: Session) -> None:
    student = create_user(db_session, Role.STUDENT)
    faculty_organizer = create_user(db_session, Role.FACULTY, email="org@example.edu")
    faculty_other = create_user(db_session, Role.FACULTY, email="other@example.edu")
    admin = create_user(db_session, Role.ADMIN)

    room = _make_room(db_session)
    event = _make_event(db_session, faculty_organizer.id, room.id)

    # Student RSVPs to the event
    client.post(f"/api/v1/events/{event.id}/rsvp", headers=auth_headers(student))

    # 1. Student attempts to read attendee register -> Forbidden 403
    student_read = client.get(f"/api/v1/events/{event.id}/attendees", headers=auth_headers(student))
    assert student_read.status_code == 403

    # 2. Other faculty attempts to read attendee register -> Forbidden 403
    other_read = client.get(
        f"/api/v1/events/{event.id}/attendees", headers=auth_headers(faculty_other)
    )
    assert other_read.status_code == 403

    # 3. Organizer reads attendee register -> OK 200, lists student
    organizer_read = client.get(
        f"/api/v1/events/{event.id}/attendees", headers=auth_headers(faculty_organizer)
    )
    assert organizer_read.status_code == 200
    attendees = organizer_read.json()
    assert len(attendees) == 1
    assert attendees[0]["id"] == str(student.id)
    assert attendees[0]["full_name"] == student.full_name

    # 4. Admin reads attendee register -> OK 200
    admin_read = client.get(f"/api/v1/events/{event.id}/attendees", headers=auth_headers(admin))
    assert admin_read.status_code == 200
    assert len(admin_read.json()) == 1
