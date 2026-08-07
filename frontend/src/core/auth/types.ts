/** The five roles — docs/PRD.md §4. Never invent others. */
export type Role = "student" | "faculty" | "warden" | "maintenance_staff" | "admin";

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  department: string | null;
  is_active: boolean;
}

export interface RegisterInput {
  email: string;
  password: string;
  full_name: string;
  department?: string;
}
