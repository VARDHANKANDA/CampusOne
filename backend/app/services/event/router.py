"""Event Scheduling — docs/API.md §8, docs/PRD.md FR-5.x.

Shares the overlap-prevention pattern with Classroom Booking (docs/DATABASE.md
§2.9) but against its own `events` table/exclusion constraint — event venues
(auditorium/seminar_hall) are a disjoint room-type range from `bookings`
(classroom/lab), so no cross-table check against `bookings` is needed, only
against `maintenance_schedules`.
"""

from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, Query, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.errors import AppError, ConflictError, ForbiddenError, NotFoundError
from app.core.security import CurrentUser, get_current_user, require_role
from app.models.event import Event, EventStatus
from app.models.maintenance import MaintenanceSchedule
from app.models.user import Role
from app.services.audit.service import record_audit_log
from app.services.event.schemas import EventCreate, EventOut

router = APIRouter(prefix="/events", tags=["events"])


def _find_event_conflict(db: Session, room_id: UUID, start: datetime, end: datetime) -> str | None:
    maintenance = (
        db.execute(
            select(MaintenanceSchedule).where(
                MaintenanceSchedule.room_id == room_id,
                MaintenanceSchedule.start_time < end,
                MaintenanceSchedule.end_time > start,
            )
        )
        .scalars()
        .first()
    )
    if maintenance is not None:
        return "maintenance"

    conflicting_event = (
        db.execute(
            select(Event).where(
                Event.room_id == room_id,
                Event.status == EventStatus.SCHEDULED,
                Event.start_time < end,
                Event.end_time > start,
            )
        )
        .scalars()
        .first()
    )
    if conflicting_event is not None:
        return "event"

    return None


@router.get("", response_model=list[EventOut])
def list_events(
    room_id: UUID | None = None,
    from_time: datetime | None = Query(default=None, alias="from"),
    to_time: datetime | None = Query(default=None, alias="to"),
    db: Session = Depends(get_db),
    _current_user: CurrentUser = Depends(get_current_user),
) -> list[Event]:
    query = select(Event)
    if room_id is not None:
        query = query.where(Event.room_id == room_id)
    if from_time is not None:
        query = query.where(Event.end_time >= from_time)
    if to_time is not None:
        query = query.where(Event.start_time <= to_time)
    return list(db.execute(query.order_by(Event.start_time)).scalars().all())


@router.post("", response_model=EventOut, status_code=status.HTTP_201_CREATED)
def create_event(
    payload: EventCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role(Role.FACULTY, Role.ADMIN)),
) -> Event:
    conflict = _find_event_conflict(db, payload.room_id, payload.start_time, payload.end_time)
    if conflict == "maintenance":
        raise ConflictError(
            "Venue is under scheduled maintenance during the requested window.",
            details={"reason": "maintenance"},
        )
    if conflict == "event":
        raise ConflictError(
            "Venue already has an event scheduled for the requested window.",
            details={"reason": "event"},
        )

    event = Event(
        room_id=payload.room_id,
        organizer_id=current_user.id,
        title=payload.title,
        start_time=payload.start_time,
        end_time=payload.end_time,
        status=EventStatus.SCHEDULED,
    )
    db.add(event)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise ConflictError(
            "Venue already has an event scheduled for the requested window."
        ) from exc
    db.refresh(event)

    background_tasks.add_task(
        record_audit_log,
        current_user.id,
        "event.created",
        "event",
        event.id,
        after_state=EventOut.model_validate(event).model_dump(mode="json"),
    )
    return event


@router.patch("/{event_id}/cancel", response_model=EventOut)
def cancel_event(
    event_id: UUID,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role(Role.FACULTY, Role.ADMIN)),
) -> Event:
    event = db.get(Event, event_id)
    if event is None:
        raise NotFoundError("Event not found")
    if current_user.role != Role.ADMIN and event.organizer_id != current_user.id:
        raise ForbiddenError("Only the organizer or an admin can cancel this event.")
    if event.status != EventStatus.SCHEDULED:
        raise AppError(
            "INVALID_STATE_TRANSITION", "This event is already cancelled.", status_code=400
        )

    before = EventOut.model_validate(event).model_dump(mode="json")
    event.status = EventStatus.CANCELLED
    db.commit()
    db.refresh(event)

    background_tasks.add_task(
        record_audit_log,
        current_user.id,
        "event.cancelled",
        "event",
        event.id,
        before_state=before,
        after_state=EventOut.model_validate(event).model_dump(mode="json"),
    )
    return event


from sqlalchemy import func
from app.models.event import EventRSVP
from app.models.user import User
from app.services.event.schemas import AttendeeOut, EventRSVPStatusOut


@router.get("/{event_id}/rsvp", response_model=EventRSVPStatusOut)
def get_event_rsvp_status(
    event_id: UUID,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> dict:
    event = db.get(Event, event_id)
    if event is None:
        raise NotFoundError("Event not found")
    
    rsvp_count = db.execute(
        select(func.count()).select_from(EventRSVP).where(EventRSVP.event_id == event_id)
    ).scalar_one()
    
    user_rsvped = db.execute(
        select(EventRSVP).where(EventRSVP.event_id == event_id, EventRSVP.user_id == current_user.id)
    ).scalar_one_or_none() is not None
    
    return {"rsvp_count": rsvp_count, "user_rsvped": user_rsvped}


@router.post("/{event_id}/rsvp", response_model=EventRSVPStatusOut)
def rsvp_to_event(
    event_id: UUID,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> dict:
    event = db.get(Event, event_id)
    if event is None:
        raise NotFoundError("Event not found")
    if event.status != EventStatus.SCHEDULED:
        raise AppError("EVENT_NOT_ACTIVE", "Cannot RSVP to a cancelled event.", status_code=400)
    
    existing = db.execute(
        select(EventRSVP).where(EventRSVP.event_id == event_id, EventRSVP.user_id == current_user.id)
    ).scalar_one_or_none()
    
    if existing is None:
        new_rsvp = EventRSVP(event_id=event_id, user_id=current_user.id)
        db.add(new_rsvp)
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            pass
            
    rsvp_count = db.execute(
        select(func.count()).select_from(EventRSVP).where(EventRSVP.event_id == event_id)
    ).scalar_one()
    
    return {"rsvp_count": rsvp_count, "user_rsvped": True}


@router.delete("/{event_id}/rsvp", response_model=EventRSVPStatusOut)
def cancel_event_rsvp(
    event_id: UUID,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> dict:
    event = db.get(Event, event_id)
    if event is None:
        raise NotFoundError("Event not found")
        
    existing = db.execute(
        select(EventRSVP).where(EventRSVP.event_id == event_id, EventRSVP.user_id == current_user.id)
    ).scalar_one_or_none()
    
    if existing is not None:
        db.delete(existing)
        db.commit()
        
    rsvp_count = db.execute(
        select(func.count()).select_from(EventRSVP).where(EventRSVP.event_id == event_id)
    ).scalar_one()
    
    return {"rsvp_count": rsvp_count, "user_rsvped": False}


@router.get("/{event_id}/attendees", response_model=list[AttendeeOut])
def get_event_attendees(
    event_id: UUID,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> list[User]:
    event = db.get(Event, event_id)
    if event is None:
        raise NotFoundError("Event not found")
        
    if current_user.role != Role.ADMIN and event.organizer_id != current_user.id:
        raise ForbiddenError("Only the organizer or an administrator can view the attendee register.")
        
    query = select(User).join(EventRSVP, EventRSVP.user_id == User.id).where(EventRSVP.event_id == event_id).order_by(User.full_name)
    return list(db.execute(query).scalars().all())

