import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/core/api/client";
import type { Equipment, EquipmentCategory } from "@/features/equipment/types";

export function useAvailableEquipment() {
  return useQuery({
    queryKey: ["equipment", "available"],
    queryFn: async () =>
      (await apiClient.get<Equipment[]>("/equipment", { params: { status_filter: "available" } }))
        .data,
  });
}

export function useAllEquipment() {
  return useQuery({
    queryKey: ["equipment", "all"],
    queryFn: async () => (await apiClient.get<Equipment[]>("/equipment")).data,
  });
}

export function useCreateEquipment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; category: EquipmentCategory }) =>
      (await apiClient.post<Equipment>("/equipment", input)).data,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["equipment"] });
    },
  });
}

export function useRequestEquipment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ equipmentId, purpose }: { equipmentId: string; purpose?: string }) =>
      (
        await apiClient.post(`/equipment/${equipmentId}/request`, {
          purpose: purpose || undefined,
        })
      ).data,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["equipment"] });
    },
  });
}
