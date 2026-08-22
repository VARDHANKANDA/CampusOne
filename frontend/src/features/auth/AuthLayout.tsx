import type { ReactNode } from "react";

export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}): React.JSX.Element {
  return (
    <main className="saas-grid-bg relative flex min-h-screen items-center justify-center bg-canvas px-4 overflow-hidden">
      {/* Decorative Glow Blobs */}
      <div className="absolute top-[-10%] left-[-10%] h-[400px] w-[400px] rounded-full bg-brass/10 dark:bg-brass/5 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] h-[400px] w-[400px] rounded-full bg-ink-navy/10 dark:bg-ink-navy/5 blur-[100px] pointer-events-none" />

      <div className="relative w-full max-w-md rounded-plaque border border-card-border bg-card-bg/65 backdrop-blur-md p-8 sm:p-10 shadow-xl shadow-indigo-950/5 before:absolute before:inset-x-0 before:top-0 before:h-[3px] before:rounded-t-plaque before:bg-gradient-to-r before:from-ink-navy before:to-brass-light z-10">
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-text-primary">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-2 font-body text-xs sm:text-sm text-text-secondary font-medium">
            {subtitle}
          </p>
        )}
        <div className="mt-8">{children}</div>
      </div>
    </main>
  );
}
