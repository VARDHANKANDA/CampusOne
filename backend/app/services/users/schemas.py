from uuid import UUID

from pydantic import BaseModel

from app.models.user import Role


class UserOut(BaseModel):
    id: UUID
    email: str
    full_name: str
    role: Role
    department: str | None
    is_active: bool

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    role: Role | None = None
    department: str | None = None
    is_active: bool | None = None
