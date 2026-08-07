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
        <label htmlFor={inputId} className="font-body text-sm font-medium text-ink-navy">
          {label}
        </label>
        <input
          id={inputId}
          ref={ref}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={`rounded-plaque border border-slate/30 bg-chalk px-3 py-2 font-body text-sm text-ink-navy shadow-[inset_0_1px_2px_rgba(27,42,74,0.08)] focus:border-brass focus:outline-none focus:ring-2 focus:ring-brass/40 ${className}`}
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
