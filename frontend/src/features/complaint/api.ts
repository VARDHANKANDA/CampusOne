import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/core/api/client";
import type {
  Complaint,
  ComplaintCategory,
  ComplaintPriority,
  MaintenanceStaffUser,
} from "@/features/complaint/types";

export function useMyComplaints(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["complaints", "mine"],
    queryFn: async () => (await apiClient.get<Complaint[]>("/complaints")).data,
    enabled: options?.enabled,
  });
}

export function useComplaintQueue(status?: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["complaints", "queue", status],
    queryFn: async () =>
      (await apiClient.get<Complaint[]>("/complaints", { params: { status_filter: status } })).data,
    enabled: options?.enabled,
  });
}

export function useMaintenanceStaff() {
  return useQuery({
    queryKey: ["users", "maintenance_staff"],
    queryFn: async () => (await apiClient.get<MaintenanceStaffUser[]>("/users")).data,
  });
}

interface SubmitComplaintInput {
  category: ComplaintCategory;
  description: string;
  priority: ComplaintPriority;
  image: File;
}

export function useSubmitComplaint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SubmitComplaintInput) => {
      const formData = new FormData();
      formData.append("category", input.category);
      formData.append("description", input.description);
      formData.append("priority", input.priority);
      formData.append("image", input.image);
      return (
        await apiClient.post<Complaint>("/complaints", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        })
      ).data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["complaints"] });
    },
  });
}

export function useAssignComplaint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ complaintId, assignedTo }: { complaintId: string; assignedTo: string }) =>
      (
        await apiClient.patch<Complaint>(`/complaints/${complaintId}/assign`, {
          assigned_to: assignedTo,
        })
      ).data,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["complaints"] });
    },
  });
}

export function useVerifyComplaint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (complaintId: string) =>
      (await apiClient.patch<Complaint>(`/complaints/${complaintId}/verify`)).data,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["complaints"] });
    },
  });
}
