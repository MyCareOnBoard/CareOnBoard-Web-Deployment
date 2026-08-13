import { render, screen } from "./test-utils";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("App", () => {
  it("renders the route fallback at the unconfigured root location", async () => {
    render(<App />);

    expect(await screen.findByRole("heading", { name: "Page not found" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Go home" })).toBeVisible();
  });
});
