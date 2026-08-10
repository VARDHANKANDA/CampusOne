"""User Management — docs/API.md §3. `GET /users` is scoped narrowly for
warden (Module 5's assignment flow, docs/DECISIONS.md ADR-015). The rest
(`GET/PATCH/DELETE /users/{id}`) is Module 14 — Admin Panel.
"""

import logging
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.errors import AppError, ForbiddenError, NotFoundError
from app.core.security import CurrentUser, get_current_user, require_role
from app.core.supabase import get_supabase_client
from app.models.user import Role, User
from app.services.audit.service import record_audit_log
from app.services.notification.service import queue_notification
from app.services.users.schemas import UserCreate, UserOut, UserUpdate

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[UserOut])
def list_users(
    role: Role | None = None,
    department: str | None = None,
    include_inactive: bool = False,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role(Role.ADMIN, Role.WARDEN)),
) -> list[User]:
    query = select(User)
    # Only admin can surface deactivated users (e.g. to reactivate one, FR-14.1)
    # — a warden's maintenance-staff lookup should never include them.
    if current_user.role == Role.WARDEN or not include_inactive:
        query = query.where(User.is_active.is_(True))

    if current_user.role == Role.WARDEN:
        # Wardens can only discover maintenance staff to assign complaints to
        # (docs/DECISIONS.md ADR-015) — never list students/faculty/other wardens.
        query = query.where(User.role == Role.MAINTENANCE_STAFF)
    elif role is not None:
        query = query.where(User.role == role)

    if department is not None:
        query = query.where(User.department == department)

    return list(db.execute(query.order_by(User.full_name)).scalars().all())


@router.get("/{user_id}", response_model=UserOut)
def get_user(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> User:
    if current_user.role != Role.ADMIN and current_user.id != user_id:
        raise ForbiddenError("You may only view your own profile.")
    user = db.get(User, user_id)
    if user is None:
        raise NotFoundError("User not found")
    return user


@router.patch("/{user_id}", response_model=UserOut)
def update_user(
    user_id: UUID,
    payload: UserUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role(Role.ADMIN)),
) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise NotFoundError("User not found")

    before = UserOut.model_validate(user).model_dump(mode="json")
    updated_fields = payload.model_dump(exclude_unset=True)
    for field, value in updated_fields.items():
        setattr(user, field, value)
    if "role" in updated_fields:
        # A manually-assigned role resolves any pending self-service request,
        # whether it matches what was requested or not.
        user.requested_role = None
    db.commit()
    db.refresh(user)

    background_tasks.add_task(
        record_audit_log,
        current_user.id,
        "user.updated",
        "user",
        user.id,
        before_state=before,
        after_state=UserOut.model_validate(user).model_dump(mode="json"),
    )
    return user


@router.post("/{user_id}/approve-role", response_model=UserOut)
def approve_role_request(
    user_id: UUID,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role(Role.ADMIN)),
) -> User:
    """Grants a user's self-requested role from registration (docs/DECISIONS.md
    ADR-010's approval flow) — the only other way a non-student role is ever
    assigned besides an admin setting it directly via `PATCH /users/{id}`.
    """
    user = db.get(User, user_id)
    if user is None:
        raise NotFoundError("User not found")
    if user.requested_role is None:
        raise AppError(
            code="NO_PENDING_ROLE_REQUEST",
            message="This user has no pending role request.",
            status_code=400,
        )

    before = UserOut.model_validate(user).model_dump(mode="json")
    granted_role = user.requested_role
    user.role = granted_role
    user.requested_role = None
    db.commit()
    db.refresh(user)

    background_tasks.add_task(
        record_audit_log,
        current_user.id,
        "user.role_request_approved",
        "user",
        user.id,
        before_state=before,
        after_state=UserOut.model_validate(user).model_dump(mode="json"),
    )
    background_tasks.add_task(
        queue_notification,
        user.id,
        "role_request_approved",
        {"role": granted_role.value},
    )
    return user


@router.post("/{user_id}/reject-role", response_model=UserOut)
def reject_role_request(
    user_id: UUID,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role(Role.ADMIN)),
) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise NotFoundError("User not found")
    if user.requested_role is None:
        raise AppError(
            code="NO_PENDING_ROLE_REQUEST",
            message="This user has no pending role request.",
            status_code=400,
        )

    before = UserOut.model_validate(user).model_dump(mode="json")
    rejected_role = user.requested_role
    user.requested_role = None
    db.commit()
    db.refresh(user)

    background_tasks.add_task(
        record_audit_log,
        current_user.id,
        "user.role_request_rejected",
        "user",
        user.id,
        before_state=before,
        after_state=UserOut.model_validate(user).model_dump(mode="json"),
    )
    background_tasks.add_task(
        queue_notification,
        user.id,
        "role_request_rejected",
        {"role": rejected_role.value},
    )
    return user


@router.delete("/{user_id}", response_model=UserOut)
def deactivate_user(
    user_id: UUID,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role(Role.ADMIN)),
) -> User:
    """Soft delete (docs/API.md §3) — deactivates rather than removing the row,
    since bookings/complaints/etc. hold FKs to users that must survive.
    """
    user = db.get(User, user_id)
    if user is None:
        raise NotFoundError("User not found")

    before = UserOut.model_validate(user).model_dump(mode="json")
    user.is_active = False
    db.commit()
    db.refresh(user)

    background_tasks.add_task(
        record_audit_log,
        current_user.id,
        "user.deactivated",
        "user",
        user.id,
        before_state=before,
        after_state=UserOut.model_validate(user).model_dump(mode="json"),
    )
    return user


@router.post("", response_model=UserOut, status_code=201)
def create_user(
    payload: UserCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role(Role.ADMIN)),
) -> User:
    supabase = get_supabase_client()
    try:
        auth_response = supabase.auth.admin.create_user(
            {
                "email": payload.email,
                "password": payload.password,
                "email_confirm": True,
            }
        )
    except Exception as exc:
        logger.exception("Supabase admin user creation failed for %s", payload.email)
        raise AppError(
            code="USER_CREATION_FAILED",
            message="Could not create user account in auth system.",
            status_code=400,
        ) from exc

    auth_user_id = auth_response.user.id
    user = User(
        id=auth_user_id,
        email=payload.email,
        full_name=payload.full_name,
        role=payload.role,
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

    background_tasks.add_task(
        record_audit_log,
        current_user.id,
        "user.created",
        "user",
        user.id,
        after_state=UserOut.model_validate(user).model_dump(mode="json"),
    )
    return user
