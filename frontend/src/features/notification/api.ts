import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { apiClient } from "@/core/api/client";
import { supabase } from "@/core/supabase";
import type { AppNotification, NotificationSetting } from "@/features/notification/types";

const NOTIFICATIONS_KEY = ["notifications"];

/** Polling is the always-working baseline; Realtime (below) is a progressive
 * enhancement that makes updates feel instant when Supabase Realtime is
 * reachable (docs/PRD.md FR-11.2, docs/ARCHITECTURE.md §7).
 */
export function useNotifications(unread?: boolean) {
  return useQuery({
    queryKey: [...NOTIFICATIONS_KEY, { unread }],
    queryFn: async () =>
      (await apiClient.get<AppNotification[]>("/notifications", { params: { unread } })).data,
    refetchInterval: 15_000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (notificationId: string) =>
      (await apiClient.patch<AppNotification>(`/notifications/${notificationId}/read`)).data,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
    },
  });
}

/** Subscribes to Postgres changes on `notifications` for this user and
 * invalidates the query cache on insert, so the bell/list update without
 * waiting for the next poll. Silently does nothing if Realtime is
 * unreachable — polling still covers that case.
 */
export function useNotificationRealtimeSync(userId: string | undefined): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);
}

export function useNotificationSettings() {
  return useQuery({
    queryKey: ["notification-settings"],
    queryFn: async () =>
      (await apiClient.get<NotificationSetting[]>("/admin/notification-settings")).data,
  });
}

export function useUpdateNotificationSetting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ eventType, emailEnabled }: { eventType: string; emailEnabled: boolean }) =>
      (
        await apiClient.patch<NotificationSetting>(`/admin/notification-settings/${eventType}`, {
          email_enabled: emailEnabled,
        })
      ).data,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notification-settings"] });
    },
  });
}
