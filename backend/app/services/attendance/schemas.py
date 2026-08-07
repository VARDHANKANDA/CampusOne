from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class SessionCreate(BaseModel):
    course_code: str = Field(min_length=1, max_length=50)
    duration_minutes: int = Field(default=5, ge=1, le=30)


class SessionOut(BaseModel):
    id: UUID
    faculty_id: UUID
    course_code: str
    qr_token: str
    expires_at: datetime
    created_at: datetime

    model_config = {"from_attributes": True}


class ScanRequest(BaseModel):
    qr_token: str


class AttendanceRecordOut(BaseModel):
    id: UUID
    session_id: UUID
    student_id: UUID
    student_name: str
    scanned_at: datetime


class SessionReportOut(BaseModel):
    session_id: UUID
    course_code: str
    faculty_id: UUID
    created_at: datetime
    expires_at: datetime
    scan_count: int
