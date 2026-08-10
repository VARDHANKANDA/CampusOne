/** The five roles — docs/PRD.md §4. Never invent others. */
export type Role = "student" | "faculty" | "warden" | "maintenance_staff" | "admin";

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  /** Set when the user picked a non-Student role at registration and it's
   * still awaiting admin approval (POST /users/{id}/approve-role) — `role`
   * itself stays Student until then. */
  requested_role: Role | null;
  department: string | null;
  is_active: boolean;
}

export interface RegisterInput {
  email: string;
  password: string;
  full_name: string;
  department?: string;
  requested_role: Role;
}
