import { useMutation } from "@tanstack/react-query";

import { apiClient } from "@/core/api/client";
import type { UserProfile } from "@/core/auth/types";

interface ProfileUpdateInput {
  full_name?: string;
  department?: string;
}

export function useUpdateProfile() {
  return useMutation({
    mutationFn: async (input: ProfileUpdateInput) =>
      (await apiClient.patch<UserProfile>("/auth/me", input)).data,
  });
}

interface ChangePasswordInput {
  current_password: string;
  new_password: string;
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (input: ChangePasswordInput) => {
      await apiClient.post("/auth/change-password", input);
    },
  });
}
