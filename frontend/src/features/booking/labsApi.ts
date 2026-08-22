import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/core/api/client";
import type { AvailabilityParams } from "@/features/booking/api";
import type { AvailabilityResult, Booking } from "@/features/booking/types";

export function useLabAvailability(params: Omit<AvailabilityParams, "type"> | null) {
  return useQuery({
    queryKey: ["labs", "availability", params],
    queryFn: async () =>
      (await apiClient.get<AvailabilityResult[]>("/labs/availability", { params })).data,
    enabled: params !== null,
  });
}

interface ReserveLabInput {
  room_id: string;
  start_time: string;
  end_time: string;
  seat_number?: number | null;
}

export function useReserveLab() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ReserveLabInput) =>
      (await apiClient.post<Booking>("/labs/reservations", input)).data,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
}

export interface WaitlistEntry {
  id: string;
  room_id: string;
  user_id: string;
  requested_start: string;
  requested_end: string;
  position: number;
  notified_at: string | null;
}

export function useJoinWaitlist() {
  return useMutation({
    mutationFn: async (input: ReserveLabInput) =>
      (await apiClient.post<WaitlistEntry>("/labs/waitlist", input)).data,
  });
}

export function useOccupiedSeats(
  roomId: string | null,
  start_time: string | null,
  end_time: string | null,
) {
  return useQuery({
    queryKey: ["labs", roomId, "occupied-seats", start_time, end_time],
    queryFn: async () =>
      (
        await apiClient.get<number[]>(`/labs/${roomId}/occupied-seats`, {
          params: { start_time, end_time },
        })
      ).data,
    enabled: roomId !== null && start_time !== null && end_time !== null,
  });
}
