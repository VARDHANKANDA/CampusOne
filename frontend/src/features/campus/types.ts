export type RoomType = "classroom" | "lab" | "auditorium" | "seminar_hall";

export interface Building {
  id: string;
  name: string;
  code: string;
  location: string | null;
}

export interface Room {
  id: string;
  building_id: string;
  name: string;
  type: RoomType;
  capacity: number;
  equipment_tags: string[];
  is_active: boolean;
  requires_approval: boolean;
  building?: Building;
}
