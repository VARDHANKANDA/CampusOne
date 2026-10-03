"""Auth endpoints (docs/API.md §2). Authentication itself is fully delegated to
Supabase Auth (docs/SECURITY.md §1) — this router never hashes/stores a password;
it only calls the Supabase Admin SDK and mirrors the resulting identity into our
own `users` table so the rest of the app has a role to authorize against.

Self-registration always creates a `student` account — the only role granted
without review. A registrant may pick a different role on the form, but that
only records `requested_role`; it never becomes the account's actual `role`
until an admin approves it (`POST /users/{id}/approve-role`, Module 14 — Admin
Panel) or an admin assigns a role directly (`PATCH /users/{id}`). This is an
explicit security decision, not an oversight (docs/DECISIONS.md ADR-010) — no
request body field is ever trusted to grant elevated access by itself.
"""

import logging

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.errors import AppError, UnauthorizedError
from app.core.security import CurrentUser, VerifiedClaims, get_current_user, get_verified_claims
from app.core.supabase import get_supabase_client
from app.models.user import Role, User
from app.services.auth.schemas import (
    ChangePasswordRequest,
    LoginRequest,
    PasswordResetRequest,
    ProfileUpdateRequest,
    RegisterRequest,
    TokenResponse,
    UserProfile,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserProfile, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> UserProfile:
    try:
        supabase = get_supabase_client()
        auth_response = supabase.auth.admin.create_user(
            {
                "email": payload.email,
                "password": payload.password,
                "email_confirm": True,
            }
        )
    except AppError:
        raise
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
        # Only recorded as a pending request, never applied directly — an
        # admin must approve it (POST /users/{id}/approve-role) first.
        requested_role=payload.requested_role if payload.requested_role != Role.STUDENT else None,
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
    try:
        supabase = get_supabase_client()
        session = supabase.auth.sign_in_with_password(
            {"email": payload.email, "password": payload.password}
        )
    except AppError:
        raise
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


@router.post("/oauth-sync", response_model=UserProfile)
def oauth_sync(
    claims: VerifiedClaims = Depends(get_verified_claims), db: Session = Depends(get_db)
) -> UserProfile:
    """Called by the frontend immediately after a Google/Microsoft/Facebook/Apple
    OAuth redirect completes. Supabase Auth creates its own auth user on first
    OAuth sign-in automatically, but that user never goes through `register`
    above, so our own `users` row wouldn't exist yet — this just-in-time
    provisions it on first sight, same student-only self-registration policy
    as email/password signup (ADR-010).
    """
    user = db.get(User, claims.id)
    if user is not None:
        if not user.is_active:
            raise UnauthorizedError("Account not found or deactivated.")
        return UserProfile.model_validate(user)

    if not claims.email:
        raise AppError(
            code="OAUTH_SYNC_FAILED",
            message="Your identity provider did not share an email address.",
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    user = User(
        id=claims.id,
        email=claims.email,
        full_name=claims.full_name or claims.email.split("@", 1)[0],
        role=Role.STUDENT,
        department=None,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserProfile.model_validate(user)


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
        requested_role=current_user.requested_role,
        department=current_user.department,
        is_active=True,
    )


@router.patch("/me", response_model=UserProfile)
def update_me(
    payload: ProfileUpdateRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserProfile:
    """Self-service profile editing. Deliberately narrower than admin's
    `PATCH /users/{id}` — a user can rename themselves or change their own
    department, never their own role or active status.
    """
    user = db.get(User, current_user.id)
    if user is None:
        raise UnauthorizedError("Account not found or deactivated.")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return UserProfile.model_validate(user)


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(
    payload: ChangePasswordRequest, current_user: CurrentUser = Depends(get_current_user)
) -> None:
    # Deliberately two separate clients: sign_in_with_password mutates the
    # calling client's own internal session, so a client that's already done
    # a user sign-in switches its Authorization header to that user's token
    # on subsequent calls — the admin.update_user_by_id call below would then
    # run as that user (403 "User not allowed") instead of as service_role.
    try:
        get_supabase_client().auth.sign_in_with_password(
            {"email": current_user.email, "password": payload.current_password}
        )
    except Exception as exc:
        raise UnauthorizedError("Current password is incorrect.") from exc

    try:
        get_supabase_client().auth.admin.update_user_by_id(
            str(current_user.id), {"password": payload.new_password}
        )
    except Exception as exc:
        logger.exception("Failed to update password for %s", current_user.id)
        raise AppError(
            code="PASSWORD_UPDATE_FAILED",
            message="Could not update your password. Try again.",
            status_code=status.HTTP_400_BAD_REQUEST,
        ) from exc
