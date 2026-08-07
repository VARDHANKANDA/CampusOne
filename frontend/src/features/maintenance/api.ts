import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/core/api/client";
import type { MaintenanceRequest, MaintenanceRequestStatus } from "@/features/maintenance/types";

export function useMyMaintenanceTasks() {
  return useQuery({
    queryKey: ["maintenance-requests", "mine"],
    queryFn: async () => (await apiClient.get<MaintenanceRequest[]>("/maintenance-requests")).data,
  });
}

interface UpdateTaskInput {
  requestId: string;
  status: MaintenanceRequestStatus;
  feedback?: string;
  photo?: File;
}

export function useUpdateMaintenanceTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ requestId, status, feedback, photo }: UpdateTaskInput) => {
      const formData = new FormData();
      formData.append("status", status);
      if (feedback) formData.append("feedback", feedback);
      if (photo) formData.append("photo", photo);
      return (
        await apiClient.patch<MaintenanceRequest>(`/maintenance-requests/${requestId}`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        })
      ).data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["maintenance-requests"] });
    },
  });
}
