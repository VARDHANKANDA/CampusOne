import type { Role } from "@/core/auth/types";

interface DashboardConfig {
  quickActions: { label: string; path: string }[];
  attentionPanelTitle: string;
  attentionEmptyCopy: string;
}

/** docs/PRD.md FR-10.2/FR-10.3 — per-role quick actions and the "needs your
 * attention" panel. Panel content is wired to real data as each owning
 * module lands (Booking in Module 3, Complaints in Module 5, etc.) — until
 * then it's an honest empty state, not fabricated data.
 */
export const DASHBOARD_CONFIG: Record<Role, DashboardConfig> = {
  student: {
    quickActions: [
      { label: "Submit Complaint", path: "/complaints/new" },
      { label: "Scan Attendance", path: "/attendance/scan" },
    ],
    attentionPanelTitle: "My Open Complaints",
    attentionEmptyCopy: "No open complaints — submit one from Hostel Complaints when needed.",
  },
  faculty: {
    quickActions: [
      { label: "Book Room", path: "/bookings/new" },
      { label: "Generate Attendance QR", path: "/attendance/generate" },
    ],
    attentionPanelTitle: "Upcoming Bookings",
    attentionEmptyCopy: "No upcoming bookings — book a classroom or lab to get started.",
  },
  warden: {
    quickActions: [{ label: "Complaint Queue", path: "/complaints/queue" }],
    attentionPanelTitle: "Unassigned Complaints",
    attentionEmptyCopy: "No unassigned complaints in the queue right now.",
  },
  maintenance_staff: {
    quickActions: [{ label: "My Tasks", path: "/maintenance/tasks" }],
    attentionPanelTitle: "Assigned Tasks",
    attentionEmptyCopy: "No tasks assigned to you right now.",
  },
  admin: {
    quickActions: [
      { label: "Users", path: "/admin/users" },
      { label: "Bookings (approvals)", path: "/admin/bookings" },
    ],
    attentionPanelTitle: "Pending Approvals",
    attentionEmptyCopy: "Nothing awaiting approval right now.",
  },
};
