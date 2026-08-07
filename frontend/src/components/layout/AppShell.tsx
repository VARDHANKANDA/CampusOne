import type { ReactNode } from "react";
import { NavLink, useLocation, Link } from "react-router-dom";

import { useAuth } from "@/core/auth/useAuth";
import { useTheme } from "@/core/theme/useTheme";
import { NotificationBell } from "@/features/notification/NotificationBell";
import { CommandPalette } from "@/components/ui/CommandPalette";
import { NAV_BY_ROLE, ROLE_LABEL } from "@/routes/navigation";

const ROUTE_LABELS: Record<string, string> = {
  admin: "Admin",
  bookings: "Bookings",
  new: "Book Room",
  mine: "My Bookings",
  labs: "Labs",
  reserve: "Reserve Lab",
  complaints: "Complaints",
  queue: "Complaint Queue",
  assign: "Assign Staff",
  maintenance: "Maintenance",
  tasks: "My Tasks",
  update: "Update Status",
  completion: "Completion Upload",
  equipment: "Equipment",
  requests: "Equipment Requests",
  "lost-found": "Lost & Found",
  attendance: "Attendance",
  scan: "Scan Attendance",
  generate: "Generate QR",
  reports: "Attendance Reports",
  events: "Events",
  notifications: "Notifications",
  "notification-settings": "Notification Settings",
  users: "Users",
  rooms: "Buildings/Rooms",
  audit: "Audit Logs",
};

export function AppShell({ children }: { children: ReactNode }): React.JSX.Element {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  if (!user) {
    return <>{children}</>;
  }

  const navItems = NAV_BY_ROLE[user.role];

  // Dynamic breadcrumbs calculation
  const pathnames = location.pathname.split("/").filter((x) => x);
  const breadcrumbs = pathnames.map((segment, index) => {
    const url = `/${pathnames.slice(0, index + 1).join("/")}`;
    const label = ROUTE_LABELS[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
    const isLast = index === pathnames.length - 1;
    return { label, url, isLast };
  });

  return (
    <div className="flex min-h-screen bg-canvas text-text-primary transition-colors duration-200">
      <CommandPalette />
      
      {/* Sidebar Navigation */}
      <aside className="flex w-64 flex-col border-r border-card-border bg-[#111827] text-slate-300 dark:bg-[#0b101c]">
        <div className="px-5 py-6">
          <p className="font-display text-lg font-semibold tracking-wide text-chalk">Smart Campus</p>
          <p className="font-body text-xs text-brass">{ROLE_LABEL[user.role]}</p>
        </div>
        
        <nav className="flex-1 px-3 py-2 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-plaque px-3 py-2 font-body text-sm font-medium transition ${
                  isActive
                    ? "bg-brass/10 border-l-4 border-brass text-chalk"
                    : "border-l-4 border-transparent text-slate-400 hover:bg-white/5 hover:text-chalk"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User profile section */}
        <div className="border-t border-card-border px-5 py-4 bg-black/10">
          <p className="truncate font-body text-xs font-semibold text-chalk/90">{user.full_name || user.email}</p>
          <p className="truncate font-body text-[10px] text-slate">{user.email}</p>
          <button
            onClick={() => void logout()}
            className="mt-2 font-body text-xs font-medium text-brass hover:underline transition"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Panel */}
      <div className="flex-1 flex flex-col">
        {/* Top Header */}
        <header className="flex h-14 items-center justify-between border-b border-card-border bg-card-bg/60 backdrop-blur-md px-6">
          {/* Breadcrumbs Wayfinding */}
          <nav className="flex items-center gap-1.5 text-xs text-slate" aria-label="Breadcrumb">
            <Link to="/" className="hover:text-brass transition">Home</Link>
            {breadcrumbs.map((bc) => (
              <span key={bc.url} className="flex items-center gap-1.5">
                <span>/</span>
                {bc.isLast ? (
                  <span className="font-medium text-text-primary">{bc.label}</span>
                ) : (
                  <Link to={bc.url} className="hover:text-brass transition">{bc.label}</Link>
                )}
              </span>
            ))}
          </nav>

          {/* Quick Controls */}
          <div className="flex items-center gap-4">
            {/* Search Trigger Button */}
            <button
              onClick={() => {
                const event = new KeyboardEvent("keydown", {
                  key: "k",
                  ctrlKey: true,
                  bubbles: true,
                });
                window.dispatchEvent(event);
              }}
              className="flex items-center gap-2 rounded-plaque border border-card-border bg-canvas/30 px-3 py-1.5 text-xs text-slate hover:bg-canvas transition"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span>Search...</span>
              <kbd className="rounded bg-canvas/80 px-1 py-0.5 text-[9px] font-mono">Ctrl+K</kbd>
            </button>

            {/* Theme Switcher Toggle */}
            <button
              onClick={toggleTheme}
              className="rounded-plaque p-2 text-slate hover:bg-canvas hover:text-text-primary transition"
              aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
            >
              {theme === "light" ? (
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              )}
            </button>

            <NotificationBell />
          </div>
        </header>

        {/* Content View */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}

