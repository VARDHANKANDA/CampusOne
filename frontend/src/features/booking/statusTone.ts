import type { StatusTone } from "@/components/ui/StatusBadge";
import type { BookingStatus } from "@/features/booking/types";

export const BOOKING_STATUS_TONE: Record<BookingStatus, StatusTone> = {
  confirmed: "success",
  pending: "pending",
  cancelled: "muted",
  rejected: "muted",
};
