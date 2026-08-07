import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/core/api/client";
import type { AuditLogEntry } from "@/features/audit/types";

export interface AuditLogFilters {
  actor_id?: string;
  entity_type?: string;
}

export function useAuditLogs(filters: AuditLogFilters) {
  return useQuery({
    queryKey: ["audit-logs", filters],
    queryFn: async () =>
      (await apiClient.get<AuditLogEntry[]>("/audit-logs", { params: filters })).data,
  });
}
