/** docs/UI_UX.md §7 status/priority visual language — every domain module maps
 * its own status vocabulary onto these five tones, color is always paired
 * with text (never the sole signal, per docs/UI_UX.md §6).
 */
export type StatusTone = "success" | "pending" | "new" | "muted" | "urgent";

const TONE_CLASSES: Record<StatusTone, string> = {
  success: "bg-quad-green/10 text-quad-green border border-quad-green/20",
  pending: "bg-brass/10 text-brass border border-brass/25",
  new: "bg-ink-navy/10 text-ink-navy border border-ink-navy/20",
  muted: "bg-slate/10 text-slate border border-slate/15",
  urgent: "bg-brick/10 text-brick border border-brick/20 shadow-sm shadow-brick/5",
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
