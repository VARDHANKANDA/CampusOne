import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { makeUser, withFakeAuth } from "@/test/authTestUtils";
import { apiClient } from "@/core/api/client";

// Mock the api client to avoid hitting actual endpoints during tests
vi.mock("@/core/api/client", () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}));

function renderWithQueryClient(ui: React.ReactElement): void {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("DashboardPage", () => {
  it("shows this role's quick actions and attention panel", async () => {
    // Resolve all dashboard queries to empty arrays
    vi.mocked(apiClient.get).mockResolvedValue({ data: [] });

    renderWithQueryClient(withFakeAuth(makeUser({ role: "faculty" }), <DashboardPage />));

    expect(
      await screen.findByRole("heading", { name: /welcome back, dr\. ada faculty/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Book Lecture Hall" })).toHaveAttribute(
      "href",
      "/bookings/new",
    );
    expect(screen.getByRole("link", { name: "Start QR Attendance" })).toBeInTheDocument();
    expect(screen.getByText("Needs your attention")).toBeInTheDocument();
  });

  it("shows a different quick-action set for a student", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: [] });

    renderWithQueryClient(
      withFakeAuth(makeUser({ role: "student", full_name: "Sam Student" }), <DashboardPage />),
    );

    expect(await screen.findByRole("link", { name: "Report Hostel Issue" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Book Lecture Hall" })).not.toBeInTheDocument();
  });
});
