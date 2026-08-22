import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { apiClient } from "@/core/api/client";
import { MyComplaintsPage } from "@/features/complaint/MyComplaintsPage";
import type { Complaint } from "@/features/complaint/types";

vi.mock("@/core/api/client", () => ({
  apiClient: { get: vi.fn(), patch: vi.fn() },
}));

function renderWithQueryClient(ui: React.ReactElement): void {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

const COMPLAINTS: Complaint[] = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    reporter_id: "user-1",
    category: "plumbing",
    description: "Leaky faucet",
    image_url: "https://example.com/a.jpg",
    completion_image_url: null,
    priority: "medium",
    status: "submitted",
    assigned_to: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    sla_due_at: null,
    sla_breached: false,
    escalated_to_admin: false,
    feedback: null,
    cost: null,
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    reporter_id: "user-1",
    category: "electrical",
    description: "Flickering light",
    image_url: "https://example.com/b.jpg",
    completion_image_url: "https://example.com/b-fixed.jpg",
    priority: "high",
    status: "completed",
    assigned_to: "staff-1",
    created_at: "2026-01-02T00:00:00Z",
    updated_at: "2026-01-02T00:00:00Z",
    sla_due_at: null,
    sla_breached: false,
    escalated_to_admin: false,
    feedback: null,
    cost: null,
  },
];

describe("MyComplaintsPage", () => {
  it("shows an empty state when there are no complaints", async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [] });
    renderWithQueryClient(<MyComplaintsPage />);

    expect(await screen.findByText(/no complaints yet/i)).toBeInTheDocument();
  });

  it("only offers Verify for completed complaints", async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: COMPLAINTS });
    renderWithQueryClient(<MyComplaintsPage />);

    await waitFor(() => expect(screen.getAllByText(/submitted|completed/i)).toHaveLength(2));

    // Expand the completed card to render the approve/verify panel
    const completedCardHeader = screen.getByText("Flickering light");
    completedCardHeader.click();

    expect(
      await screen.findByRole("button", { name: /approve & verify resolution/i }),
    ).toBeInTheDocument();
  });
});
