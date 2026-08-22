import { PASSWORD_RULES } from "@/core/validation/password";

const STRENGTH_LABELS = ["Very weak", "Weak", "Fair", "Good", "Strong"];
const STRENGTH_COLORS = ["bg-brick", "bg-brick", "bg-brass", "bg-brass-light", "bg-quad-green"];

/** Live checklist + strength bar shown under the password field while
 * registering — every rule here matches what the backend actually enforces,
 * so nothing here can promise "strong enough" when the server will reject it.
 */
export function PasswordStrengthMeter({
  password,
}: {
  password: string;
}): React.JSX.Element | null {
  if (!password) return null;

  const passedCount = PASSWORD_RULES.filter((rule) => rule.test(password)).length;
  const strengthIndex = Math.max(0, passedCount - 1);

  return (
    <div className="flex flex-col gap-2 rounded-plaque border border-card-border bg-card-bg/40 p-3">
      <div className="flex items-center gap-1.5" aria-hidden="true">
        {PASSWORD_RULES.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors duration-200 ${
              i < passedCount ? STRENGTH_COLORS[strengthIndex] : "bg-card-border"
            }`}
          />
        ))}
      </div>
      <p className="font-body text-xs font-semibold text-text-secondary">
        {STRENGTH_LABELS[strengthIndex]}
      </p>
      <ul className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
        {PASSWORD_RULES.map((rule) => {
          const passed = rule.test(password);
          return (
            <li
              key={rule.label}
              className={`flex items-center gap-1.5 font-body text-xs transition-colors duration-200 ${
                passed ? "text-quad-green" : "text-text-secondary"
              }`}
            >
              <span aria-hidden="true">{passed ? "✓" : "○"}</span>
              {rule.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
