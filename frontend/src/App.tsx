import { Navigate, Route, Routes } from "react-router-dom";

import { AppShell } from "@/components/layout/AppShell";
import { ModulePlaceholder } from "@/components/layout/ModulePlaceholder";
import { AuthProvider } from "@/core/auth/AuthContext";
import { RequireAuth } from "@/core/auth/RequireAuth";
import { RequireGuest } from "@/core/auth/RequireGuest";
import { RequireRole } from "@/core/auth/RequireRole";
import { ThemeProvider } from "@/core/theme/ThemeContext";
import { AdminBookingsPage } from "@/features/admin/AdminBookingsPage";
import { AdminEquipmentPage } from "@/features/admin/AdminEquipmentPage";
import { AdminRoomsPage } from "@/features/admin/AdminRoomsPage";
import { AdminUsersPage } from "@/features/admin/AdminUsersPage";
import { AdminReportsPage } from "@/features/analytics/AdminReportsPage";
import { AttendanceReportsPage } from "@/features/attendance/AttendanceReportsPage";
import { GenerateAttendancePage } from "@/features/attendance/GenerateAttendancePage";
import { ScanAttendancePage } from "@/features/attendance/ScanAttendancePage";
import { AuditLogsPage } from "@/features/audit/AuditLogsPage";
import { AuthCallbackPage } from "@/features/auth/AuthCallbackPage";
import { ForgotPasswordPage } from "@/features/auth/ForgotPasswordPage";
import { LandingPage } from "@/features/auth/LandingPage";
import { LoginPage } from "@/features/auth/LoginPage";
import { RegisterPage } from "@/features/auth/RegisterPage";
import { MyBookingsPage } from "@/features/booking/MyBookingsPage";
import { NewBookingPage } from "@/features/booking/NewBookingPage";
import { ReserveLabPage } from "@/features/booking/ReserveLabPage";
import { ComplaintQueuePage } from "@/features/complaint/ComplaintQueuePage";
import { MyComplaintsPage } from "@/features/complaint/MyComplaintsPage";
import { SubmitComplaintPage } from "@/features/complaint/SubmitComplaintPage";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { EquipmentRequestsPage } from "@/features/equipment/EquipmentRequestsPage";
import { EventCalendarPage } from "@/features/event/EventCalendarPage";
import { ScheduleEventPage } from "@/features/event/ScheduleEventPage";
import { LostFoundPage } from "@/features/lostfound/LostFoundPage";
import { MyTasksPage } from "@/features/maintenance/MyTasksPage";
import { NotificationSettingsPage } from "@/features/notification/NotificationSettingsPage";
import { NotificationsPage } from "@/features/notification/NotificationsPage";
import { NAV_BY_ROLE } from "@/routes/navigation";

// Routes with a real implementation — excluded from the generic placeholder list below.
const IMPLEMENTED_PATHS = new Set([
  "/",
  "/bookings/new",
  "/bookings/mine",
  "/labs/reserve",
  "/complaints/new",
  "/complaints/mine",
  "/complaints/queue",
  "/complaints/assign",
  "/maintenance/tasks",
  "/maintenance/update",
  "/maintenance/completion",
  "/equipment/requests",
  "/lost-found",
  "/attendance/scan",
  "/attendance/generate",
  "/attendance/reports",
  "/events",
  "/events/new",
  "/notifications",
  "/admin/notification-settings",
  "/admin/reports",
  "/admin/audit-logs",
  "/admin/users",
  "/admin/rooms",
  "/admin/equipment",
  "/admin/bookings",
]);

// Every other nav destination across all five roles, deduplicated — each
// renders a placeholder until its owning module lands (see task list).
const placeholderRoutes = Array.from(
  new Map(
    Object.values(NAV_BY_ROLE)
      .flat()
      .filter((item) => !IMPLEMENTED_PATHS.has(item.path))
      .map((item) => [item.path, item.label]),
  ),
);

