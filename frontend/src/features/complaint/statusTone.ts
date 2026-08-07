import type { StatusTone } from "@/components/ui/StatusBadge";
import type { ComplaintStatus } from "@/features/complaint/types";

/** docs/UI_UX.md §7 — Submitted is "new/unassigned" (outline), Assigned/In
 * Progress are "pending", Completed/Verified are "success".
 */
export const COMPLAINT_STATUS_TONE: Record<ComplaintStatus, StatusTone> = {
  submitted: "new",
  assigned: "pending",
  in_progress: "pending",
  completed: "success",
  verified: "success",
};
