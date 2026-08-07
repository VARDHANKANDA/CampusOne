import { Navigate, Outlet } from "react-router-dom";

import { useAuth } from "@/core/auth/useAuth";
import type { Role } from "@/core/auth/types";

interface RequireRoleProps {
  allow: Role[];
}

/** Stacks on top of RequireAuth for role-scoped routes (docs/UI_UX.md §2 — role
 * clarity first). Still UX-only; the backend re-enforces this on every request.
 */
export function RequireRole({ allow }: RequireRoleProps): React.JSX.Element {
  const { user } = useAuth();

  if (!user || !allow.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
