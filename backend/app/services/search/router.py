from uuid import UUID

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import CurrentUser, require_role
from app.models.campus import Room
from app.models.complaint import Complaint
from app.models.equipment import Equipment
from app.models.event import Event
from app.models.lost_found import LostFoundItem
from app.models.reservation import Booking
from app.models.user import Role

router = APIRouter(prefix="/search", tags=["search"])


class SearchResultItem(BaseModel):
    id: UUID
    type: str  # 'room' | 'booking' | 'complaint' | 'equipment' | 'event' | 'lost_found'
    title: str
    subtitle: str | None = None
    url: str


@router.get("", response_model=list[SearchResultItem])
def search_all(
    q: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(
        require_role(Role.STUDENT, Role.FACULTY, Role.WARDEN, Role.MAINTENANCE_STAFF, Role.ADMIN)
    ),
) -> list[SearchResultItem]:
    if not q or len(q) < 2:
        return []

    results: list[SearchResultItem] = []
    term = f"%{q}%"

    # 1. Search Rooms (Admin/Faculty/Student viewable)
    rooms = db.execute(select(Room).where(Room.name.ilike(term)).limit(5)).scalars().all()
    for r in rooms:
        results.append(
            SearchResultItem(
                id=r.id,
                type="room",
                title=f"Room: {r.name}",
                subtitle=f"Capacity {r.capacity} · {r.type.value}",
                url="/admin/rooms" if current_user.role == Role.ADMIN else "/bookings/new",
            )
        )

    # 2. Search Complaints
    complaints_query = select(Complaint)
    if current_user.role == Role.STUDENT:
        complaints_query = complaints_query.where(Complaint.reporter_id == current_user.id)
    elif current_user.role == Role.MAINTENANCE_STAFF:
        complaints_query = complaints_query.where(Complaint.assigned_to == current_user.id)

    complaints = (
        db.execute(
            complaints_query.where(
                or_(
                    Complaint.description.ilike(term),
                    Complaint.category.cast(str).ilike(term),
                )
            ).limit(5)
        )
        .scalars()
        .all()
    )
    for c in complaints:
        url = (
            "/complaints/mine"
            if current_user.role == Role.STUDENT
            else (
                "/maintenance/tasks"
                if current_user.role == Role.MAINTENANCE_STAFF
                else "/complaints/queue"
            )
        )
        results.append(
            SearchResultItem(
                id=c.id,
                type="complaint",
                title=f"Complaint: {c.category.value}",
                subtitle=c.description[:60] + ("..." if len(c.description) > 60 else ""),
                url=url,
            )
        )

    # 3. Search Bookings
    bookings_query = select(Booking)
    if current_user.role != Role.ADMIN:
        bookings_query = bookings_query.where(Booking.requester_id == current_user.id)

    bookings = (
        db.execute(bookings_query.where(Booking.purpose.ilike(term)).limit(5)).scalars().all()
    )
    for b in bookings:
        results.append(
            SearchResultItem(
                id=b.id,
                type="booking",
                title=f"Booking: {b.purpose or 'No Purpose'}",
                subtitle=f"Status: {b.status.value}",
                url="/admin/bookings" if current_user.role == Role.ADMIN else "/bookings/mine",
            )
        )

    # 4. Search Equipment
    equipment = (
        db.execute(
            select(Equipment)
            .where(
                or_(
                    Equipment.name.ilike(term),
                    Equipment.category.cast(str).ilike(term),
                )
            )
            .limit(5)
        )
        .scalars()
        .all()
    )
    for eq in equipment:
        results.append(
            SearchResultItem(
                id=eq.id,
                type="equipment",
                title=f"Equipment: {eq.name}",
                subtitle=f"Status: {eq.status.value} · {eq.category.value}",
                url=(
                    "/admin/equipment" if current_user.role == Role.ADMIN else "/equipment/requests"
                ),
            )
        )

    # 5. Search Events
    events = db.execute(select(Event).where(Event.title.ilike(term)).limit(5)).scalars().all()
    for ev in events:
        results.append(
            SearchResultItem(
                id=ev.id,
                type="event",
                title=f"Event: {ev.title}",
                subtitle=f"Status: {ev.status.value}",
                url="/events/new",
            )
        )

    # 6. Search Lost & Found
    lf_items = (
        db.execute(select(LostFoundItem).where(LostFoundItem.description.ilike(term)).limit(5))
        .scalars()
        .all()
    )
    for lf in lf_items:
        results.append(
            SearchResultItem(
                id=lf.id,
                type="lost_found",
                title=f"Lost & Found: {lf.type.value.capitalize()} Item",
                subtitle=lf.description[:60] + ("..." if len(lf.description) > 60 else ""),
                url="/lost-found",
            )
        )

    return results
