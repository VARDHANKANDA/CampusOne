import type { Room } from "@/features/campus/types";

export type BookingStatus = "pending" | "confirmed" | "cancelled" | "rejected";

export interface Booking {
  id: string;
  room_id: string;
  requester_id: string;
  start_time: string;
  end_time: string;
  status: BookingStatus;
  purpose: string | null;
  room?: Room;
  recurrence_type?: string;
  seat_number?: number | null;
}

export interface AvailabilityResult {
  room: Room;
  available: boolean;
  conflicting_window: [string, string] | null;
}
