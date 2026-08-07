"""User Management — docs/API.md §3. `GET /users` is scoped narrowly for
warden (Module 5's assignment flow, docs/DECISIONS.md ADR-015). The rest
(`GET/PATCH/DELETE /users/{id}`) is Module 14 — Admin Panel.
"""

from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.errors import ForbiddenError, NotFoundError
from app.core.security import CurrentUser, get_current_user, require_role
from app.models.user import Role, User
from app.services.audit.service import record_audit_log
from app.services.users.schemas import UserOut, UserUpdate

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
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
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
