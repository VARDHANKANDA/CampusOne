"""Test-only helpers to seed a `users` row and mint a matching JWT directly —
bypassing Supabase entirely so non-auth integration tests can act as any role
without going through the full register/login flow.
"""

import time
import uuid

from jose import jwt
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.user import Role, User


def create_user(
    db: Session,
    role: Role,
    email: str | None = None,
    full_name: str = "Test User",
) -> User:
    user = User(
        id=uuid.uuid4(),
        email=email or f"{role.value}-{uuid.uuid4().hex[:8]}@example.edu",
        full_name=full_name,
        role=role,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def issue_token(user: User) -> str:
    settings = get_settings()
    return jwt.encode(
        {"sub": str(user.id), "aud": "authenticated", "exp": int(time.time()) + 3600},
        settings.jwt_secret,
        algorithm="HS256",
    )


def auth_headers(user: User) -> dict[str, str]:
    return {"Authorization": f"Bearer {issue_token(user)}"}
