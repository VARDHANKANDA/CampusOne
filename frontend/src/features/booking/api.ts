import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/core/api/client";
import type { AvailabilityResult, Booking } from "@/features/booking/types";

export interface AvailabilityParams {
  start_time: string;
  end_time: string;
  building_id?: string;
  type?: string;
  min_capacity?: number;
}

export function useAvailability(params: AvailabilityParams | null) {
  return useQuery({
    queryKey: ["bookings", "availability", params],
    queryFn: async () =>
      (await apiClient.get<AvailabilityResult[]>("/bookings/availability", { params })).data,
    enabled: params !== null,
  });
}

export function useMyBookings() {
  return useQuery({
    queryKey: ["bookings", "mine"],
    queryFn: async () => (await apiClient.get<Booking[]>("/bookings")).data,
  });
}

interface CreateBookingInput {
  room_id: string;
  start_time: string;
  end_time: string;
  purpose?: string;
  recurrence_type?: "none" | "daily" | "weekly";
  recurrence_end_date?: string | null;
  seat_number?: number | null;
}

export function useCreateBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateBookingInput) =>
      (await apiClient.post<Booking>("/bookings", input)).data,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (bookingId: string) =>
      (await apiClient.patch<Booking>(`/bookings/${bookingId}/cancel`)).data,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
}

export function usePendingBookings() {
  return useQuery({
    queryKey: ["bookings", "pending"],
    queryFn: async () =>
      (await apiClient.get<Booking[]>("/bookings", { params: { status: "pending" } })).data,
  });
}

export function useApproveBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (bookingId: string) =>
      (await apiClient.patch<Booking>(`/bookings/${bookingId}/approve`)).data,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
}

export function useRejectBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (bookingId: string) =>
      (await apiClient.patch<Booking>(`/bookings/${bookingId}/reject`)).data,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
}

export function useRoomBookings(roomId: string | null) {
  return useQuery({
    queryKey: ["bookings", "room", roomId],
    queryFn: async () =>
      (await apiClient.get<Booking[]>("/bookings", { params: { room_id: roomId } })).data,
    enabled: roomId !== null,
  });
}

