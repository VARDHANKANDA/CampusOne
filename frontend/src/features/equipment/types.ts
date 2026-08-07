export type EquipmentCategory =
  "projector" | "computer" | "lab_equipment" | "smart_board" | "furniture" | "other";
export type EquipmentStatus = "available" | "in_use" | "under_repair" | "decommissioned";

export interface Equipment {
  id: string;
  name: string;
  category: EquipmentCategory;
  building_id: string | null;
  department: string | null;
  purchase_date: string | null;
  warranty_expiry: string | null;
  status: EquipmentStatus;
}
