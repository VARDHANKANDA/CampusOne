import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/core/api/client";
import type { Role } from "@/core/auth/types";

export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  requested_role: Role | null;
  department: string | null;
  is_active: boolean;
}

export function useAllUsers(includeInactive: boolean) {
  return useQuery({
    queryKey: ["admin", "users", { includeInactive }],
    queryFn: async () =>
      (
        await apiClient.get<AdminUser[]>("/users", {
          params: { include_inactive: includeInactive },
        })
      ).data,
  });
}

interface UpdateUserInput {
  userId: string;
  role?: Role;
  department?: string;
  is_active?: boolean;
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, ...updates }: UpdateUserInput) =>
      (await apiClient.patch<AdminUser>(`/users/${userId}`, updates)).data,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });
}

export function useDeactivateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) =>
      (await apiClient.delete<AdminUser>(`/users/${userId}`)).data,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });
}

interface CreateUserInput {
  email: string;
  password?: string;
  full_name: string;
  role: Role;
  department?: string | null;
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateUserInput) =>
      (await apiClient.post<AdminUser>("/users", input)).data,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });
}

export function useApproveRoleRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) =>
      (await apiClient.post<AdminUser>(`/users/${userId}/approve-role`)).data,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });
}

export function useRejectRoleRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) =>
      (await apiClient.post<AdminUser>(`/users/${userId}/reject-role`)).data,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });
}
