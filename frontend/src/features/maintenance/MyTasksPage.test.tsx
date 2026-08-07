import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { apiClient } from "@/core/api/client";
import { MyTasksPage } from "@/features/maintenance/MyTasksPage";
import type { MaintenanceRequest } from "@/features/maintenance/types";

vi.mock("@/core/api/client", () => ({
  apiClient: { get: vi.fn(), patch: vi.fn() },
}));

function renderWithQueryClient(ui: React.ReactElement): void {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

const TASKS: MaintenanceRequest[] = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    complaint_id: "c1",
    equipment_id: null,
    technician_id: "staff-1",
    status: "pending",
    estimated_completion: null,
    actual_completion: null,
    completion_photo_url: null,
    feedback: null,
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    complaint_id: "c2",
    equipment_id: null,
    technician_id: "staff-1",
    status: "completed",
    estimated_completion: null,
    actual_completion: "2026-01-05T00:00:00Z",
    completion_photo_url: "https://example.com/done.jpg",
    feedback: "Fixed",
  },
];

describe("MyTasksPage", () => {
  it("shows an empty state when there are no tasks", async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [] });
    renderWithQueryClient(<MyTasksPage />);

    expect(await screen.findByText(/no tasks assigned/i)).toBeInTheDocument();
  });

  it("only offers a next-status action for tasks that aren't already completed", async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: TASKS });
    renderWithQueryClient(<MyTasksPage />);

    await waitFor(() => expect(screen.getAllByText(/^(pending|completed)$/i)).toHaveLength(2));
    expect(screen.getAllByRole("button", { name: /mark/i })).toHaveLength(1);
    expect(screen.getByRole("button", { name: /mark in progress/i })).toBeInTheDocument();
  });
});
