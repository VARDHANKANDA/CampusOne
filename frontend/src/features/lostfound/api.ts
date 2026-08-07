import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/core/api/client";
import type { LostFoundItem, LostFoundType } from "@/features/lostfound/types";

export function useLostFoundSearch(params: { keyword?: string; item_type?: LostFoundType }) {
  return useQuery({
    queryKey: ["lost-found", params],
    queryFn: async () => (await apiClient.get<LostFoundItem[]>("/lost-found", { params })).data,
  });
}

interface ReportItemInput {
  type: LostFoundType;
  description: string;
  image?: File;
}

export function useReportItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ReportItemInput) => {
      const formData = new FormData();
      formData.append("type", input.type);
      formData.append("description", input.description);
      if (input.image) formData.append("image", input.image);
      return (
        await apiClient.post<LostFoundItem>("/lost-found", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        })
      ).data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["lost-found"] });
    },
  });
}

export function useMarkItemStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ itemId, status }: { itemId: string; status: "matched" | "closed" }) =>
      (await apiClient.patch<LostFoundItem>(`/lost-found/${itemId}/status`, { status })).data,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["lost-found"] });
    },
  });
}
