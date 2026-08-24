import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  CurrentPayrollEmployeePage,
  CurrentPayrollRunResponse,
  PayrollEmployeeSummary,
  PayrollRun,
} from "../model/types";
import { AgencyPayrollRunsWorkspace } from "./AgencyPayrollRunsWorkspace";

const api = vi.hoisted(() => ({
  currentHook: vi.fn(),
  employeesHook: vi.fn(),
  pageTrigger: vi.fn(),
  detailTrigger: vi.fn(),
  sourceTrigger: vi.fn(),
  currentState: {} as Record<string, unknown>,
  employeesState: {} as Record<string, unknown>,
}));

vi.mock("../api/payrollRunEndpoints", () => ({
  useGetCurrentPayrollRunQuery: (...args: unknown[]) => api.currentHook(...args),
  useGetCurrentPayrollEmployeesQuery: (...args: unknown[]) => api.employeesHook(...args),
  useLazyListPayrollRunEmployeesQuery: () => [api.pageTrigger, { isFetching: false }],
  useLazyGetPayrollRunEmployeeQuery: () => [api.detailTrigger, { isFetching: false }],
  useLazyListPayrollRunEmployeeSourcesQuery: () => [api.sourceTrigger, { isFetching: false }],
}));

const scope = { audience: "agency" as const, actorUid: "actor-1", agencyId: "agency-1" };

const run = (workflowState: PayrollRun["workflowState"] = "review"): PayrollRun => ({
  runId: "run-1",
  runType: "regular",
  periodStart: "2026-08-10",
  periodEnd: "2026-08-23",
  payday: "2026-08-28",
  approvalDeadline: "2026-08-25T16:00:00.000Z",
  reopenDeadline: null,
  timezone: "America/New_York",
  workflowState,
  providerStatus: "draft",
  projectionRevision: 7,
  revisionNumber: 1,
  activeRevisionId: "revision-1",
  stale: false,
  employeeCount: workflowState === "nothing_to_pay" ? 0 : 1,
  includedCount: workflowState === "nothing_to_pay" ? 0 : 1,
  deferredCount: 0,
  zeroDueCount: 0,
  blockerCount: 1,
  warningCount: 1,
  blockerCodes: ["COMPENSATION_MISSING"],
  warningCodes: ["OVERTIME_REVIEW"],
  totals: {
    grossEarningsCents: workflowState === "nothing_to_pay" ? 0 : 125_00,
    reimbursementCents: 5_00,
    adjustmentCents: 0,
    totalDueCents: workflowState === "nothing_to_pay" ? 0 : 130_00,
  },
  preview: { status: "none", revisionId: null, hash: null, observedAt: null, totals: null },
  asOf: "2026-08-24T12:00:00.000Z",
});

const current = (workflowState: PayrollRun["workflowState"] = "review"): CurrentPayrollRunResponse => ({
  kind: "run",
  runId: "run-1",
  activeRevisionId: "revision-1",
  revisionNumber: 1,
  run: run(workflowState),
  workspaceMode: "run",
  capabilities: {
    replacementWorkspace: true,
    commands: {
      refresh_sources: { enabled: true, reasonCode: null },
      add_adjustment: { enabled: true, reasonCode: null },
      remove_adjustment: { enabled: true, reasonCode: null },
      defer_employee: { enabled: true, reasonCode: null },
      restore_employee: { enabled: false, reasonCode: "capability_disabled" },
      request_preview: { enabled: false, reasonCode: "preview_not_ready" },
      approve_payroll: { enabled: false, reasonCode: "approval_not_ready" },
      reopen_payroll: { enabled: false, reasonCode: "reopen_not_available" },
      refresh_reconciliation: { enabled: true, reasonCode: null },
    },
  },
  prerequisites: {
    revisionReady: true,
    dispositionsComplete: true,
    noBlockers: false,
    providerSynchronized: true,
    previewReady: false,
  },
  activeOperation: {
    operationId: "a".repeat(64),
    command: "refresh_sources",
    state: "running",
    pollAfterMs: 1000,
  },
});

const employee: PayrollEmployeeSummary = {
  employeeId: "employee-1",
  activeRevisionId: "revision-1",
  revisionId: "revision-1",
  employmentType: "field",
  displayName: "Alex Morgan",
  disposition: "included",
  grossEarningsCents: 125_00,
  reimbursementCents: 5_00,
  adjustmentCents: 0,
  totalDueCents: 130_00,
  regularHours: 40,
  overtimeHours: 2,
  sourceCount: 2,
  sourceCounts: { shift: 2 },
  hasBlockers: false,
  blockerCodes: [],
  warningCodes: ["OVERTIME_REVIEW"],
  obligationId: null,
  providerItemState: "pending",
};

const employees = (): CurrentPayrollEmployeePage => ({
  kind: "run",
  runId: "run-1",
  activeRevisionId: "revision-1",
  revisionNumber: 1,
  workspaceMode: "run",
  capabilities: { replacementWorkspace: true },
  items: [employee],
  nextCursor: null,
  hasMore: false,
});

