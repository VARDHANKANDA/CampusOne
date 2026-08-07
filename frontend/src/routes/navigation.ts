import type { Role } from "@/core/auth/types";

export interface NavItem {
  label: string;
  path: string;
}

/** Mirrors the role-specific information architecture in docs/UI_UX.md §4 exactly
 * — one entry per menu item listed there, in the same order.
 */
export const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  student: [
    { label: "Dashboard", path: "/" },
    { label: "Reserve Lab", path: "/labs/reserve" },
    { label: "My Bookings", path: "/bookings/mine" },
    { label: "Submit Complaint", path: "/complaints/new" },
    { label: "My Complaints", path: "/complaints/mine" },
    { label: "Scan Attendance", path: "/attendance/scan" },
    { label: "Lost & Found", path: "/lost-found" },
    { label: "Notifications", path: "/notifications" },
  ],
  faculty: [
    { label: "Dashboard", path: "/" },
    { label: "Book Room", path: "/bookings/new" },
    { label: "Reserve Lab", path: "/labs/reserve" },
    { label: "Schedule Event", path: "/events/new" },
    { label: "My Bookings", path: "/bookings/mine" },
    { label: "Generate Attendance QR", path: "/attendance/generate" },
    { label: "Attendance Reports", path: "/attendance/reports" },
    { label: "Equipment Requests", path: "/equipment/requests" },
  ],
  warden: [
    { label: "Dashboard", path: "/" },
    { label: "Complaint Queue", path: "/complaints/queue" },
    { label: "Assign Staff", path: "/complaints/assign" },
    { label: "Hostel Reports", path: "/reports/hostel" },
  ],
  maintenance_staff: [
    { label: "Dashboard", path: "/" },
    { label: "My Tasks", path: "/maintenance/tasks" },
    { label: "Update Status", path: "/maintenance/update" },
    { label: "Completion Upload", path: "/maintenance/completion" },
  ],
  admin: [
    { label: "Dashboard", path: "/" },
    { label: "Users", path: "/admin/users" },
    { label: "Buildings/Rooms", path: "/admin/rooms" },
    { label: "Equipment", path: "/admin/equipment" },
    { label: "Bookings (approvals)", path: "/admin/bookings" },
    { label: "Reports & Analytics", path: "/admin/reports" },
    { label: "Audit Logs", path: "/admin/audit-logs" },
    { label: "Notification Settings", path: "/admin/notification-settings" },
  ],
};

export const ROLE_LABEL: Record<Role, string> = {
  student: "Student",
  faculty: "Faculty",
  warden: "Hostel Warden",
  maintenance_staff: "Maintenance Staff",
  admin: "Administrator",
};
