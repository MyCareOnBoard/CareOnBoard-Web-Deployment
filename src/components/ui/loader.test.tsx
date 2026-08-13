import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ButtonLoader, PageLoader } from "./loader";

describe("loader", () => {
  it("renders an accessible spinner without styled-component runtime dependencies", () => {
    render(<ButtonLoader />);

    expect(screen.getByLabelText("loading")).toBeVisible();
  });

  it("keeps page-loader text and its full-screen overlay", () => {
    const { container } = render(<PageLoader text="Loading application..." />);

    expect(screen.getByText("Loading application...")).toBeVisible();
    expect(container.firstChild).toHaveClass("fixed", "inset-0");
  });
});
