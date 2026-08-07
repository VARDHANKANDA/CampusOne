export interface RoomUtilization {
  room_id: string;
  room_name: string;
  confirmed_bookings: number;
  total_hours: number;
}

export interface ComplaintStats {
  by_status: Record<string, number>;
  by_category: Record<string, number>;
  by_priority: Record<string, number>;
}

export interface EquipmentStats {
  by_status: Record<string, number>;
  by_category: Record<string, number>;
}

export interface MaintenanceStats {
  total_requests: number;
  completed_requests: number;
  average_resolution_hours: number | null;
}
