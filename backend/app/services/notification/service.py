"""Notification writer (docs/PRD.md Module 11, docs/ARCHITECTURE.md §3.5, §7).

Mirrors app/services/audit/service.py's pattern: called via FastAPI
BackgroundTasks after the primary transaction commits, using its own DB
session, so a notification failure never blocks or rolls back the action
that triggered it.
"""

import logging
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from sqlalchemy import select

from app.core.database import SessionLocal
from app.models.notification import Notification
from app.models.reservation import WaitlistEntry

logger = logging.getLogger(__name__)


def queue_notification(user_id: UUID, event_type: str, payload: dict[str, Any]) -> None:
    """Write one notification row. In-app + Realtime is the mandatory channel
    (docs/PRD.md §8); email dispatch, if `notification_settings.email_enabled`
    is set for this event_type, is a future extension point — not implemented
    here since no email provider is configured (docs/PRD.md §8 marks email
    optional for v1).
    """
    db = SessionLocal()
    try:
        db.add(Notification(user_id=user_id, type=event_type, payload=payload))
        db.commit()
    except Exception:
        logger.exception("Failed to write notification (%s) for user %s", event_type, user_id)
    finally:
        db.close()


def promote_waitlist(room_id: UUID, freed_start: Any, freed_end: Any) -> None:
    """Notify the top of a room's waitlist when a booking cancellation frees a
    slot that overlaps their requested window (docs/PRD.md FR-3.4,
    docs/DECISIONS.md ADR-013's deferred trigger, now implemented here).
    """
    db = SessionLocal()
    try:
        entry = (
            db.execute(
                select(WaitlistEntry)
                .where(
                    WaitlistEntry.room_id == room_id,
                    WaitlistEntry.notified_at.is_(None),
                    WaitlistEntry.requested_start < freed_end,
                    WaitlistEntry.requested_end > freed_start,
                )
                .order_by(WaitlistEntry.position)
            )
            .scalars()
            .first()
        )
        if entry is None:
            return

        db.add(
            Notification(
                user_id=entry.user_id,
                type="waitlist_slot_opened",
                payload={
                    "room_id": str(room_id),
                    "requested_start": entry.requested_start.isoformat(),
                    "requested_end": entry.requested_end.isoformat(),
                },
            )
        )
        entry.notified_at = datetime.now(UTC)
        db.commit()
    except Exception:
        logger.exception("Failed to promote waitlist for room %s", room_id)
    finally:
        db.close()
