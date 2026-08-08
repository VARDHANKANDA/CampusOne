import re
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.models.user import Role

_UPPERCASE_RE = re.compile(r"[A-Z]")
_LOWERCASE_RE = re.compile(r"[a-z]")
_DIGIT_RE = re.compile(r"\d")
_SPECIAL_RE = re.compile(r"[^A-Za-z0-9]")


class RegisterRequest(BaseModel):
    email: EmailStr
    # 72 caps at bcrypt's byte limit (Supabase Auth hashes with bcrypt) so a
    # longer password isn't silently truncated at the Supabase side.
    password: str = Field(min_length=8, max_length=72)
    full_name: str = Field(min_length=1, max_length=200)
    department: str | None = None

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, value: str) -> str:
        if not _UPPERCASE_RE.search(value):
            raise ValueError("Password must contain at least one uppercase letter.")
        if not _LOWERCASE_RE.search(value):
            raise ValueError("Password must contain at least one lowercase letter.")
        if not _DIGIT_RE.search(value):
            raise ValueError("Password must contain at least one number.")
        if not _SPECIAL_RE.search(value):
            raise ValueError("Password must contain at least one special character.")
        return value


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
