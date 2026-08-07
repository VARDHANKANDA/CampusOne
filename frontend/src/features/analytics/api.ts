import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/core/api/client";
import type {
  ComplaintStats,
  EquipmentStats,
  MaintenanceStats,
  RoomUtilization,
} from "@/features/analytics/types";

export function useRoomUtilization() {
  return useQuery({
    queryKey: ["analytics", "room-utilization"],
    queryFn: async () =>
      (await apiClient.get<RoomUtilization[]>("/analytics/room-utilization")).data,
  });
}

export function useComplaintStats() {
  return useQuery({
    queryKey: ["analytics", "complaints"],
    queryFn: async () => (await apiClient.get<ComplaintStats>("/analytics/complaints")).data,
  });
}

export function useEquipmentStats() {
  return useQuery({
    queryKey: ["analytics", "equipment"],
    queryFn: async () => (await apiClient.get<EquipmentStats>("/analytics/equipment")).data,
  });
}

export function useMaintenanceStats() {
  return useQuery({
    queryKey: ["analytics", "maintenance"],
    queryFn: async () => (await apiClient.get<MaintenanceStats>("/analytics/maintenance")).data,
  });
}
