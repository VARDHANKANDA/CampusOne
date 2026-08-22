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
      <aside className="flex w-64 flex-col border-r border-card-border bg-card-bg text-text-primary">
        <div className="px-6 py-6 border-b border-card-border">
          <p className="font-display text-xl font-extrabold tracking-tight bg-gradient-to-r from-ink-navy via-ink-navy to-brass bg-clip-text text-transparent">CampusOne</p>
          <p className="font-body text-[10px] font-bold text-text-secondary uppercase tracking-widest bg-card-bg px-2.5 py-1 rounded-full w-max mt-2 border border-card-border">{ROLE_LABEL[user.role]}</p>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-plaque px-3.5 py-2.5 font-body text-xs font-semibold tracking-wide transition-all duration-200 ${
                  isActive
                    ? "bg-ink-navy/10 border-l-[3px] border-ink-navy text-ink-navy dark:bg-brass/10 dark:border-brass dark:text-brass shadow-sm"
                    : "border-l-[3px] border-transparent text-text-secondary hover:bg-ink-navy/5 hover:text-text-primary dark:hover:bg-white/5"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User profile section */}
        <div className="border-t border-card-border px-6 py-5 bg-card-bg/20 flex flex-col gap-1">
          <Link to="/profile" className="group">
            <p className="truncate font-body text-xs font-bold text-text-primary group-hover:text-ink-navy dark:group-hover:text-brass transition-colors duration-200">
              {user.full_name || user.email}
            </p>
            <p className="saas-interactive truncate font-body text-[10px] text-text-secondary">{user.email}</p>
          </Link>
          <div className="mt-2 flex items-center gap-3">
            <Link
              to="/profile"
              className="font-body text-[11px] font-semibold text-ink-navy hover:underline dark:text-brass transition-colors duration-200"
            >
              My Profile
            </Link>
            <button
              onClick={() => void logout()}
              className="font-body text-[11px] font-semibold text-brick hover:underline transition-colors duration-200"
            >
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Panel */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="flex h-16 items-center justify-between border-b border-card-border bg-card-bg/30 backdrop-blur-md px-8 flex-shrink-0">
          {/* Breadcrumbs Wayfinding */}
          <nav className="flex items-center gap-2 text-xs text-text-secondary" aria-label="Breadcrumb">
            <Link to="/" className="hover:text-ink-navy transition-colors duration-200 font-medium">Home</Link>
            {breadcrumbs.map((bc) => (
              <span key={bc.url} className="flex items-center gap-2">
                <span className="text-slate-400 dark:text-slate-600 font-light">/</span>
                {bc.isLast ? (
                  <span className="font-bold text-text-primary">{bc.label}</span>
                ) : (
                  <Link to={bc.url} className="hover:text-ink-navy transition-colors duration-200 font-medium">{bc.label}</Link>
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
              className="flex items-center gap-3 rounded-plaque border border-card-border bg-card-bg/40 px-3.5 py-2 text-xs text-text-secondary hover:bg-card-bg hover:border-slate-350 dark:hover:border-slate-750 shadow-sm transition-all duration-200"
            >
              <svg className="h-3.5 w-3.5 text-text-secondary/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span>Search...</span>
              <kbd className="rounded bg-slate-200/60 dark:bg-slate-800/80 px-1.5 py-0.5 text-[9px] font-mono text-text-secondary font-bold">Ctrl+K</kbd>
            </button>

            {/* Theme Switcher Toggle */}
            <button
              onClick={toggleTheme}
              className="rounded-plaque p-2 border border-card-border bg-card-bg/40 text-text-secondary hover:bg-card-bg hover:text-text-primary hover:border-slate-300 dark:hover:border-slate-700 shadow-sm transition-all duration-200"
              aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
            >
              {theme === "light" ? (
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
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

