import { forwardRef, useId, type InputHTMLAttributes } from "react";

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

/** docs/UI_UX.md §5.4 — recessed inset inputs, inline field-level errors in
 * --brick; docs/UI_UX.md §6 — real <label>, never placeholder-only.
 */
export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  ({ label, error, id, className = "", ...rest }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;

    return (
      <div className="flex flex-col gap-1">
        <label htmlFor={inputId} className="font-body text-xs font-semibold tracking-wide uppercase text-text-secondary/90">
          {label}
        </label>
        <input
          id={inputId}
          ref={ref}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={`rounded-plaque border border-card-border bg-card-bg px-3.5 py-2 font-body text-sm text-text-primary transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-700 focus:border-ink-navy focus:outline-none focus:ring-4 focus:ring-ink-navy/15 ${className}`}
          {...rest}
        />
        {error && (
          <p id={`${inputId}-error`} className="font-body text-sm text-brick">
            {error}
          </p>
        )}
      </div>
    );
  },
);
TextField.displayName = "TextField";
