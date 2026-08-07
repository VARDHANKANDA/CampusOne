"""Audit log writer (docs/RULES.md §3.4, §5; docs/DATABASE.md §2.16).

Called via FastAPI BackgroundTasks *after* the primary transaction has already
committed, using its own DB session — a logging failure here can never roll
back or block the action it's recording.
"""

import logging
from typing import Any
from uuid import UUID

from app.core.database import SessionLocal
from app.models.audit import AuditLog

logger = logging.getLogger(__name__)


def record_audit_log(
    actor_id: UUID | None,
    action: str,
    entity_type: str,
    entity_id: UUID,
    before_state: dict[str, Any] | None = None,
    after_state: dict[str, Any] | None = None,
) -> None:
    db = SessionLocal()
    try:
        db.add(
            AuditLog(
                actor_id=actor_id,
                action=action,
                entity_type=entity_type,
                entity_id=entity_id,
                before_state=before_state,
                after_state=after_state,
            )
        )
        db.commit()
    except Exception:
        logger.exception("Failed to write audit log for %s %s", action, entity_id)
    finally:
        db.close()
