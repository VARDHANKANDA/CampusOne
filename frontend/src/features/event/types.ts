export type EventStatus = "scheduled" | "cancelled";

export interface CampusEvent {
  id: string;
  room_id: string;
  organizer_id: string;
  title: string;
  start_time: string;
  end_time: string;
  status: EventStatus;
}
