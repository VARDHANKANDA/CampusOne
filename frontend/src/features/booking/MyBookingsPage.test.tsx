import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { apiClient } from "@/core/api/client";
import { MyBookingsPage } from "@/features/booking/MyBookingsPage";
import type { Booking } from "@/features/booking/types";

vi.mock("@/core/api/client", () => ({
  apiClient: { get: vi.fn(), patch: vi.fn() },
}));

function renderWithQueryClient(ui: React.ReactElement): void {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

const BOOKINGS: Booking[] = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    room_id: "room-1",
    requester_id: "user-1",
    start_time: "2026-09-01T09:00:00Z",
    end_time: "2026-09-01T10:00:00Z",
    status: "confirmed",
    purpose: null,
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    room_id: "room-2",
    requester_id: "user-1",
    start_time: "2026-09-02T09:00:00Z",
    end_time: "2026-09-02T10:00:00Z",
    status: "cancelled",
    purpose: null,
  },
];

describe("MyBookingsPage", () => {
  it("shows an empty state when there are no bookings", async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [] });
    renderWithQueryClient(<MyBookingsPage />);

    expect(await screen.findByText(/no bookings yet/i)).toBeInTheDocument();
  });

  it("shows a cancel action only for cancellable bookings", async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: BOOKINGS });
    renderWithQueryClient(<MyBookingsPage />);

    await waitFor(() => expect(screen.getAllByText(/confirmed|cancelled/i)).toHaveLength(2));
    expect(screen.getAllByRole("button", { name: /cancel/i })).toHaveLength(1);
  });
});
