import { useMutation, useQuery } from "@tanstack/react-query";

import { apiClient } from "@/core/api/client";
import type {
  AttendanceRecord,
  AttendanceSession,
  SessionReport,
} from "@/features/attendance/types";

export function useCreateSession() {
  return useMutation({
    mutationFn: async (input: { course_code: string; duration_minutes: number }) =>
      (await apiClient.post<AttendanceSession>("/attendance/sessions", input)).data,
  });
}

export function useScanAttendance() {
  return useMutation({
    mutationFn: async (qrToken: string) =>
      (await apiClient.post<AttendanceRecord>("/attendance/scan", { qr_token: qrToken })).data,
  });
}

export function useSessionRecords(sessionId: string | null) {
  return useQuery({
    queryKey: ["attendance", "records", sessionId],
    queryFn: async () =>
      (await apiClient.get<AttendanceRecord[]>(`/attendance/sessions/${sessionId}/records`)).data,
    enabled: sessionId !== null,
  });
}

export function useAttendanceReports() {
  return useQuery({
    queryKey: ["attendance", "reports"],
    queryFn: async () => (await apiClient.get<SessionReport[]>("/attendance/reports")).data,
  });
}
