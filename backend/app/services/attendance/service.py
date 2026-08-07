"""Shared attendance-report query — used by both `GET /attendance/reports`
(docs/API.md §9) and `GET /analytics/attendance` (docs/API.md §13), which are
documented as two contracts but one query (docs/DECISIONS.md ADR-019).
"""

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.security import CurrentUser
from app.models.session import AttendanceRecord, AttendanceSession
from app.models.user import Role
from app.services.attendance.schemas import SessionReportOut


def get_session_reports(
    db: Session, current_user: CurrentUser, course_code: str | None
) -> list[SessionReportOut]:
    query = select(
        AttendanceSession,
        func.count(AttendanceRecord.id).label("scan_count"),
    ).outerjoin(AttendanceRecord, AttendanceRecord.session_id == AttendanceSession.id)

    if current_user.role == Role.FACULTY:
        query = query.where(AttendanceSession.faculty_id == current_user.id)
    if course_code is not None:
        query = query.where(AttendanceSession.course_code == course_code)

    query = query.group_by(AttendanceSession.id).order_by(AttendanceSession.created_at.desc())

    rows = db.execute(query).all()
    return [
        SessionReportOut(
            session_id=session.id,
            course_code=session.course_code,
            faculty_id=session.faculty_id,
            created_at=session.created_at,
            expires_at=session.expires_at,
            scan_count=scan_count,
        )
        for session, scan_count in rows
    ]
