import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { AppShell } from "@/components/layout/AppShell";
import type { Role } from "@/core/auth/types";
import { ThemeProvider } from "@/core/theme/ThemeContext";
import { makeUser, withFakeAuth } from "@/test/authTestUtils";

vi.mock("@/core/api/client", () => ({
  apiClient: { get: vi.fn().mockResolvedValue({ data: [] }), post: vi.fn(), patch: vi.fn() },
}));

function renderShell(role: Role): void {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <MemoryRouter>
          {withFakeAuth(makeUser({ role }), <AppShell>content</AppShell>)}
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

describe("AppShell", () => {
  it("renders only this role's nav items (docs/UI_UX.md §4 role clarity)", () => {
    renderShell("warden");

    expect(screen.getByRole("link", { name: "Complaint Queue" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Hostel Reports" })).toBeInTheDocument();
    // Faculty-only nav items must not leak into a warden's sidebar.
    expect(screen.queryByRole("link", { name: "Book Room" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Users" })).not.toBeInTheDocument();
  });

  it("shows an admin's full nav set", () => {
    renderShell("admin");

    expect(screen.getByRole("link", { name: "Audit Logs" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Notification Settings" })).toBeInTheDocument();
  });
});
