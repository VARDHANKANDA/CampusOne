import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/core/api/client";
import type { CampusEvent } from "@/features/event/types";

interface CreateEventInput {
  room_id: string;
  title: string;
  start_time: string;
  end_time: string;
}

export function useCreateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateEventInput) =>
      (await apiClient.post<CampusEvent>("/events", input)).data,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });
}
