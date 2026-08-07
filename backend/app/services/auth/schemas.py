from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

from app.models.user import Role


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str = Field(min_length=1, max_length=200)
    department: str | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class PasswordResetRequest(BaseModel):
    email: EmailStr


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str | None = None
    token_type: str = "bearer"
    expires_in: int | None = None


class UserProfile(BaseModel):
    id: UUID
    email: str
    full_name: str
    role: Role
    department: str | None
    is_active: bool

    model_config = {"from_attributes": True}
