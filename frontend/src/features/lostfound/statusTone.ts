import type { StatusTone } from "@/components/ui/StatusBadge";
import type { LostFoundStatus } from "@/features/lostfound/types";

export const LOST_FOUND_STATUS_TONE: Record<LostFoundStatus, StatusTone> = {
  open: "new",
  matched: "pending",
  closed: "muted",
};