describe("AgencyPayrollRunsWorkspace", () => {
  beforeEach(() => {
    api.currentHook.mockReset();
    api.employeesHook.mockReset();
    api.pageTrigger.mockReset();
    api.detailTrigger.mockReset();
    api.sourceTrigger.mockReset();
    const currentData = current();
    const employeeData = employees();
    api.currentState = { data: currentData, currentData, isLoading: false, isFetching: false, refetch: vi.fn() };
    api.employeesState = { data: employeeData, currentData: employeeData, isLoading: false, isFetching: false, refetch: vi.fn() };
    api.currentHook.mockImplementation(() => api.currentState);
    api.employeesHook.mockImplementation(() => api.employeesState);
  });

  it("starts only the atomic current pair and defers every detail, history, and legacy request", () => {
    render(<AgencyPayrollRunsWorkspace scope={scope} />);

    expect(api.currentHook).toHaveBeenCalledWith(scope, { skip: false });
    expect(api.employeesHook).toHaveBeenCalledWith(scope, { skip: false });
    expect(api.pageTrigger).not.toHaveBeenCalled();
    expect(api.detailTrigger).not.toHaveBeenCalled();
    expect(api.sourceTrigger).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "Current payroll" })).toBeInTheDocument();
    expect(screen.getAllByText("$130.00")).toHaveLength(2);
    expect(screen.getByText("Refreshing payroll sources…")).toBeInTheDocument();
    expect(screen.getByText("1 blocker · 1 warning")).toBeInTheDocument();
  });

  it("distinguishes a current run with nothing to pay from no active period", () => {
    const nothingToPay = current("nothing_to_pay");
    const noEmployees = { ...employees(), items: [] };
    api.currentState = { ...api.currentState, data: nothingToPay, currentData: nothingToPay };
    api.employeesState = { ...api.employeesState, data: noEmployees, currentData: noEmployees };
    const view = render(<AgencyPayrollRunsWorkspace scope={scope} />);
    expect(screen.getByText("Nothing to pay for this period.")).toBeInTheDocument();

    const empty = {
      kind: "empty" as const,
      runId: null,
      activeRevisionId: null,
      revisionNumber: null,
      run: null,
      emptyReason: "no_active_period" as const,
      workspaceMode: "run" as const,
      capabilities: { replacementWorkspace: true },
    };
    api.currentState = {
      ...api.currentState,
      data: empty,
      currentData: empty,
    };
    api.employeesState = { ...api.employeesState, data: empty, currentData: empty };
    view.rerender(<AgencyPayrollRunsWorkspace scope={scope} />);
    expect(screen.getByText("No active payroll period.")).toBeInTheDocument();
  });

  it("reserves geometry while loading and announces localized progress politely", () => {
    api.currentState = { data: undefined, currentData: undefined, isLoading: true, isFetching: true, refetch: vi.fn() };
    api.employeesState = { data: undefined, currentData: undefined, isLoading: true, isFetching: true, refetch: vi.fn() };
    render(<AgencyPayrollRunsWorkspace scope={scope} />);

    expect(screen.getByTestId("payroll-workspace-skeleton")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByRole("status")).toHaveTextContent("Loading the current payroll…");
    expect(screen.getByTestId("payroll-workspace")).toHaveAttribute("aria-busy", "true");
  });

  it("retains financial data as stale and never announces success for an in-flight refetch", async () => {
    const view = render(<AgencyPayrollRunsWorkspace scope={scope} />);
    const mismatchedCurrent = { ...current(), activeRevisionId: "revision-2", revisionNumber: 2 };
    api.currentState = {
      ...api.currentState,
      data: mismatchedCurrent,
      currentData: mismatchedCurrent,
      isFetching: true,
    };
    view.rerender(<AgencyPayrollRunsWorkspace scope={scope} />);

    expect(screen.getByText("Payroll data is updating")).toBeInTheDocument();
    expect(screen.getAllByText("$130.00")).toHaveLength(2);
    expect(screen.queryByText(/success/i)).not.toBeInTheDocument();
    await waitFor(() => expect(api.currentState.refetch).toHaveBeenCalledOnce());
  });

  it("keeps revision-bound actions paused when a refresh fails", () => {
    const view = render(<AgencyPayrollRunsWorkspace scope={scope} />);
    api.currentState = {
      ...api.currentState,
      isFetching: false,
      error: { status: 503 },
    };
    view.rerender(<AgencyPayrollRunsWorkspace scope={scope} />);

    expect(screen.getByText(/^Payroll could not be refreshed$/)).toBeInTheDocument();
    expect(screen.getByText(/Revision-bound actions are paused/)).toBeInTheDocument();
    expect(screen.getAllByText("$130.00")).toHaveLength(2);
    expect(screen.queryByText("Current payroll data is ready.")).not.toBeInTheDocument();
  });
});
