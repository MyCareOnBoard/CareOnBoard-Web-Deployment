import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CreateOffCyclePayrollDialog, validateOffCycleSelection } from "./CreateOffCyclePayrollDialog";

const context = { agencyId: "agency-1", environment: "sandbox", companyId: "company-1" } as const;
const option = (overrides: Record<string, unknown> = {}) => ({
  obligationId: "obligation-1", version: 2, state: "open" as const, kind: "deferral" as const,
  employeeLabel: "Alex Morgan", reasonCategory: "source_conflict", amountCents: null,
  compatibility: { paydayNotBefore: "2026-08-25", paydayNotAfter: "2026-09-30" },
  context, ...overrides,
});

describe("CreateOffCyclePayrollDialog", () => {
  it("fails closed on missing capability and incompatible or invalid selections", () => {
    const props = { open: true, capability: false, context, obligations: [option()], activeConflict: false, onOpenChange: vi.fn(), onSubmit: vi.fn() };
    const view = render(<CreateOffCyclePayrollDialog {...props} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(validateOffCycleSelection({ context, obligations: [option({ context: { ...context, agencyId: "agency-2" } })], selected: new Map([["obligation-1", 2]]), requestedPayday: "2026-09-04", activeConflict: false })).toMatch(/compatible/i);
    expect(validateOffCycleSelection({ context, obligations: [option(), option()], selected: new Map([["obligation-1", 2]]), requestedPayday: "2026-09-04", activeConflict: false })).toMatch(/duplicate/i);
    expect(validateOffCycleSelection({ context, obligations: [option()], selected: new Map(), requestedPayday: "2026-09-04", activeConflict: false })).toMatch(/at least one/i);
    view.rerender(<CreateOffCyclePayrollDialog {...props} capability activeConflict />);
    expect(screen.getByRole("button", { name: "Create off-cycle payroll" })).toBeDisabled();
  });

  it("preserves version-bound selection after a typed error, uses one key per rapid intent, and closes only on acceptance", async () => {
    const submit = vi.fn()
      .mockRejectedValueOnce(Object.assign(new Error("The obligation changed. Refresh and try again."), { code: "PROJECTION_STALE" }))
      .mockResolvedValueOnce({ operationId: "op-2", state: "accepted", resourceType: "payroll_run", pollAfterMs: 250 });
    const onOpenChange = vi.fn();
    const createIntentKey = vi.fn().mockReturnValueOnce("00000000-0000-4000-8000-000000000001").mockReturnValueOnce("00000000-0000-4000-8000-000000000002");
    render(<CreateOffCyclePayrollDialog open capability context={context} obligations={[option()]} activeConflict={false} onOpenChange={onOpenChange} onSubmit={submit} createIntentKey={createIntentKey} />);
    fireEvent.click(screen.getByRole("checkbox", { name: /alex morgan/i }));
    fireEvent.change(screen.getByLabelText("Requested payday"), { target: { value: "2026-09-04" } });
    const button = screen.getByRole("button", { name: "Create off-cycle payroll" });
    fireEvent.click(button); fireEvent.click(button);
    await waitFor(() => expect(submit).toHaveBeenCalledOnce());
    expect(createIntentKey).toHaveBeenCalledOnce();
    expect(submit.mock.calls[0][0]).toEqual({ idempotencyKey: "00000000-0000-4000-8000-000000000001", obligations: [{ obligationId: "obligation-1", expectedVersion: 2 }], requestedPayday: "2026-09-04" });
    expect(await screen.findByRole("alert")).toHaveTextContent(/obligation changed/i);
    expect(screen.getByRole("checkbox", { name: /alex morgan/i })).toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "Create off-cycle payroll" }));
    await waitFor(() => expect(submit).toHaveBeenCalledTimes(2));
    expect(createIntentKey).toHaveBeenCalledTimes(2);
    expect(submit.mock.calls[1][0].idempotencyKey).toBe("00000000-0000-4000-8000-000000000002");
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });
});
