import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PayrollRun } from "../../model/types";
import { PayrollHistoryPanel } from "./PayrollHistoryPanel";

const api = vi.hoisted(() => ({ list: vi.fn() }));
vi.mock("../../api/payrollRunEndpoints", () => ({
  useListPayrollRunsQuery: (...args: unknown[]) => api.list(...args),
}));

const scope = { audience: "agency" as const, actorUid: "actor-1", agencyId: "agency-1" };
const run = (index: number, runType: PayrollRun["runType"] = "regular"): PayrollRun => ({
  runId: `run-${index}`,
  runType,
  periodStart: "2026-08-01",
  periodEnd: "2026-08-14",
  payday: "2026-08-21",
  approvalDeadline: null,
  reopenDeadline: null,
  timezone: "America/New_York",
  workflowState: "closed",
  providerStatus: "paid",
  projectionRevision: 4,
  revisionNumber: 2,
  activeRevisionId: `revision-${index}`,
  stale: false,
  employeeCount: 1,
  includedCount: 1,
  deferredCount: 0,
  zeroDueCount: 0,
  blockerCount: 0,
  warningCount: 0,
  blockerCodes: [],
  warningCodes: [],
  totals: { grossEarningsCents: index * 100, reimbursementCents: 0, adjustmentCents: 0, totalDueCents: index * 100 },
  preview: { status: "succeeded", revisionId: `revision-${index}`, hash: "a".repeat(64), observedAt: "2026-08-20T12:00:00.000Z", totals: null },
  asOf: "2026-08-24T12:00:00.000Z",
});

describe("PayrollHistoryPanel", () => {
  beforeEach(() => {
    api.list.mockReset();
    api.list.mockImplementation((args: { cursor?: string; runType?: PayrollRun["runType"] }) => ({
      data: args.cursor
        ? { items: [run(26, args.runType)], nextCursor: null, hasMore: false }
        : { items: Array.from({ length: 25 }, (_, index) => run(index + 1, args.runType)), nextCursor: "page-2", hasMore: true },
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: vi.fn(),
    }));
  });

  it("mounts one bounded 25-row page and replaces it when the cursor advances", () => {
    render(<PayrollHistoryPanel scope={scope} />);
    expect(screen.getAllByRole("button", { name: /view payroll/i })).toHaveLength(25);
    expect(api.list).toHaveBeenLastCalledWith({ ...scope, runType: "regular" });

    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(api.list).toHaveBeenLastCalledWith({ ...scope, runType: "regular", cursor: "page-2" });
    expect(screen.getAllByRole("button", { name: /view payroll/i })).toHaveLength(1);
  });

  it("loads only the selected regular or off-cycle history family", () => {
    render(<PayrollHistoryPanel scope={scope} />);
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    api.list.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "Off-cycle payrolls" }));
    expect(api.list).toHaveBeenCalledOnce();
    expect(api.list).toHaveBeenCalledWith({ ...scope, runType: "off_cycle" });
    expect(screen.getAllByText("Off-cycle")).toHaveLength(25);
  });
});
