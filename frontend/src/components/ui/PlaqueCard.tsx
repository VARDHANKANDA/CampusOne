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
      className={`group relative overflow-hidden rounded-plaque border border-card-border bg-card-bg/50 backdrop-blur-sm p-5 shadow-sm transition-all duration-300 before:absolute before:inset-x-0 before:top-0 before:h-[2px] before:bg-gradient-to-r before:from-ink-navy before:to-brass-light before:opacity-80 ${interactive ? "cursor-pointer hover:-translate-y-1 hover:shadow-md hover:shadow-indigo-500/5 hover:border-ink-navy/30 dark:hover:border-ink-navy/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-navy/50" : ""} ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-base font-bold text-text-primary group-hover:text-ink-navy transition-colors duration-200">{title}</h3>
          {meta && <div className="mt-2 font-body text-xs text-text-secondary leading-relaxed">{meta}</div>}
        </div>
        <div className="text-right flex-shrink-0">
          <span className="block font-body text-[9px] font-semibold uppercase tracking-wider text-slate">
            {identifierLabel}
          </span>
          <span className="font-mono text-xs font-semibold text-text-primary bg-slate/10 px-1.5 py-0.5 rounded mt-1 inline-block">{identifier}</span>
        </div>
      </div>
      {status && <div className="mt-4 flex justify-end items-center">{status}</div>}
    </div>
  );
}
