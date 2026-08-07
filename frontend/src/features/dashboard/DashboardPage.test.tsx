import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { makeUser, withFakeAuth } from "@/test/authTestUtils";

describe("DashboardPage", () => {
  it("shows this role's quick actions and attention panel", () => {
    render(
      <MemoryRouter>{withFakeAuth(makeUser({ role: "faculty" }), <DashboardPage />)}</MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: /welcome, dr\. ada faculty/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Book Room" })).toHaveAttribute(
      "href",
      "/bookings/new",
    );
    expect(screen.getByRole("link", { name: "Generate Attendance QR" })).toBeInTheDocument();
    expect(screen.getByText("Upcoming Bookings")).toBeInTheDocument();
  });

  it("shows a different quick-action set for a student", () => {
    render(
      <MemoryRouter>
        {withFakeAuth(makeUser({ role: "student", full_name: "Sam Student" }), <DashboardPage />)}
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "Submit Complaint" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Book Room" })).not.toBeInTheDocument();
  });
});
