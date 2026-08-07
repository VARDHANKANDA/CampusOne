"""An in-memory double for the Supabase Admin SDK surface our auth router uses.

Lets integration tests exercise the real register/login/logout code paths
without a live Supabase project — only the external call is faked; everything
downstream (our own `users` table, JWT decoding via app.core.security) is real.
"""

import time
import uuid
from dataclasses import dataclass, field
from types import SimpleNamespace

from jose import jwt

from app.core.config import get_settings


@dataclass
class _StoredUser:
    id: uuid.UUID
    email: str
    password: str


class FakeAuthAdminClient:
    def __init__(self, users: dict[str, _StoredUser]) -> None:
        self._users = users

    def create_user(self, payload: dict) -> SimpleNamespace:
        if payload["email"] in self._users:
            raise ValueError("User already registered")
        user = _StoredUser(id=uuid.uuid4(), email=payload["email"], password=payload["password"])
        self._users[payload["email"]] = user
        return SimpleNamespace(user=SimpleNamespace(id=user.id))

    def delete_user(self, user_id: uuid.UUID) -> None:
        self._users = {e: u for e, u in self._users.items() if u.id != user_id}

    def sign_out(self, _user_id: str) -> None:
        return None


class FakeAuthClient:
    def __init__(self) -> None:
        self._users: dict[str, _StoredUser] = {}
        self.admin = FakeAuthAdminClient(self._users)

    def sign_in_with_password(self, credentials: dict) -> SimpleNamespace:
        user = self._users.get(credentials["email"])
        if user is None or user.password != credentials["password"]:
            raise ValueError("Invalid login credentials")

        settings = get_settings()
        token = jwt.encode(
            {"sub": str(user.id), "aud": "authenticated", "exp": int(time.time()) + 3600},
            settings.jwt_secret,
            algorithm="HS256",
        )
        session = SimpleNamespace(access_token=token, refresh_token="fake-refresh", expires_in=3600)
        return SimpleNamespace(session=session, user=SimpleNamespace(id=user.id))

    def reset_password_email(self, _email: str) -> None:
        return None


class FakeStorageBucket:
    def __init__(self, bucket: str) -> None:
        self.bucket = bucket

    def upload(self, path: str, _contents: bytes, file_options: dict | None = None) -> None:
        return None

    def get_public_url(self, path: str) -> str:
        return f"https://fake-storage.local/{self.bucket}/{path}"


class FakeStorageClient:
    def from_(self, bucket: str) -> FakeStorageBucket:
        return FakeStorageBucket(bucket)


@dataclass
class FakeSupabaseClient:
    auth: FakeAuthClient = field(default_factory=FakeAuthClient)
    storage: FakeStorageClient = field(default_factory=FakeStorageClient)
