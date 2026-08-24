import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PayrollExceptionsPanel } from "./PayrollExceptionsPanel";

describe("PayrollExceptionsPanel", () => {
  it("defers exception bodies until the user expands the summary", () => {
    render(
      <PayrollExceptionsPanel
        blockerCodes={["COMPENSATION_MISSING"]}
        warningCodes={["OVERTIME_REVIEW"]}
      />,
    );

    expect(screen.queryByText("Compensation missing")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Show 2 payroll exceptions" }));
    expect(screen.getByText("Compensation missing")).toBeInTheDocument();
    expect(screen.getByText("Overtime review")).toBeInTheDocument();
  });

  it("renders nothing when the server reports no blockers or warnings", () => {
    const { container } = render(
      <PayrollExceptionsPanel blockerCodes={[]} warningCodes={[]} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
