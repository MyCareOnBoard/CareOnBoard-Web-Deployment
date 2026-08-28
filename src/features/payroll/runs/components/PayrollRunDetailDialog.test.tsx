import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { PayrollRun } from "../model/types";
import { PayrollRunDetailDialog } from "./PayrollRunDetailDialog";

const api = vi.hoisted(() => ({ events: vi.fn() }));
vi.mock("../api/payrollRunEndpoints", () => ({
  useListPayrollRunEventsQuery: (...args: unknown[]) => api.events(...args),
}));

const scope = { audience: "agency" as const, actorUid: "actor-1", agencyId: "agency-1", mode: "ddd" as const };
const run: PayrollRun = {
  runId: "run-1", mode: "ddd", runType: "regular", periodStart: "2026-08-01", periodEnd: "2026-08-14", payday: "2026-08-21",
  approvalDeadline: null, reopenDeadline: null, timezone: "America/New_York", workflowState: "closed", providerStatus: "paid",
  projectionRevision: 4, revisionNumber: 2, activeRevisionId: "revision-1", stale: false, employeeCount: 1, includedCount: 1,
  deferredCount: 0, zeroDueCount: 0, blockerCount: 0, warningCount: 0, blockerCodes: [], warningCodes: [],
  totals: { grossEarningsCents: 80_000, reimbursementCents: 0, adjustmentCents: 0, totalDueCents: 80_000 },
  preview: { status: "succeeded", revisionId: "revision-1", hash: "a".repeat(64), observedAt: "2026-08-20T12:00:00.000Z", totals: null },
  asOf: "2026-08-24T12:00:00.000Z",
};

describe("PayrollRunDetailDialog", () => {
  it("mounts overview first, supports tab keyboard navigation, and provides an explicit close action", () => {
    const currentData = { items: [], nextCursor: null, hasMore: false };
    api.events.mockReturnValue({ data: currentData, currentData, isLoading: false, isFetching: false, isError: false, refetch: vi.fn() });
    const onOpenChange = vi.fn();
    render(<PayrollRunDetailDialog open onOpenChange={onOpenChange} scope={scope} run={run} expandedAudit={false} />);
    expect(screen.getByText("Immutable payroll detail")).toBeInTheDocument();
    expect(screen.getAllByText("$800.00")).toHaveLength(2);
    expect(api.events).not.toHaveBeenCalled();

    const overviewTab = screen.getByRole("tab", { name: "Overview" });
    fireEvent.keyDown(overviewTab, { key: "ArrowRight" });
    expect(screen.getByRole("tab", { name: "Audit" })).toHaveFocus();
    expect(api.events).toHaveBeenCalledWith({ ...scope, runId: "run-1", activeRevisionId: "revision-1" });
    expect(screen.queryByRole("region", { name: "Expanded audit" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close payroll detail" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
