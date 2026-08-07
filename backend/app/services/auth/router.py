"""Auth endpoints (docs/API.md §2). Authentication itself is fully delegated to
Supabase Auth (docs/SECURITY.md §1) — this router never hashes/stores a password;
it only calls the Supabase Admin SDK and mirrors the resulting identity into our
own `users` table so the rest of the app has a role to authorize against.

Self-registration always creates a `student` account — the only role with no
elevated campus-operations privileges. Every other role (faculty, warden,
maintenance_staff, admin) is assigned exclusively by an admin via
`PATCH /users/{id}` (Module 14 — Admin Panel), never self-selected at signup.
This is an explicit security decision, not an oversight (docs/DECISIONS.md ADR-010).
"""

import logging

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.errors import AppError, UnauthorizedError
from app.core.security import CurrentUser, get_current_user
from app.core.supabase import get_supabase_client
from app.models.user import Role, User
from app.services.auth.schemas import (
    LoginRequest,
    PasswordResetRequest,
    RegisterRequest,
    TokenResponse,
    UserProfile,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserProfile, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> UserProfile:
    supabase = get_supabase_client()

    try:
        auth_response = supabase.auth.admin.create_user(
            {
                "email": payload.email,
                "password": payload.password,
                "email_confirm": True,
            }
        )
    except Exception as exc:  # Supabase SDK raises its own AuthApiError subclasses
        logger.exception("Supabase user creation failed for %s", payload.email)
        raise AppError(
            code="REGISTRATION_FAILED",
            message="Could not create account. The email may already be registered.",
            status_code=status.HTTP_400_BAD_REQUEST,
        ) from exc

    auth_user_id = auth_response.user.id

    user = User(
        id=auth_user_id,
        email=payload.email,
        full_name=payload.full_name,
        role=Role.STUDENT,
        department=payload.department,
    )
    db.add(user)
    try:
        db.commit()
    except Exception:
        db.rollback()
        try:
            supabase.auth.admin.delete_user(auth_user_id)
        except Exception:
            logger.exception("Failed to roll back orphaned Supabase auth user %s", auth_user_id)
        raise
    db.refresh(user)

    return UserProfile.model_validate(user)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest) -> TokenResponse:
    supabase = get_supabase_client()
    try:
        session = supabase.auth.sign_in_with_password(
            {"email": payload.email, "password": payload.password}
        )
    except Exception as exc:
        # Deliberately generic — do not reveal whether the email exists.
        raise UnauthorizedError("Invalid email or password.") from exc

    if session.session is None:
        raise UnauthorizedError("Invalid email or password.")

    return TokenResponse(
        access_token=session.session.access_token,
        refresh_token=session.session.refresh_token,
        expires_in=session.session.expires_in,
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(current_user: CurrentUser = Depends(get_current_user)) -> None:
    # JWTs are short-lived and stateless (docs/SECURITY.md §1); the client discarding
    # the token is the primary logout mechanism. Best-effort server-side revocation.
    try:
        get_supabase_client().auth.admin.sign_out(str(current_user.id))
    except Exception:
        logger.warning("Best-effort Supabase session revocation failed for %s", current_user.id)


@router.post("/password-reset", status_code=status.HTTP_202_ACCEPTED)
def request_password_reset(payload: PasswordResetRequest) -> dict[str, str]:
    try:
        get_supabase_client().auth.reset_password_email(payload.email)
    except Exception:
        # Never reveal whether the address is registered.
        logger.info("Password reset requested for an address that failed to dispatch")
    return {"message": "If that email is registered, a reset link has been sent."}


@router.get("/me", response_model=UserProfile)
def me(current_user: CurrentUser = Depends(get_current_user)) -> UserProfile:
    return UserProfile(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        department=current_user.department,
        is_active=True,
    )
