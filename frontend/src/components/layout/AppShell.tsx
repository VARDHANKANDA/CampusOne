import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";

import { useAuth } from "@/core/auth/useAuth";
import { NotificationBell } from "@/features/notification/NotificationBell";
import { NAV_BY_ROLE, ROLE_LABEL } from "@/routes/navigation";

/** Persistent role-scoped sidebar + top bar (docs/UI_UX.md §5.1). Active route
 * gets a brass left-edge indicator; nav items are exactly this role's IA from
 * docs/UI_UX.md §4 — never a generic menu with other roles' items hidden.
 */
export function AppShell({ children }: { children: ReactNode }): React.JSX.Element {
  const { user, logout } = useAuth();

  if (!user) {
    // RequireAuth guarantees this never renders unauthenticated, but keeps
    // the component safely typed without a non-null assertion.
    return <>{children}</>;
  }

  const navItems = NAV_BY_ROLE[user.role];

  return (
    <div className="flex min-h-screen bg-chalk">
      <aside className="flex w-64 flex-col bg-ink-navy text-chalk">
        <div className="px-5 py-6">
          <p className="font-display text-lg leading-tight">Smart Campus</p>
          <p className="font-body text-xs text-chalk/60">{ROLE_LABEL[user.role]}</p>
        </div>
        <nav className="flex-1 px-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              className={({ isActive }) =>
                `mb-1 block rounded-plaque border-l-4 px-3 py-2 font-body text-sm transition ${
                  isActive
                    ? "border-brass bg-white/5 text-chalk"
                    : "border-transparent text-chalk/70 hover:bg-white/5 hover:text-chalk"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-white/10 px-5 py-4">
          <p className="truncate font-body text-xs text-chalk/60">{user.email}</p>
          <button
            onClick={() => void logout()}
            className="mt-2 font-body text-sm text-brass hover:underline"
          >
            Sign out
          </button>
        </div>
      </aside>
      <div className="flex-1">
        <header className="flex justify-end border-b border-slate/15 bg-white px-6 py-3">
          <NotificationBell />
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
