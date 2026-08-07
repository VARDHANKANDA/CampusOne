"""Notification Center — docs/API.md §12, docs/PRD.md FR-11.x."""

from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.errors import ForbiddenError, NotFoundError
from app.core.security import CurrentUser, get_current_user, require_role
from app.models.notification import Notification, NotificationSetting
from app.models.user import Role
from app.services.audit.service import record_audit_log
from app.services.notification.schemas import (
    NotificationOut,
    NotificationSettingOut,
    NotificationSettingUpdate,
)

router = APIRouter(tags=["notifications"])


@router.get("/notifications", response_model=list[NotificationOut])
def list_notifications(
    unread: bool | None = None,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> list[Notification]:
    query = select(Notification).where(Notification.user_id == current_user.id)
    if unread is True:
        query = query.where(Notification.read_at.is_(None))
    elif unread is False:
        query = query.where(Notification.read_at.is_not(None))
    return list(db.execute(query.order_by(Notification.created_at.desc())).scalars().all())


@router.patch("/notifications/{notification_id}/read", response_model=NotificationOut)
def mark_notification_read(
    notification_id: UUID,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> Notification:
    notification = db.get(Notification, notification_id)
    if notification is None:
        raise NotFoundError("Notification not found")
    if notification.user_id != current_user.id:
        raise ForbiddenError("You may only mark your own notifications as read.")

    if notification.read_at is None:
        notification.read_at = datetime.now(UTC)
        db.commit()
        db.refresh(notification)
    return notification


@router.get("/admin/notification-settings", response_model=list[NotificationSettingOut])
def list_notification_settings(
    db: Session = Depends(get_db),
    _current_user: CurrentUser = Depends(require_role(Role.ADMIN)),
) -> list[NotificationSetting]:
    settings = list(
        db.execute(select(NotificationSetting).order_by(NotificationSetting.event_type))
        .scalars()
        .all()
    )
    if not settings:
        default_types = [
            "booking_confirmed",
            "complaint_status_changed",
            "maintenance_assigned",
            "waitlist_slot_opened",
            "lost_found_match",
        ]
        for et in default_types:
            ns = NotificationSetting(event_type=et, email_enabled=False)
            db.add(ns)
        db.commit()
        settings = list(
            db.execute(select(NotificationSetting).order_by(NotificationSetting.event_type))
            .scalars()
            .all()
        )
    return settings


@router.patch("/admin/notification-settings/{event_type}", response_model=NotificationSettingOut)
def update_notification_setting(
    event_type: str,
    payload: NotificationSettingUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role(Role.ADMIN)),
) -> NotificationSetting:
    setting = db.execute(
        select(NotificationSetting).where(NotificationSetting.event_type == event_type)
    ).scalar_one_or_none()
    if setting is None:
        raise NotFoundError(f"No notification setting for event type '{event_type}'")

    before = NotificationSettingOut.model_validate(setting).model_dump(mode="json")
    setting.email_enabled = payload.email_enabled
    setting.updated_by = current_user.id
    db.commit()
    db.refresh(setting)

    background_tasks.add_task(
        record_audit_log,
        current_user.id,
        "notification_setting.updated",
        "notification_setting",
        setting.id,
        before_state=before,
        after_state=NotificationSettingOut.model_validate(setting).model_dump(mode="json"),
    )
    return setting
