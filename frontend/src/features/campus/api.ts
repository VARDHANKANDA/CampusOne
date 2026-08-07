import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/core/api/client";
import type { Building, Room, RoomType } from "@/features/campus/types";

export function useBuildings() {
  return useQuery({
    queryKey: ["buildings"],
    queryFn: async () => (await apiClient.get<Building[]>("/buildings")).data,
  });
}

export function useRooms(params?: { building_id?: string; type?: string }) {
  return useQuery({
    queryKey: ["rooms", params],
    queryFn: async () => (await apiClient.get<Room[]>("/rooms", { params })).data,
  });
}

export function useCreateBuilding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; code: string; location?: string }) =>
      (await apiClient.post<Building>("/buildings", input)).data,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["buildings"] });
    },
  });
}

interface CreateRoomInput {
  building_id: string;
  name: string;
  type: RoomType;
  capacity: number;
  requires_approval?: boolean;
}

export function useCreateRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateRoomInput) =>
      (await apiClient.post<Room>("/rooms", input)).data,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["rooms"] });
    },
  });
}

export function useUpdateRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      roomId,
      ...updates
    }: {
      roomId: string;
      is_active?: boolean;
      requires_approval?: boolean;
    }) => (await apiClient.patch<Room>(`/rooms/${roomId}`, updates)).data,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["rooms"] });
    },
  });
}
