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
    "inline-flex items-center justify-center gap-2 rounded-plaque px-4 py-2 font-body text-sm font-medium transition active:shadow-level-4 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2";
  const variants = {
    primary: "bg-ink-navy text-chalk hover:bg-ink-navy/90 shadow-level-1 hover:shadow-level-2",
    secondary: "border border-slate/30 text-ink-navy hover:bg-chalk",
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
