import re
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.models.user import Role

_UPPERCASE_RE = re.compile(r"[A-Z]")
_LOWERCASE_RE = re.compile(r"[a-z]")
_DIGIT_RE = re.compile(r"\d")
_SPECIAL_RE = re.compile(r"[^A-Za-z0-9]")


def _validate_password_strength(value: str) -> str:
    if not _UPPERCASE_RE.search(value):
        raise ValueError("Password must contain at least one uppercase letter.")
    if not _LOWERCASE_RE.search(value):
        raise ValueError("Password must contain at least one lowercase letter.")
    if not _DIGIT_RE.search(value):
        raise ValueError("Password must contain at least one number.")
    if not _SPECIAL_RE.search(value):
        raise ValueError("Password must contain at least one special character.")
    return value


def _normalize_email(value: str) -> str:
    """Our own `users.email` unique constraint is case-sensitive at the
    Postgres level; normalizing to lowercase here (matching how Supabase Auth
    itself treats email identity) closes the loophole where "User@x.com" and
    "user@x.com" could otherwise end up as two distinct rows/accounts.
    """
    return value.strip().lower()


class RegisterRequest(BaseModel):
    email: EmailStr
    # 72 caps at bcrypt's byte limit (Supabase Auth hashes with bcrypt) so a
    # longer password isn't silently truncated at the Supabase side.
    password: str = Field(min_length=8, max_length=72)
    full_name: str = Field(min_length=1, max_length=200)
    department: str | None = None
    # The account's actual `role` always starts as Student regardless of this
    # (ADR-010) — picking anything else here only records a pending request
    # an admin must approve (POST /users/{id}/approve-role) before it takes
    # effect. Never trust this field to grant access by itself.
    requested_role: Role = Role.STUDENT

    _normalize_email = field_validator("email")(_normalize_email)

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, value: str) -> str:
        return _validate_password_strength(value)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str

    _normalize_email = field_validator("email")(_normalize_email)


class PasswordResetRequest(BaseModel):
    email: EmailStr

    _normalize_email = field_validator("email")(_normalize_email)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str | None = None
    token_type: str = "bearer"
    expires_in: int | None = None


class ProfileUpdateRequest(BaseModel):
    """Self-service profile editing — deliberately excludes role/is_active,
    which stay admin-only via PATCH /users/{id}.
    """

    full_name: str | None = Field(default=None, min_length=1, max_length=200)
    department: str | None = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=72)

    @field_validator("new_password")
    @classmethod
    def validate_password_strength(cls, value: str) -> str:
        return _validate_password_strength(value)


class UserProfile(BaseModel):
    id: UUID
    email: str
    full_name: str
    role: Role
    requested_role: Role | None = None
    department: str | None
    is_active: bool

    model_config = {"from_attributes": True}
