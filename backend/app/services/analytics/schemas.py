from uuid import UUID

from pydantic import BaseModel


class RoomUtilizationOut(BaseModel):
    room_id: UUID
    room_name: str
    confirmed_bookings: int
    total_hours: float


class ComplaintStatsOut(BaseModel):
    by_status: dict[str, int]
    by_category: dict[str, int]
    by_priority: dict[str, int]


class EquipmentStatsOut(BaseModel):
    by_status: dict[str, int]
    by_category: dict[str, int]


class MaintenanceStatsOut(BaseModel):
    total_requests: int
    completed_requests: int
    average_resolution_hours: float | None
