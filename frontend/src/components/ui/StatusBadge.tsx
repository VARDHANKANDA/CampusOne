/** docs/UI_UX.md §7 status/priority visual language — every domain module maps
 * its own status vocabulary onto these five tones, color is always paired
 * with text (never the sole signal, per docs/UI_UX.md §6).
 */
export type StatusTone = "success" | "pending" | "new" | "muted" | "urgent";

const TONE_CLASSES: Record<StatusTone, string> = {
  success: "bg-quad-green text-chalk",
  pending: "bg-brass text-ink-navy",
  new: "border border-ink-navy/30 bg-ink-navy/10 text-ink-navy",
  muted: "bg-slate/20 text-slate",
  urgent: "bg-brick text-chalk shadow-level-2",
};

export function StatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: StatusTone;
}): React.JSX.Element {
  return (
    <span
      className={`inline-flex items-center rounded-plaque px-2.5 py-1 font-body text-xs font-medium capitalize ${TONE_CLASSES[tone]}`}
    >
      {label}
    </span>
  );
}
