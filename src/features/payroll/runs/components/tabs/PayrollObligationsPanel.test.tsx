import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PayrollObligationsPanel } from "./PayrollObligationsPanel";

const api = vi.hoisted(() => ({ list: vi.fn(), refetch: vi.fn() }));
vi.mock("../../api/payrollRunEndpoints", () => ({
  useListPayrollObligationsQuery: (...args: unknown[]) => api.list(...args),
}));

const scope = { audience: "agency" as const, actorUid: "actor-1", agencyId: "agency-1" };
const context = { agencyId: "agency-1", environment: "sandbox" as const, companyId: "company-1" };
const obligation = (index: number, overrides: Record<string, unknown> = {}) => ({
  obligationId: `obligation-${index}`,
  kind: "deferral" as const,
  state: "open" as const,
  version: 2,
  employeeId: `employee-${index}`,
  originatingRunId: "run-1",
  originatingRevisionId: "revision-1",
  attachedRunId: null,
  reasonCategory: "source_conflict",
  amountCents: null,
  compatibility: { paydayNotBefore: "2026-08-25", paydayNotAfter: "2026-09-30" },
  requestedPayday: null,
  createdAt: "2026-08-24T12:00:00.000Z",
  updatedAt: "2026-08-24T12:00:00.000Z",
  ...overrides,
});

describe("PayrollObligationsPanel", () => {
  let second = obligation(26);
  const selectedCount = (count: number) => screen.getByText((_, element) => element?.tagName === "P" && element.textContent === `${count} selected`);

  beforeEach(() => {
    second = obligation(26);
    api.list.mockReset(); api.refetch.mockReset();
    api.list.mockImplementation((args: { cursor?: string }) => ({
      data: args.cursor
        ? { items: [second], nextCursor: null, hasMore: false }
        : { items: Array.from({ length: 25 }, (_, index) => obligation(index + 1)), nextCursor: "page-2", hasMore: true },
      isLoading: false, isFetching: false, isError: false, refetch: api.refetch,
    }));
  });

  it("retains compatible version-bound selections across pages without mounting more than one 25-row page", async () => {
    const view = render(<PayrollObligationsPanel scope={scope} context={context} createOffCycleCapability restoreCapability onCreateOffCycle={vi.fn()} onRestore={vi.fn()} />);
    expect(screen.getAllByRole("checkbox")).toHaveLength(25);
    expect(screen.getAllByText("Version 2")).toHaveLength(25);
    expect(screen.getAllByText(/Aug 25, 2026/).length).toBeGreaterThan(0);
    expect(screen.getAllByText((_, element) => element?.tagName === "P" && element.textContent?.includes("Source conflict") === true)).toHaveLength(25);

    fireEvent.click(screen.getByRole("checkbox", { name: /select obligation for employee-1$/i }));
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(screen.getAllByRole("checkbox")).toHaveLength(1);
    expect(selectedCount(1)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox", { name: /select obligation for employee-26/i }));
    expect(selectedCount(2)).toBeInTheDocument();

    second = obligation(26, { state: "attached", attachedRunId: "off-cycle-1", version: 3 });
    view.rerender(<PayrollObligationsPanel scope={scope} context={context} createOffCycleCapability restoreCapability onCreateOffCycle={vi.fn()} onRestore={vi.fn()} />);
    await waitFor(() => expect(selectedCount(1)).toBeInTheDocument());
    expect(screen.getByRole("checkbox", { name: /select obligation for employee-26/i })).toBeDisabled();
  });

  it("restores only open unattached compatible deferrals and refreshes after a stale-version rejection", async () => {
    const stale = Object.assign(new Error("stale"), { code: "PROJECTION_STALE" });
    const restore = vi.fn().mockRejectedValue(stale);
    render(<PayrollObligationsPanel scope={scope} context={context} createOffCycleCapability restoreCapability onCreateOffCycle={vi.fn()} onRestore={restore} />);
    fireEvent.click(screen.getAllByRole("button", { name: /restore employee/i })[0]);
    expect(screen.getByRole("dialog", { name: "Restore employee to payroll?" })).toBeInTheDocument();
    expect(restore).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Keep obligation" }));
    expect(restore).not.toHaveBeenCalled();
    fireEvent.click(screen.getAllByRole("button", { name: /restore employee/i })[0]);
    fireEvent.click(screen.getByRole("button", { name: "Restore employee" }));
    await waitFor(() => expect(restore).toHaveBeenCalledWith(expect.objectContaining({ obligationId: "obligation-1", version: 2 })));
    expect(await screen.findByRole("alert")).toHaveTextContent(/changed.*refreshed/i);
    expect(api.refetch).toHaveBeenCalledOnce();
  });

  it("opens Task 15's version-bound dialog only for a capable compatible selection and cancels without mutation", async () => {
    const create = vi.fn().mockResolvedValue({ operationId: "op-1", state: "accepted", resourceType: "payroll_run", pollAfterMs: 250 });
    const view = render(<PayrollObligationsPanel scope={scope} context={context} createOffCycleCapability={false} restoreCapability onCreateOffCycle={create} onRestore={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Create off-cycle payroll" })).not.toBeInTheDocument();

    view.rerender(<PayrollObligationsPanel scope={scope} context={context} createOffCycleCapability restoreCapability onCreateOffCycle={create} onRestore={vi.fn()} />);
    fireEvent.click(screen.getByRole("checkbox", { name: /select obligation for employee-1$/i }));
    fireEvent.click(screen.getByRole("button", { name: "Create off-cycle payroll" }));
    expect(screen.getByRole("dialog", { name: "Create off-cycle payroll" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Keep selecting" }));
    expect(create).not.toHaveBeenCalled();
  });

  it("drops paged selection and the old cursor before a trusted agency scope change", () => {
    const view = render(<PayrollObligationsPanel scope={scope} context={context} createOffCycleCapability restoreCapability onCreateOffCycle={vi.fn()} onRestore={vi.fn()} />);
    fireEvent.click(screen.getByRole("checkbox", { name: /select obligation for employee-1$/i }));
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    api.list.mockClear();
    const nextScope = { ...scope, agencyId: "agency-2" };
    view.rerender(<PayrollObligationsPanel scope={nextScope} context={{ ...context, agencyId: "agency-2" }} createOffCycleCapability restoreCapability onCreateOffCycle={vi.fn()} onRestore={vi.fn()} />);
    expect(api.list).toHaveBeenCalledOnce();
    expect(api.list).toHaveBeenCalledWith({ ...nextScope, state: "open" });
    expect(selectedCount(0)).toBeInTheDocument();
  });
});
