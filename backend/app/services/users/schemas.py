from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.models.user import Role
from app.services.auth.schemas import _normalize_email, _validate_password_strength


class UserOut(BaseModel):
    id: UUID
    email: str
    full_name: str
    role: Role
    requested_role: Role | None = None
    department: str | None
    is_active: bool

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    role: Role | None = None
    department: str | None = None
    is_active: bool | None = None


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    full_name: str
    role: Role = Role.STUDENT
    department: str | None = None

    _normalize_email = field_validator("email")(_normalize_email)

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, value: str) -> str:
        return _validate_password_strength(value)
