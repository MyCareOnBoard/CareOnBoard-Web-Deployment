import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PayrollDeferralDialog } from "./PayrollDeferralDialog";

describe("PayrollDeferralDialog", () => {
  it("is absent until the explicit extended server capability exists", () => {
    render(<PayrollDeferralDialog open employeeId="employee-1" capability={false} onOpenChange={vi.fn()} onSubmit={vi.fn()} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("explains and submits a formal off-cycle obligation", async () => {
    const submit = vi.fn().mockResolvedValue(undefined);
    render(<PayrollDeferralDialog open employeeId="employee-1" capability onOpenChange={vi.fn()} onSubmit={submit} />);
    expect(screen.getByText(/creates an obligation for a later off-cycle payroll/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Deferral reason"), { target: { value: "source_conflict" } });
    fireEvent.change(screen.getByLabelText("Explanation"), { target: { value: "Resolve the conflicting approved sources." } });
    fireEvent.click(screen.getByRole("button", { name: "Defer employee" }));
    await waitFor(() => expect(submit).toHaveBeenCalledWith({ employeeId: "employee-1", reasonCategory: "source_conflict", explanation: "Resolve the conflicting approved sources." }));
  });

  it("requires the server's ten-character explanation", async () => {
    render(<PayrollDeferralDialog open employeeId="employee-1" capability onOpenChange={vi.fn()} onSubmit={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Explanation"), { target: { value: "123456789" } });
    fireEvent.click(screen.getByRole("button", { name: "Defer employee" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/10 to 500/i);
  });
});
