import type { ReactNode } from "react";

interface PlaqueCardProps {
  identifierLabel: string;
  identifier: string;
  title: string;
  meta?: ReactNode;
  status?: ReactNode;
  onClick?: () => void;
  className?: string;
}

/** The signature component (docs/UI_UX.md §5.2): Level 1 at rest, Level 2 on
 * hover, 3px brass top-edge, mono identifier top-right, Fraunces title, status
 * badge bottom-right. Reused for bookings, complaints, equipment, events.
 */
export function PlaqueCard({
  identifierLabel,
  identifier,
  title,
  meta,
  status,
  onClick,
  className = "",
}: PlaqueCardProps): React.JSX.Element {
  const interactive = Boolean(onClick);

  return (
    <div
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") onClick?.();
            }
          : undefined
      }
      className={`relative rounded-plaque border border-slate/15 bg-white p-4 shadow-level-1 before:absolute before:inset-x-0 before:top-0 before:h-[3px] before:rounded-t-plaque before:bg-gradient-to-r before:from-brass before:to-brass-light ${interactive ? "cursor-pointer transition hover:-translate-y-0.5 hover:shadow-level-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass" : ""} ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg text-ink-navy">{title}</h3>
          {meta && <div className="mt-1 font-body text-sm text-slate">{meta}</div>}
        </div>
        <div className="text-right">
          <span className="block font-body text-[10px] uppercase tracking-wide text-slate">
            {identifierLabel}
          </span>
          <span className="font-mono text-sm text-ink-navy">{identifier}</span>
        </div>
      </div>
      {status && <div className="mt-3 flex justify-end">{status}</div>}
    </div>
  );
}
