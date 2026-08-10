import enum

from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin, pg_enum


class Role(str, enum.Enum):
    STUDENT = "student"
    FACULTY = "faculty"
    WARDEN = "warden"
    MAINTENANCE_STAFF = "maintenance_staff"
    ADMIN = "admin"


# Shared instance (not a fresh pg_enum() call per column) so SQLAlchemy treats
# `role` and `requested_role` as the same underlying Postgres ENUM type rather
# than trying to CREATE TYPE "user_role" twice.
_USER_ROLE_TYPE = pg_enum(Role, name="user_role")


class User(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Mirrors the Supabase Auth user by id (docs/DATABASE.md §2.1)."""

    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String, unique=True, nullable=False, index=True)
    full_name: Mapped[str] = mapped_column(String, nullable=False)
    role: Mapped[Role] = mapped_column(_USER_ROLE_TYPE, nullable=False)
    # Set at registration when the user picks anything other than Student;
    # `role` itself always starts as Student regardless — this only takes
    # effect once an admin approves it (POST /users/{id}/approve-role).
    requested_role: Mapped[Role | None] = mapped_column(_USER_ROLE_TYPE, nullable=True)
    department: Mapped[str | None] = mapped_column(String, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
