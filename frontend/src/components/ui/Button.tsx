import { type ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
  isLoading?: boolean;
}

/** docs/UI_UX.md §3.4 — primary CTA uses the ink-navy gradient; §5.4 — disabled +
 * loading indicator while a request is in flight.
 */
export function Button({
  variant = "primary",
  isLoading = false,
  disabled,
  className = "",
  children,
  ...rest
}: ButtonProps): React.JSX.Element {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-plaque px-4 py-2 font-body text-sm font-semibold transition-all duration-200 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-navy focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900";
  const variants = {
    primary: "bg-gradient-to-r from-ink-navy via-ink-navy/90 to-brass text-white shadow-md shadow-indigo-500/10 hover:shadow-lg hover:shadow-indigo-500/20 border border-transparent",
    secondary: "border border-card-border bg-card-bg/40 backdrop-blur-sm text-text-primary hover:bg-card-bg hover:border-slate-300 dark:hover:border-slate-700 shadow-sm",
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${className}`}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      {...rest}
    >
      {isLoading && (
        <span
          className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden="true"
        />
      )}
      {children}
    </button>
  );
}
