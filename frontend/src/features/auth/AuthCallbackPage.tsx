import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { supabase } from "@/core/supabase";
import { useAuth } from "@/core/auth/useAuth";
import { AuthLayout } from "@/features/auth/AuthLayout";

/** Landing spot for the Google/Microsoft/Facebook/Apple OAuth redirect
 * (see OAuthButtons' redirectTo). supabase-js parses the session out of the
 * URL automatically on load; this page just waits for that, then finishes
 * sign-in the same way password login does (tokenStore + /auth/me).
 */
export function AuthCallbackPage(): React.JSX.Element {
  const navigate = useNavigate();
  const { completeOAuthLogin } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const handledRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function finish(accessToken: string): Promise<void> {
      if (handledRef.current || cancelled) return;
      handledRef.current = true;
      try {
        await completeOAuthLogin(accessToken);
        if (!cancelled) navigate("/", { replace: true });
      } catch {
        if (!cancelled) setError("Could not finish signing in. Try again.");
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.access_token) void finish(session.access_token);
    });

    // Covers the case where the session was already established by the time
    // this effect runs, so onAuthStateChange's initial fire is missed.
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session?.access_token) void finish(data.session.access_token);
    });

    const timeout = setTimeout(() => {
      if (!cancelled && !handledRef.current) {
        setError("Sign-in didn't complete in time. Try again.");
      }
    }, 10000);

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [completeOAuthLogin, navigate]);

  return (
    <AuthLayout title="Signing you in…" subtitle="Just a moment">
      {error ? (
        <div className="flex flex-col gap-4">
          <div
            role="alert"
            className="rounded-plaque border border-brick/30 bg-brick/5 px-3 py-2 text-sm text-brick"
          >
            {error}
          </div>
          <Link
            to="/login"
            className="font-body text-sm font-semibold text-ink-navy hover:underline dark:text-brass"
          >
            Back to sign in
          </Link>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-ink-navy/30 border-t-ink-navy dark:border-brass/30 dark:border-t-brass" />
          <p className="font-body text-sm text-text-secondary">Completing sign-in…</p>
        </div>
      )}
    </AuthLayout>
  );
}
