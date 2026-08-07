from uuid import UUID

from pydantic import BaseModel, Field

from app.models.campus import RoomType


class BuildingCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    code: str = Field(min_length=1, max_length=20)
    location: str | None = None


class BuildingOut(BaseModel):
    id: UUID
    name: str
    code: str
    location: str | None

    model_config = {"from_attributes": True}


class RoomCreate(BaseModel):
    building_id: UUID
    name: str = Field(min_length=1, max_length=200)
    type: RoomType
    capacity: int = Field(gt=0)
    equipment_tags: list[str] = Field(default_factory=list)
    requires_approval: bool = False


class RoomUpdate(BaseModel):
    name: str | None = None
    capacity: int | None = Field(default=None, gt=0)
    equipment_tags: list[str] | None = None
    is_active: bool | None = None
    requires_approval: bool | None = None


class RoomOut(BaseModel):
    id: UUID
    building_id: UUID
    name: str
    type: RoomType
    capacity: int
    equipment_tags: list[str]
    is_active: bool
    requires_approval: bool

    model_config = {"from_attributes": True}
