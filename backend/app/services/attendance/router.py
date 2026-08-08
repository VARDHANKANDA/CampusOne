"""QR Attendance — docs/API.md §9, docs/PRD.md FR-6.x, docs/DECISIONS.md ADR-005/ADR-018.

Non-negotiable invariant #5 (master-prompt.md): tokens are short-lived,
session-scoped, single-use per student. Expiry and duplicate-scan checks are
both enforced server-side here — never trusted from the client.
"""

import secrets
from datetime import UTC, datetime, timedelta
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, Query, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.errors import AppError, ForbiddenError, NotFoundError
from app.core.security import CurrentUser, require_role
from app.models.session import AttendanceRecord, AttendanceSession
from app.models.user import Role, User
from app.services.attendance.schemas import (
    AttendanceRecordOut,
    ScanRequest,
    SessionCreate,
    SessionOut,
    SessionReportOut,
)
from app.services.attendance.service import get_session_reports
from app.services.audit.service import record_audit_log

router = APIRouter(prefix="/attendance", tags=["attendance"])


@router.post("/sessions", response_model=SessionOut, status_code=status.HTTP_201_CREATED)
def create_session(
    payload: SessionCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role(Role.FACULTY)),
) -> AttendanceSession:
    session = AttendanceSession(
        faculty_id=current_user.id,
        course_code=payload.course_code,
        qr_token=secrets.token_urlsafe(32),
        expires_at=datetime.now(UTC) + timedelta(minutes=payload.duration_minutes),
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    background_tasks.add_task(
        record_audit_log,
        current_user.id,
        "attendance_session.created",
        "attendance_session",
        session.id,
        after_state={
            "course_code": session.course_code,
            "expires_at": session.expires_at.isoformat(),
        },
    )
    return session


@router.post("/scan", response_model=AttendanceRecordOut, status_code=status.HTTP_201_CREATED)
def scan(
    payload: ScanRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role(Role.STUDENT)),
) -> AttendanceRecordOut:
    session = db.execute(
        select(AttendanceSession).where(AttendanceSession.qr_token == payload.qr_token)
    ).scalar_one_or_none()
    if session is None:
        raise NotFoundError("Invalid QR code.")

    if session.expires_at <= datetime.now(UTC):
        raise AppError("TOKEN_EXPIRED", "This QR code has expired.", status_code=400)

    existing = db.execute(
        select(AttendanceRecord).where(
            AttendanceRecord.session_id == session.id,
            AttendanceRecord.student_id == current_user.id,
        )
    ).scalar_one_or_none()
    if existing is not None:
        raise AppError("DUPLICATE_SCAN", "You have already scanned this session.", status_code=409)

    record = AttendanceRecord(session_id=session.id, student_id=current_user.id)
    db.add(record)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise AppError(
            "DUPLICATE_SCAN", "You have already scanned this session.", status_code=409
        ) from exc
    db.refresh(record)

    background_tasks.add_task(
        record_audit_log,
        current_user.id,
        "attendance.recorded",
        "attendance_record",
        record.id,
        after_state={"session_id": str(session.id), "student_id": str(current_user.id)},
    )
    return AttendanceRecordOut(
        id=record.id,
        session_id=record.session_id,
        student_id=record.student_id,
        student_name=current_user.full_name,
        scanned_at=record.scanned_at,
    )


@router.get("/sessions/{session_id}/records", response_model=list[AttendanceRecordOut])
def get_session_records(
    session_id: UUID,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role(Role.FACULTY, Role.ADMIN)),
) -> list[AttendanceRecordOut]:
    session = db.get(AttendanceSession, session_id)
    if session is None:
        raise NotFoundError("Attendance session not found")
    if current_user.role != Role.ADMIN and session.faculty_id != current_user.id:
        raise ForbiddenError("You may only view records for your own sessions.")

    rows = db.execute(
        select(AttendanceRecord, User.full_name)
        .join(User, User.id == AttendanceRecord.student_id)
        .where(AttendanceRecord.session_id == session_id)
        .order_by(AttendanceRecord.scanned_at)
    ).all()
    return [
        AttendanceRecordOut(
            id=record.id,
            session_id=record.session_id,
            student_id=record.student_id,
            student_name=full_name,
            scanned_at=record.scanned_at,
        )
        for record, full_name in rows
    ]


@router.patch("/sessions/{session_id}/rotate", response_model=SessionOut)
def rotate_session_token(
    session_id: UUID,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role(Role.FACULTY)),
) -> AttendanceSession:
    session = db.get(AttendanceSession, session_id)
    if session is None:
        raise NotFoundError("Attendance session not found")
    if session.faculty_id != current_user.id:
        raise ForbiddenError("Only the faculty owner can rotate this session's token.")
    if session.expires_at <= datetime.now(UTC):
        raise AppError(
            "SESSION_EXPIRED", "This attendance session has already expired.", status_code=400
        )

    session.qr_token = secrets.token_urlsafe(32)
    db.commit()
    db.refresh(session)
    return session


@router.get("/reports", response_model=list[SessionReportOut])
def attendance_reports(
    course_code: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role(Role.FACULTY, Role.ADMIN)),
) -> list[SessionReportOut]:
    return get_session_reports(db, current_user, course_code)
