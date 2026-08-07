"""Buildings, rooms — docs/API.md §4. Admin-managed master data; read access is
open to any authenticated role since booking/lab/event search all need it.
"""

from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.errors import NotFoundError
from app.core.security import CurrentUser, get_current_user, require_role
from app.models.campus import Building, Room, RoomType
from app.models.user import Role
from app.services.audit.service import record_audit_log
from app.services.campus.schemas import (
    BuildingCreate,
    BuildingOut,
    RoomCreate,
    RoomOut,
    RoomUpdate,
)

router = APIRouter(tags=["campus"])


@router.get("/buildings", response_model=list[BuildingOut])
def list_buildings(
    db: Session = Depends(get_db),
    _current_user: CurrentUser = Depends(get_current_user),
) -> list[Building]:
    return list(db.execute(select(Building).order_by(Building.name)).scalars().all())


@router.post("/buildings", response_model=BuildingOut, status_code=status.HTTP_201_CREATED)
def create_building(
    payload: BuildingCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role(Role.ADMIN)),
) -> Building:
    building = Building(**payload.model_dump())
    db.add(building)
    db.commit()
    db.refresh(building)

    background_tasks.add_task(
        record_audit_log,
        current_user.id,
        "building.created",
        "building",
        building.id,
        after_state=payload.model_dump(mode="json"),
    )
    return building


@router.get("/rooms", response_model=list[RoomOut])
def list_rooms(
    building_id: UUID | None = None,
    type: RoomType | None = None,  # noqa: A002
    min_capacity: int | None = Query(default=None, gt=0),
    include_inactive: bool = False,
    db: Session = Depends(get_db),
    _current_user: CurrentUser = Depends(get_current_user),
) -> list[Room]:
    query = select(Room)
    if not include_inactive:
        query = query.where(Room.is_active.is_(True))
    if building_id is not None:
        query = query.where(Room.building_id == building_id)
    if type is not None:
        query = query.where(Room.type == type)
    if min_capacity is not None:
        query = query.where(Room.capacity >= min_capacity)
    return list(db.execute(query.order_by(Room.name)).scalars().all())


@router.post("/rooms", response_model=RoomOut, status_code=status.HTTP_201_CREATED)
def create_room(
    payload: RoomCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role(Role.ADMIN)),
) -> Room:
    room = Room(**payload.model_dump())
    db.add(room)
    db.commit()
    db.refresh(room)

    background_tasks.add_task(
        record_audit_log,
        current_user.id,
        "room.created",
        "room",
        room.id,
        after_state=payload.model_dump(mode="json"),
    )
    return room


@router.patch("/rooms/{room_id}", response_model=RoomOut)
def update_room(
    room_id: UUID,
    payload: RoomUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role(Role.ADMIN)),
) -> Room:
    room = db.get(Room, room_id)
    if room is None:
        raise NotFoundError("Room not found")

    before = RoomOut.model_validate(room).model_dump(mode="json")
    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(room, field, value)
    db.commit()
    db.refresh(room)

    background_tasks.add_task(
        record_audit_log,
        current_user.id,
        "room.updated",
        "room",
        room.id,
        before_state=before,
        after_state=RoomOut.model_validate(room).model_dump(mode="json"),
    )
    return room