export function App(): React.JSX.Element {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Routes>

        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route element={<RequireGuest />}>
          <Route path="/welcome" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        </Route>
        <Route element={<RequireAuth />}>
          <Route
            path="/"
            element={
              <AppShell>
                <DashboardPage />
              </AppShell>
            }
          />
          {/* Search is open to any authenticated role (docs/API.md §10); the
              report form inside only renders for students. */}
          <Route
            path="/lost-found"
            element={
              <AppShell>
                <LostFoundPage />
              </AppShell>
            }
          />
          <Route
            path="/events"
            element={
              <AppShell>
                <EventCalendarPage />
              </AppShell>
            }
          />
          {/* Notifications are always own-scoped, open to any authenticated role. */}
          <Route
            path="/notifications"
            element={
              <AppShell>
                <NotificationsPage />
              </AppShell>
            }
          />
          <Route element={<RequireRole allow={["admin"]} />}>
            <Route
              path="/admin/notification-settings"
              element={
                <AppShell>
                  <NotificationSettingsPage />
                </AppShell>
              }
            />
            <Route
              path="/admin/reports"
              element={
                <AppShell>
                  <AdminReportsPage />
                </AppShell>
              }
            />
            <Route
              path="/admin/audit-logs"
              element={
                <AppShell>
                  <AuditLogsPage />
                </AppShell>
              }
            />
            <Route
              path="/admin/users"
              element={
                <AppShell>
                  <AdminUsersPage />
                </AppShell>
              }
            />
            <Route
              path="/admin/rooms"
              element={
                <AppShell>
                  <AdminRoomsPage />
                </AppShell>
              }
            />
            <Route
              path="/admin/equipment"
              element={
                <AppShell>
                  <AdminEquipmentPage />
                </AppShell>
              }
            />
            <Route
              path="/admin/bookings"
              element={
                <AppShell>
                  <AdminBookingsPage />
                </AppShell>
              }
            />
          </Route>
          {/* Classroom booking creation is faculty-only (docs/API.md §5). */}
          <Route element={<RequireRole allow={["faculty"]} />}>
            <Route
              path="/bookings/new"
              element={
                <AppShell>
                  <NewBookingPage />
                </AppShell>
              }
            />
          </Route>
          {/* Lab reservation and booking history are open to students and faculty
              (docs/API.md §6, §5 — owner-scoped, docs/DECISIONS.md ADR-013). */}
          <Route element={<RequireRole allow={["student", "faculty"]} />}>
            <Route
              path="/bookings/mine"
              element={
                <AppShell>
                  <MyBookingsPage />
                </AppShell>
              }
            />
            <Route
              path="/labs/reserve"
              element={
                <AppShell>
                  <ReserveLabPage />
                </AppShell>
              }
            />
          </Route>
          {/* Scanning is student-only (docs/API.md §9). */}
          <Route element={<RequireRole allow={["student"]} />}>
            <Route
              path="/attendance/scan"
              element={
                <AppShell>
                  <ScanAttendancePage />
                </AppShell>
              }
            />
          </Route>
          {/* Generating sessions is faculty-only; reports are faculty (own) + admin (all). */}
          <Route element={<RequireRole allow={["faculty"]} />}>
            <Route
              path="/attendance/generate"
              element={
                <AppShell>
                  <GenerateAttendancePage />
                </AppShell>
              }
            />
          </Route>
          <Route element={<RequireRole allow={["faculty", "admin"]} />}>
            <Route
              path="/attendance/reports"
              element={
                <AppShell>
                  <AttendanceReportsPage />
                </AppShell>
              }
            />
          </Route>
          {/* Scheduling events is faculty/admin (docs/API.md §8). */}
          <Route element={<RequireRole allow={["faculty", "admin"]} />}>
            <Route
              path="/events/new"
              element={
                <AppShell>
                  <ScheduleEventPage />
                </AppShell>
              }
            />
          </Route>
          {/* Equipment requests are faculty-only (docs/API.md §4, FR-7.3). */}
          <Route element={<RequireRole allow={["faculty"]} />}>
            <Route
              path="/equipment/requests"
              element={
                <AppShell>
                  <EquipmentRequestsPage />
                </AppShell>
              }
            />
          </Route>
          {/* Complaint submission/tracking is student-only (docs/API.md §7). */}
          <Route element={<RequireRole allow={["student"]} />}>
            <Route
              path="/complaints/new"
              element={
                <AppShell>
                  <SubmitComplaintPage />
                </AppShell>
              }
            />
            <Route
              path="/complaints/mine"
              element={
                <AppShell>
                  <MyComplaintsPage />
                </AppShell>
              }
            />
          </Route>
          {/* Complaint Queue and Assign Staff are the same view — assignment
              happens inline per complaint card. */}
          <Route element={<RequireRole allow={["warden"]} />}>
            <Route
              path="/complaints/queue"
              element={
                <AppShell>
                  <ComplaintQueuePage />
                </AppShell>
              }
            />
            <Route
              path="/complaints/assign"
              element={
                <AppShell>
                  <ComplaintQueuePage />
                </AppShell>
              }
            />
          </Route>
          {/* My Tasks, Update Status, and Completion Upload are the same view —
              the update actions live inline on each task card. */}
          <Route element={<RequireRole allow={["maintenance_staff"]} />}>
            <Route
              path="/maintenance/tasks"
              element={
                <AppShell>
                  <MyTasksPage />
                </AppShell>
              }
            />
            <Route
              path="/maintenance/update"
              element={
                <AppShell>
                  <MyTasksPage />
                </AppShell>
              }
            />
            <Route
              path="/maintenance/completion"
              element={
                <AppShell>
                  <MyTasksPage />
                </AppShell>
              }
            />
          </Route>
          {placeholderRoutes.map(([path, label]) => (
            <Route
              key={path}
              path={path}
              element={
                <AppShell>
                  <ModulePlaceholder title={label} />
                </AppShell>
              }
            />
          ))}
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </AuthProvider>
    </ThemeProvider>
  );
}
