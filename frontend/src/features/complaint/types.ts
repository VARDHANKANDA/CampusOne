export type ComplaintCategory = "plumbing" | "electrical" | "network" | "furniture" | "other";
export type ComplaintPriority = "low" | "medium" | "high" | "urgent";
export type ComplaintStatus = "submitted" | "assigned" | "in_progress" | "completed" | "verified";

export interface Complaint {
  id: string;
  reporter_id: string;
  category: ComplaintCategory;
  description: string;
  image_url: string | null;
  completion_image_url: string | null;
  priority: ComplaintPriority;
  status: ComplaintStatus;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

export interface MaintenanceStaffUser {
  id: string;
  full_name: string;
  email: string;
}
