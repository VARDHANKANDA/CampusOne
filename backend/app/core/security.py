"""Auth dependency: validates the Supabase-issued JWT and resolves our app-level
role/identity. Per docs/SECURITY.md §1-2 — authentication is fully delegated to
Supabase Auth; this module never issues, hashes, or stores credentials, it only
verifies the token Supabase already issued and enforces RBAC server-side.

Supabase projects sign tokens either with a legacy shared HS256 secret or with
an asymmetric key (ES256/RS256) published via a JWKS endpoint (docs/DECISIONS.md
ADR-021) — which one a given project uses isn't under this app's control, so
both verification paths are supported, dispatched on the token's own `alg` header.
"""

import time
from collections.abc import Callable
from dataclasses import dataclass
from typing import Annotated
from uuid import UUID

import httpx
from fastapi import Depends, Header
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db
from app.core.errors import ForbiddenError, UnauthorizedError
from app.models.user import Role, User


@dataclass(frozen=True)
class CurrentUser:
    id: UUID
    email: str
    role: Role
    full_name: str
    department: str | None


_JWKS_CACHE_TTL_SECONDS = 3600
_jwks_keys: list[dict] = []
_jwks_fetched_at: float = 0.0


def _get_jwks(supabase_url: str) -> list[dict]:
    global _jwks_keys, _jwks_fetched_at
    now = time.monotonic()
    if not _jwks_keys or now - _jwks_fetched_at > _JWKS_CACHE_TTL_SECONDS:
        response = httpx.get(f"{supabase_url}/auth/v1/.well-known/jwks.json", timeout=5.0)
        response.raise_for_status()
        _jwks_keys = response.json().get("keys", [])
        _jwks_fetched_at = now
    return _jwks_keys


def _decode_token(token: str) -> dict:
    settings = get_settings()
    try:
        alg = jwt.get_unverified_header(token).get("alg", "HS256")
        if alg == "HS256":
            key: str | dict = settings.jwt_secret
        else:
            kid = jwt.get_unverified_header(token).get("kid")
            matched = next(
                (k for k in _get_jwks(settings.supabase_url) if k.get("kid") == kid), None
            )
            if matched is None:
                raise UnauthorizedError("Unknown token signing key.")
            key = matched
        return jwt.decode(
            token,
            key,
            algorithms=[alg],
            audience="authenticated",
            options={"verify_aud": bool(settings.jwt_secret) or alg != "HS256"},
        )
    except JWTError as exc:
        raise UnauthorizedError("Invalid or expired session.") from exc


def get_current_user(
    authorization: Annotated[str | None, Header()] = None,
    db: Session = Depends(get_db),
) -> CurrentUser:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise UnauthorizedError("Missing bearer token.")

    token = authorization.split(" ", 1)[1].strip()
    payload = _decode_token(token)

    subject = payload.get("sub")
    if not subject:
        raise UnauthorizedError("Token missing subject claim.")

    user = db.get(User, UUID(subject))
    if user is None or not user.is_active:
        raise UnauthorizedError("Account not found or deactivated.")

    return CurrentUser(
        id=user.id,
        email=user.email,
        role=user.role,
        full_name=user.full_name,
        department=user.department,
    )


def require_role(*allowed_roles: Role) -> Callable[[CurrentUser], CurrentUser]:
    """Dependency factory: 403s any role not explicitly listed.

    Every endpoint declares its allowed roles explicitly (docs/SECURITY.md §2) —
    there is no implicitly-open endpoint beyond the public auth routes.
    """

    def _dependency(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if current_user.role not in allowed_roles:
            raise ForbiddenError(
                f"Role '{current_user.role.value}' is not permitted to perform this action."
            )
        return current_user

    return _dependency
