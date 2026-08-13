import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("App", () => {
  it("renders the root splash screen through the application router", async () => {
    render(<App />);

    expect(await screen.findByRole("heading", { name: "CareOnboard" })).toBeVisible();
    expect(screen.getByAltText("CareOnboard Logo")).toBeVisible();
  });
});
