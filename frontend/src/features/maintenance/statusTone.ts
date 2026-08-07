import type { StatusTone } from "@/components/ui/StatusBadge";
import type { MaintenanceRequestStatus } from "@/features/maintenance/types";

export const MAINTENANCE_STATUS_TONE: Record<MaintenanceRequestStatus, StatusTone> = {
  pending: "new",
  in_progress: "pending",
  completed: "success",
};
