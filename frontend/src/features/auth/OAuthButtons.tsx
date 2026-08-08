import { useState } from "react";
import type { Provider } from "@supabase/supabase-js";

import { supabase } from "@/core/supabase";

function GoogleIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 18 18" width="18" height="18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.71H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path fill="#FBBC05" d="M3.97 10.71a5.4 5.4 0 0 1 0-3.42V4.96H.96a9 9 0 0 0 0 8.08l3.01-2.33Z" />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.59-2.59C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.96l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}

function MicrosoftIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 18 18" width="18" height="18" aria-hidden="true">
      <rect x="0" y="0" width="8.5" height="8.5" fill="#F25022" />
      <rect x="9.5" y="0" width="8.5" height="8.5" fill="#7FBA00" />
      <rect x="0" y="9.5" width="8.5" height="8.5" fill="#00A4EF" />
      <rect x="9.5" y="9.5" width="8.5" height="8.5" fill="#FFB900" />
    </svg>
  );
}

function FacebookIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 18 18" width="18" height="18" aria-hidden="true">
      <circle cx="9" cy="9" r="9" fill="#1877F2" />
      <path
        fill="#fff"
        d="M11.9 11.53l.4-2.6H9.8V7.24c0-.71.35-1.4 1.47-1.4h1.14V3.65s-1.03-.18-2.02-.18c-2.06 0-3.41 1.25-3.41 3.51v1.99H4.75v2.6h2.23v6.29a8.9 8.9 0 0 0 2.75 0V11.53h2.17Z"
      />
    </svg>
  );
}

function AppleIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 18 18" width="18" height="18" aria-hidden="true" fill="currentColor">
      <path d="M13.1 2.9c.62-.75 1.04-1.8.92-2.85-.9.04-1.99.6-2.64 1.35-.58.66-1.09 1.73-.95 2.75.99.08 2-.5 2.67-1.25Z" />
      <path d="M15.9 12.6c-.03-2.36 1.93-3.5 2.02-3.55-1.1-1.61-2.81-1.83-3.42-1.86-1.46-.15-2.84.86-3.58.86-.74 0-1.87-.84-3.08-.82-1.58.02-3.05.92-3.87 2.34-1.65 2.86-.42 7.1 1.18 9.43.78 1.14 1.72 2.42 2.94 2.37 1.18-.05 1.63-.76 3.06-.76 1.42 0 1.83.76 3.08.74 1.27-.02 2.08-1.16 2.86-2.3.9-1.32 1.27-2.6 1.29-2.67-.03-.01-2.46-.95-2.48-3.78Z" />
    </svg>
  );
}

const PROVIDERS: { id: Provider; label: string; icon: () => React.JSX.Element }[] = [
  { id: "google", label: "Google", icon: GoogleIcon },
  { id: "azure", label: "Microsoft", icon: MicrosoftIcon },
  { id: "facebook", label: "Facebook", icon: FacebookIcon },
  { id: "apple", label: "Apple", icon: AppleIcon },
];

/** Google/Microsoft/Facebook/Apple sign-in. Clicking hands off to Supabase
 * Auth's own OAuth redirect flow; the app resumes at AuthCallbackPage once
 * the provider redirects back. Each provider only works once it's been
 * enabled (with its own OAuth app credentials) in the Supabase dashboard —
 * these buttons render regardless, but will show a provider-returned error
 * if that provider isn't configured yet.
 */
export function OAuthButtons(): React.JSX.Element {
  const [pendingProvider, setPendingProvider] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async (provider: Provider): Promise<void> => {
    setError(null);
    setPendingProvider(provider);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (oauthError) {
      setError(oauthError.message);
      setPendingProvider(null);
    }
    // On success the browser navigates away to the provider immediately —
    // nothing else here runs.
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-card-border" />
        <span className="font-body text-xs font-medium uppercase tracking-wide text-text-secondary">
          Or continue with
        </span>
        <div className="h-px flex-1 bg-card-border" />
      </div>
      {error && (
        <div
          role="alert"
          className="rounded-plaque border border-brick/30 bg-brick/5 px-3 py-2 text-xs text-brick"
        >
          {error}
        </div>
      )}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {PROVIDERS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => void handleClick(id)}
            disabled={pendingProvider !== null}
            aria-label={`Continue with ${label}`}
            className="flex items-center justify-center gap-2 rounded-plaque border border-card-border bg-card-bg px-3 py-2.5 font-body text-xs font-semibold text-text-primary transition-all duration-200 hover:bg-canvas hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:border-slate-700"
          >
            <Icon />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
