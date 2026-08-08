import { Navigate, Outlet } from "react-router-dom";

import { useAuth } from "@/core/auth/useAuth";

/** Inverse of RequireAuth — keeps an already-signed-in user off the landing/
 * login/register/forgot-password pages, bouncing them straight to the dashboard.
 */
export function RequireGuest(): React.JSX.Element {
  const { status } = useAuth();

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <p className="font-body text-slate">Loading…</p>
      </div>
    );
  }

  if (status === "authenticated") {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
