import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/core/auth/useAuth";
import { useMyComplaints, useVerifyComplaint, useComplaintQueue } from "@/features/complaint/api";
import { useMyBookings, usePendingBookings, useApproveBooking, useRejectBooking } from "@/features/booking/api";
import { useMyMaintenanceTasks } from "@/features/maintenance/api";
import { useNotifications } from "@/features/notification/api";
import { useAllEquipment } from "@/features/equipment/api";
import { PlaqueCard } from "@/components/ui/PlaqueCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { ROLE_LABEL } from "@/routes/navigation";

export function DashboardPage(): React.JSX.Element {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: notifications } = useNotifications();

  // Mutations for quick dashboard actions
  const verifyComplaint = useVerifyComplaint();
  const approveBooking = useApproveBooking();
  const rejectBooking = useRejectBooking();

  // 1. Role-specific query hooks loading real database data — always called
  // unconditionally (Rules of Hooks) even though only one role's data is
  // ever rendered; the early `!user` return below must come after these.
  const studentComplaints = useMyComplaints();
  const facultyBookings = useMyBookings();
  const wardenQueue = useComplaintQueue("submitted");
  const technicianTasks = useMyMaintenanceTasks();
  const adminPendingBookings = usePendingBookings();
  const allEquipment = useAllEquipment();

  if (!user) return <></>;

  // Loading States
  const isLoading =
    studentComplaints.isLoading ||
    facultyBookings.isLoading ||
    wardenQueue.isLoading ||
    technicianTasks.isLoading ||
    adminPendingBookings.isLoading ||
    (user.role === "admin" && allEquipment.isLoading);

  // Render role-specific attention panels
  const renderAttentionPanel = () => {
    if (isLoading) {
      return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="h-32 animate-pulse rounded-plaque bg-slate/10" />
          <div className="h-32 animate-pulse rounded-plaque bg-slate/10" />
        </div>
      );
    }

    switch (user.role) {
      case "student": {
        const openComplaints = (studentComplaints.data || []).filter(
          (c) => c.status !== "verified"
        );
        if (openComplaints.length === 0) {
          return (
            <div className="rounded-plaque border-2 border-dashed border-brass/35 bg-card-bg/30 p-6 text-center">
              <p className="text-sm text-slate">No active hostel complaints. Submit one if you need a repair.</p>
            </div>
          );
        }
        return (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {openComplaints.map((c) => (
              <PlaqueCard
                key={c.id}
                identifierLabel="Ticket"
                identifier={c.id.slice(0, 8).toUpperCase()}
                title={`Hostel ${c.category}`}
                meta={
                  <div className="space-y-1">
                    <p className="line-clamp-2">{c.description}</p>
                    <p className="text-xs text-slate">Submitted: {new Date(c.created_at).toLocaleDateString()}</p>
                  </div>
                }
                status={
                  <div className="flex items-center gap-2">
                    <StatusBadge label={c.status} tone={c.status === "completed" ? "success" : "pending"} />
                    {c.status === "completed" && (
                      <Button
                        variant="secondary"
                        isLoading={verifyComplaint.isPending}
                        onClick={() => verifyComplaint.mutate(c.id)}
                        className="py-1 px-2 text-xs"
                      >
                        Verify Fix
                      </Button>
                    )}
                  </div>
                }
              />
            ))}
          </div>
        );
      }

      case "faculty": {
        const upcoming = (facultyBookings.data || []).filter(
          (b) =>
            (b.status === "confirmed" || b.status === "pending") &&
            new Date(b.end_time) > new Date()
        );
        if (upcoming.length === 0) {
          return (
            <div className="rounded-plaque border-2 border-dashed border-brass/35 bg-card-bg/30 p-6 text-center">
              <p className="text-sm text-slate">No upcoming bookings. Reserve classrooms or labs when needed.</p>
            </div>
          );
        }
        return (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {upcoming.map((b) => (
              <PlaqueCard
                key={b.id}
                identifierLabel="Room"
                identifier={b.room?.name || "Room"}
                title={b.purpose || "Academic Class"}
                meta={
                  <div className="text-xs space-y-1">
                    <p>{new Date(b.start_time).toLocaleString()}</p>
                    <p>Building: {b.room?.building?.name || "Main Campus"}</p>
                  </div>
                }
                status={<StatusBadge label={b.status} tone={b.status === "confirmed" ? "success" : "pending"} />}
              />
            ))}
          </div>
        );
      }

      case "warden": {
        const unassigned = wardenQueue.data || [];
        if (unassigned.length === 0) {
          return (
            <div className="rounded-plaque border-2 border-dashed border-brass/35 bg-card-bg/30 p-6 text-center">
              <p className="text-sm text-slate">All hostel complaints have been assigned to technicians.</p>
            </div>
          );
        }
        return (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {unassigned.map((c) => (
              <PlaqueCard
                key={c.id}
                identifierLabel="Ticket"
                identifier={c.id.slice(0, 8).toUpperCase()}
                title={`${c.category.toUpperCase()} Repair`}
                meta={
                  <div className="space-y-1">
                    <p className="line-clamp-2 text-xs">{c.description}</p>
                    <p className="text-xs text-slate">Priority: <span className="font-semibold text-brick">{c.priority}</span></p>
                  </div>
                }
                status={
                  <Button onClick={() => navigate("/complaints/queue")} className="py-1 px-3 text-xs">
                    Assign Technician
                  </Button>
                }
              />
            ))}
          </div>
        );
      }

      case "maintenance_staff": {
        const myTasks = (technicianTasks.data || []).filter((t) => t.status !== "completed");
        if (myTasks.length === 0) {
          return (
            <div className="rounded-plaque border-2 border-dashed border-brass/35 bg-card-bg/30 p-6 text-center">
              <p className="text-sm text-slate">No pending tasks. Relax or check completed records.</p>
            </div>
          );
        }
        return (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {myTasks.map((t) => (
              <PlaqueCard
                key={t.id}
                identifierLabel="Task"
                identifier={t.id.slice(0, 8).toUpperCase()}
                title={t.complaint?.category || "General Maintenance"}
                meta={
                  <div className="text-xs space-y-1">
                    <p className="line-clamp-2">{t.complaint?.description || "Work Order"}</p>
                    <p className="text-slate">Due: {t.estimated_completion ? new Date(t.estimated_completion).toLocaleDateString() : "ASAP"}</p>
                  </div>
                }
                status={
                  <div className="flex items-center gap-2">
                    <StatusBadge label={t.status} tone="pending" />
                    <Button onClick={() => navigate("/maintenance/tasks")} className="py-1 px-3 text-xs">
                      Update Task
                    </Button>
                  </div>
                }
              />
            ))}
          </div>
        );
      }

      case "admin": {
        const pendingApprovals = adminPendingBookings.data || [];
        const thirtyDaysFromNow = Date.now() + 30 * 24 * 60 * 60 * 1000;
        const expiringWarranties = (allEquipment.data || []).filter((item) => {
          if (!item.warranty_expiry) return false;
          const expiryTime = new Date(item.warranty_expiry).getTime();
          return expiryTime > Date.now() && expiryTime <= thirtyDaysFromNow;
        });

        return (
          <div className="space-y-4">
            {expiringWarranties.length > 0 && (
              <div className="rounded-plaque border border-brick/35 bg-brick/5 p-4 flex items-start gap-3 animate-in fade-in">
                <svg className="h-5 w-5 text-brick flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <span className="block font-bold text-xs text-brick">Warranty Expiration Alert</span>
                  <p className="text-xs text-slate mt-1">
                    {expiringWarranties.length} equipment {expiringWarranties.length === 1 ? "asset has" : "assets have"} warranties expiring in the next 30 days. Please review contracts in the inventory panel.
                  </p>
                </div>
              </div>
            )}

            {pendingApprovals.length === 0 ? (
              <div className="rounded-plaque border-2 border-dashed border-brass/35 bg-card-bg/30 p-6 text-center">
                <p className="text-sm text-slate">All bookings are processed. Nothing awaiting approval.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {pendingApprovals.map((b) => (
                  <PlaqueCard
                    key={b.id}
                    identifierLabel="Room"
                    identifier={b.room?.name || "Room"}
                    title={b.purpose || "Booking Request"}
                    meta={
                      <div className="text-xs space-y-1 text-slate">
                        <p>Time: {new Date(b.start_time).toLocaleString()}</p>
                        <p>User ID: {b.requester_id.slice(0, 8)}</p>
                      </div>
                    }
                    status={
                      <div className="flex items-center gap-2">
                        <Button
                          variant="secondary"
                          isLoading={rejectBooking.isPending}
                          onClick={() => rejectBooking.mutate(b.id)}
                          className="py-1 px-2.5 text-xs text-brick border-brick/40 hover:bg-brick/10"
                        >
                          Reject
                        </Button>
                        <Button
                          isLoading={approveBooking.isPending}
                          onClick={() => approveBooking.mutate(b.id)}
                          className="py-1 px-3 text-xs bg-quad-green hover:bg-quad-green/90 text-white"
                        >
                          Approve
                        </Button>
                      </div>
                    }
                  />
                ))}
              </div>
            )}
          </div>
        );
      }
      default:
        return <></>;
    }
  };

  // Get quick action buttons based on user role
  const getQuickActions = () => {
    switch (user.role) {
      case "student":
        return [
          { label: "Book a Lab", path: "/labs/reserve", style: "border border-brass/30 text-brass hover:bg-brass/5" },
          { label: "Report Hostel Issue", path: "/complaints/new", style: "bg-ink-navy text-chalk hover:bg-ink-navy/90" },
          { label: "Scan Class QR", path: "/attendance/scan", style: "bg-brass text-ink-navy hover:bg-brass/90 font-semibold" },
        ];
      case "faculty":
        return [
          { label: "Schedule Seminar/Event", path: "/events/new", style: "border border-brass/30 text-brass hover:bg-brass/5" },
          { label: "Book Lecture Hall", path: "/bookings/new", style: "bg-ink-navy text-chalk hover:bg-ink-navy/90" },
          { label: "Start QR Attendance", path: "/attendance/generate", style: "bg-brass text-ink-navy hover:bg-brass/90 font-semibold" },
        ];
      case "warden":
        return [
          { label: "Complaints Queue", path: "/complaints/queue", style: "bg-ink-navy text-chalk hover:bg-ink-navy/90" },
          { label: "Assigned Status Reports", path: "/complaints/assign", style: "border border-brass/30 text-brass hover:bg-brass/5" },
        ];
      case "maintenance_staff":
        return [
          { label: "Open Tasks List", path: "/maintenance/tasks", style: "bg-ink-navy text-chalk hover:bg-ink-navy/90" },
        ];
      case "admin":
        return [
          { label: "Users Registry", path: "/admin/users", style: "border border-brass/30 text-brass hover:bg-brass/5" },
          { label: "Manage Classrooms", path: "/admin/rooms", style: "bg-ink-navy text-chalk hover:bg-ink-navy/90" },
          { label: "Audit Trails", path: "/admin/audit-logs", style: "bg-brass text-ink-navy hover:bg-brass/90 font-semibold" },
        ];
      default:
        return [];
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 rounded-plaque border border-card-border bg-card-bg p-6 shadow-level-1">
        <div>
          <h1 className="font-display text-2xl font-semibold text-text-primary">Welcome back, {user.full_name || user.email}</h1>
          <p className="mt-1 font-body text-sm text-slate">{ROLE_LABEL[user.role]} Console · Campus operations digitized</p>
        </div>

        {/* Live Weather Widget Mockup */}
        <div className="flex items-center gap-3 bg-canvas/60 px-4 py-2 rounded-plaque border border-card-border">
          <svg className="h-8 w-8 text-brass animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 9H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
          </svg>
          <div className="text-right">
            <div className="text-xs font-bold text-text-primary">Campus Temp</div>
            <div className="text-xs text-slate">78°F Sunny · Light breeze</div>
          </div>
        </div>
      </div>

      {/* Main Grid: Info Cards + Attention Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Columns: Quick Actions and Needs Attention */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Quick Actions Panel */}
          <section className="rounded-plaque border border-card-border bg-card-bg p-6 shadow-level-1">
            <h2 className="mb-4 font-body text-xs font-bold uppercase tracking-widest text-slate">
              Operational shortcuts
            </h2>
            <div className="flex flex-wrap gap-3">
              {getQuickActions().map((action) => (
                <Link
                  key={action.path}
                  to={action.path}
                  className={`rounded-plaque px-4 py-2.5 font-body text-xs font-semibold shadow-level-1 transition hover:-translate-y-0.5 hover:shadow-level-2 ${action.style}`}
                >
                  {action.label}
                </Link>
              ))}
            </div>
          </section>

          {/* Attention Panel */}
          <section className="rounded-plaque border border-card-border bg-card-bg p-6 shadow-level-1">
            <h2 className="mb-4 font-body text-xs font-bold uppercase tracking-widest text-slate">
              Needs your attention
            </h2>
            {renderAttentionPanel()}
          </section>
        </div>

        {/* Right 1 Column: Live Activity Stream */}
        <div className="space-y-6">
          <section className="rounded-plaque border border-card-border bg-card-bg p-6 shadow-level-1 flex flex-col h-[400px]">
            <h2 className="mb-4 font-body text-xs font-bold uppercase tracking-widest text-slate">
              Live updates
            </h2>
            
            <div className="flex-1 overflow-y-auto pr-1">
              {!notifications || notifications.length === 0 ? (
                <div className="h-full flex items-center justify-center text-center p-6 text-xs text-slate">
                  No notifications or system logs yet.
                </div>
              ) : (
                <ul className="space-y-4">
                  {notifications.slice(0, 5).map((n) => (
                    <li key={n.id} className="relative pl-5 border-l-2 border-brass/30 last:border-0 pb-1">
                      <span className="absolute left-[-5px] top-1.5 h-2 w-2 rounded-full bg-brass" />
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-text-primary capitalize">
                          {n.type.replace(/_/g, " ")}
                        </span>
                        <span className="text-[9px] text-slate">
                          {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-slate mt-0.5 line-clamp-2">
                        {n.payload?.message || `Referenced entity ID: ${n.payload?.booking_id || n.payload?.room_id || "System Action"}`}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            
            <div className="border-t border-card-border pt-3 mt-3 text-center">
              <Link to="/notifications" className="text-xs font-semibold text-brass hover:underline">
                View all notifications →
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
