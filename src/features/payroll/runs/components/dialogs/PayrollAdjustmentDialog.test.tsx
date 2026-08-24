import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PayrollAdjustmentDialog } from "./PayrollAdjustmentDialog";

describe("PayrollAdjustmentDialog", () => {
  it("submits the frozen hourly DTO with canonical derived cents and no base fields", async () => {
    const submit = vi.fn().mockResolvedValue(undefined);
    render(<PayrollAdjustmentDialog open employeeId="employee-1" capability onOpenChange={vi.fn()} onSubmit={submit} />);
    fireEvent.change(screen.getByLabelText("Category"), { target: { value: "prior_period_underpayment" } });
    fireEvent.change(screen.getByLabelText("Calculation"), { target: { value: "hours_rate" } });
    fireEvent.change(screen.getByLabelText("Minutes"), { target: { value: "30" } });
    fireEvent.change(screen.getByLabelText("Hourly rate in cents"), { target: { value: "2501" } });
    fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "Correct approved prior-period time." } });
    expect(screen.getByText("$12.51")).toBeInTheDocument();
    expect(screen.queryByLabelText(/base hours|base rate/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Add adjustment" }));
    await waitFor(() => expect(submit).toHaveBeenCalledWith({
      employeeId: "employee-1",
      category: "prior_period_underpayment",
      calculation: { basis: "hours_rate", minutes: 30, rateCentsPerHour: 2501 },
      reason: "Correct approved prior-period time.",
    }));
  });

  it("rejects an invalid category/calculation pair and focuses the first error", async () => {
    render(<PayrollAdjustmentDialog open employeeId="employee-1" capability onOpenChange={vi.fn()} onSubmit={vi.fn()} />);
    const category = screen.getByLabelText("Category");
    expect(category).toHaveFocus();
    fireEvent.change(category, { target: { value: "bonus" } });
    fireEvent.click(screen.getByRole("button", { name: "Add adjustment" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/positive amount/i);
    expect(screen.getByLabelText("Amount in cents")).toHaveFocus();
  });

  it("requires the server's ten-character reason and resets draft values on close", async () => {
    const props = { employeeId: "employee-1", capability: true, onOpenChange: vi.fn(), onSubmit: vi.fn() };
    const view = render(<PayrollAdjustmentDialog open {...props} />);
    fireEvent.change(screen.getByLabelText("Amount in cents"), { target: { value: "100" } });
    fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "123456789" } });
    fireEvent.click(screen.getByRole("button", { name: "Add adjustment" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/10 to 500/i);
    view.rerender(<PayrollAdjustmentDialog open={false} {...props} />);
    view.rerender(<PayrollAdjustmentDialog open {...props} />);
    expect(screen.getByLabelText("Amount in cents")).toHaveValue("");
  });
});
