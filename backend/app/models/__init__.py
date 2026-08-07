"""SQLAlchemy models, one module per DATABASE.md table group. Import every module
here so Alembic's autogenerate sees the full metadata (docs/DATABASE.md §4).
"""

from app.models.audit import AuditLog
from app.models.campus import Building, Room
from app.models.complaint import Complaint
from app.models.equipment import Equipment, EquipmentRequest
from app.models.event import Event
from app.models.lost_found import LostFoundItem
from app.models.maintenance import MaintenanceRequest, MaintenanceSchedule
from app.models.notification import Notification, NotificationSetting
from app.models.reservation import Booking, WaitlistEntry
from app.models.session import AttendanceRecord, AttendanceSession
from app.models.user import User

__all__ = [
    "AttendanceRecord",
    "AttendanceSession",
    "AuditLog",
    "Booking",
    "Building",
    "Complaint",
    "Equipment",
    "EquipmentRequest",
    "Event",
    "LostFoundItem",
    "MaintenanceRequest",
    "MaintenanceSchedule",
    "Notification",
    "NotificationSetting",
    "Room",
    "User",
    "WaitlistEntry",
]
