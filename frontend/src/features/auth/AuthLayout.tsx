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
    <main className="flex min-h-screen items-center justify-center bg-chalk px-4">
      <div className="relative w-full max-w-sm rounded-plaque border border-slate/15 bg-white p-8 shadow-level-1 before:absolute before:inset-x-0 before:top-0 before:h-[3px] before:rounded-t-plaque before:bg-gradient-to-r before:from-brass before:to-brass-light">
        <h1 className="font-display text-2xl text-ink-navy">{title}</h1>
        {subtitle && <p className="mt-1 font-body text-sm text-slate">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>
    </main>
  );
}
