import type { Complaint } from "@/features/complaint/types";

export type MaintenanceRequestStatus = "pending" | "in_progress" | "completed";

export interface MaintenanceRequest {
  id: string;
  complaint_id: string | null;
  equipment_id: string | null;
  technician_id: string;
  status: MaintenanceRequestStatus;
  estimated_completion: string | null;
  actual_completion: string | null;
  completion_photo_url: string | null;
  feedback: string | null;
  complaint?: Complaint;
}
