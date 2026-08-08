import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { App } from "@/App";

describe("App", () => {
  it("redirects an unauthenticated visitor to the landing page", async () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /one platform for the vit-ap campus/i }),
      ).toBeInTheDocument();
    });
  });
});
