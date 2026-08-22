import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import AddNewUserModal from "./AddNewUserModal";

vi.mock("@/utils/auth", () => ({
  useAuth: () => ({ user: { agency: { supportedClientTypes: ["ddd"] } } }),
}));

vi.mock("@/hooks/useStaffLabels", () => ({
  useStaffLabels: () => ({ labels: { title: "DSP" } }),
}));

describe("AddNewUserModal payroll prerequisites", () => {
  it("requires accessible employment dates and sends only current compensation terms", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    render(
      <AddNewUserModal
        open
        mode="create"
        onClose={onClose}
        onSave={onSave}
        initialData={{
          name: "Pat Payroll",
          email: "pat@example.com",
          password: "StrongPass1!",
          accessList: ["Payroll Approval"],
          agencyModes: ["ddd"],
          role: "Administrator",
          employmentType: "full_time",
          billingType: "hourly",
          billingRate: 25,
        }}
      />,
    );

    const start = screen.getByLabelText("Employment start date");
    const end = screen.getByLabelText("Employment end date (optional)");
    const compensationEffective = screen.getByLabelText("Compensation effective date");
    const save = screen.getByRole("button", { name: "Add staff member" });
    expect(save).toBeDisabled();

    fireEvent.change(start, { target: { value: "2026-08-20" } });
    fireEvent.change(end, { target: { value: "2026-08-19" } });
    fireEvent.change(compensationEffective, { target: { value: "2026-08-20" } });
    expect(save).toBeDisabled();
    const rangeError = screen.getByRole("alert");
    expect(rangeError).toHaveTextContent("Employment end date cannot be before the start date.");
    expect(end).toHaveAttribute("aria-invalid", "true");
    expect(end).toHaveAccessibleDescription("Employment end date cannot be before the start date.");

    fireEvent.change(end, { target: { value: "2026-08-21" } });
    expect(save).toBeEnabled();
    await user.click(save);

    await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
    const payload = onSave.mock.calls[0][0];
    expect(payload).toMatchObject({
      employmentStartDate: "2026-08-20",
      employmentEndDate: "2026-08-21",
      compensationEffectiveDate: "2026-08-20",
      employmentType: "full_time",
      billingType: "hourly",
      billingRate: 25,
      accessList: ["Payroll Approval", "Payroll View"],
    });
    expect(payload).not.toHaveProperty("compensationHistory");
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("sends null when an existing optional employment end date is cleared", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <AddNewUserModal
        open
        mode="edit"
        onClose={vi.fn()}
        onSave={onSave}
        initialData={{
          name: "Pat Payroll",
          email: "pat@example.com",
          password: "",
          accessList: ["Payroll View"],
          agencyModes: ["ddd"],
          role: "Administrator",
          employmentType: "full_time",
          employmentStartDate: "2026-08-20",
          employmentEndDate: "2026-12-31",
          billingType: "hourly",
          billingRate: 25,
          compensationEffectiveDate: "2026-08-20",
        }}
      />,
    );

    const end = screen.getByLabelText("Employment end date (optional)");
    expect(end).toHaveValue("2026-12-31");
    await user.clear(end);
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
    expect(onSave.mock.calls[0][0]).toMatchObject({ employmentEndDate: null });
  });

  it("does not emit existing edit-mode pay terms without an effective date", () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <AddNewUserModal
        open
        mode="edit"
        onClose={vi.fn()}
        onSave={onSave}
        initialData={{
          name: "Legacy Payroll",
          email: "legacy@example.com",
          password: "",
          accessList: [],
          agencyModes: ["ddd"],
          billingType: "hourly",
          billingRate: 25,
        }}
      />,
    );

    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
    expect(screen.getByLabelText("Compensation effective date")).toHaveAccessibleDescription(
      "Enter the effective date for these compensation terms.",
    );
    expect(onSave).not.toHaveBeenCalled();
  });
});
