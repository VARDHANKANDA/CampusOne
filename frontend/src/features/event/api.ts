import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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

export function useEvents(params?: { room_id?: string; from?: string; to?: string }) {
  return useQuery({
    queryKey: ["events", "list", params],
    queryFn: async () => (await apiClient.get<CampusEvent[]>("/events", { params })).data,
  });
}

export interface RSVPStatus {
  rsvp_count: number;
  user_rsvped: boolean;
}

export function useRSVPStatus(eventId: string | null) {
  return useQuery({
    queryKey: ["events", eventId, "rsvp"],
    queryFn: async () => (await apiClient.get<RSVPStatus>(`/events/${eventId}/rsvp`)).data,
    enabled: eventId !== null,
  });
}

export function useRSVP() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (eventId: string) =>
      (await apiClient.post<RSVPStatus>(`/events/${eventId}/rsvp`)).data,
    onSuccess: (_, eventId) => {
      void queryClient.invalidateQueries({ queryKey: ["events", eventId, "rsvp"] });
    },
  });
}

export function useCancelRSVP() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (eventId: string) =>
      (await apiClient.delete<RSVPStatus>(`/events/${eventId}/rsvp`)).data,
    onSuccess: (_, eventId) => {
      void queryClient.invalidateQueries({ queryKey: ["events", eventId, "rsvp"] });
    },
  });
}

export interface Attendee {
  id: string;
  full_name: string;
  email: string;
  department: string | null;
}

export function useAttendees(eventId: string | null) {
  return useQuery({
    queryKey: ["events", eventId, "attendees"],
    queryFn: async () => (await apiClient.get<Attendee[]>(`/events/${eventId}/attendees`)).data,
    enabled: eventId !== null,
  });
}

