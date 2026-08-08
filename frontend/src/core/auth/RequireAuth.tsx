import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "@/core/auth/useAuth";

/** Route guard — UX convenience only, the backend is the real security boundary
 * (docs/RULES.md §4.2, docs/SECURITY.md §2). Redirects unauthorized roles away
 * from pages rather than merely hiding buttons.
 */
export function RequireAuth(): React.JSX.Element {
  const { status } = useAuth();
  const location = useLocation();

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-chalk">
        <p className="font-body text-slate">Loading…</p>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return <Navigate to="/welcome" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
