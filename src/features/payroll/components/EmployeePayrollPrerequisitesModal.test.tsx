import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import EmployeePayrollPrerequisitesModal from "./EmployeePayrollPrerequisitesModal";

describe("EmployeePayrollPrerequisitesModal", () => {
  it("prefills only safe identity details and sends null when an invalid email is explicitly removed", async () => {
    const submit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<EmployeePayrollPrerequisitesModal open values={{ legalName: "Ada Lovelace", email: "broken-email" }} missingFieldCodes={[]} invalidFieldCodes={["email"]} isSubmitting={false} onOpenChange={vi.fn()} onSubmit={submit} />);
    expect(screen.getByLabelText("Legal name")).toHaveValue("Ada Lovelace");
    expect(screen.getByLabelText(/email/i)).toHaveValue("broken-email");
    expect(screen.queryByText(/ssn|social security|date of birth|bank|tax|address/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Remove email" }));
    await user.click(screen.getByRole("button", { name: "Start payroll setup" }));
    await waitFor(() => expect(submit).toHaveBeenCalledWith({ legalName: "Ada Lovelace", email: null }));
  });

  it("focuses and reports a missing legal name before submission", async () => {
    const user = userEvent.setup();
    render(<EmployeePayrollPrerequisitesModal open values={{ legalName: "" }} missingFieldCodes={["legalName"]} invalidFieldCodes={[]} isSubmitting={false} onOpenChange={vi.fn()} onSubmit={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Start payroll setup" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Enter your legal name.");
    expect(screen.getByLabelText("Legal name")).toHaveFocus();
  });
});
