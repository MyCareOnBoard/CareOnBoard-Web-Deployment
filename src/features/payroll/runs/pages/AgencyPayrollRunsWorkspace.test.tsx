import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  CurrentPayrollEmployeePage,
  CurrentPayrollRunResponse,
  PayrollEmployeeSummary,
  PayrollRun,
  PayrollRunProjection,
} from "../model/types";
import { AgencyPayrollRunsWorkspace } from "./AgencyPayrollRunsWorkspace";

const api = vi.hoisted(() => ({
  currentHook: vi.fn(),
  employeesHook: vi.fn(),
  pageTrigger: vi.fn(),
  detailTrigger: vi.fn(),
  sourceTrigger: vi.fn(),
  historyHook: vi.fn(),
  eventsHook: vi.fn(),
  obligationsHook: vi.fn(),
  legacyHook: vi.fn(),
  legacyDetailTrigger: vi.fn(),
  approvalDetailTrigger: vi.fn(),
  commandHook: vi.fn(),
  runCommand: vi.fn(),
  createOffCycleRun: vi.fn(),
  currentState: {} as Record<string, unknown>,
  employeesState: {} as Record<string, unknown>,
}));

vi.mock("../api/payrollRunEndpoints", () => ({
  useGetCurrentPayrollRunQuery: (...args: unknown[]) => api.currentHook(...args),
  useGetCurrentPayrollEmployeesQuery: (...args: unknown[]) => api.employeesHook(...args),
  useLazyListPayrollRunEmployeesQuery: () => [api.pageTrigger, { isFetching: false }],
  useLazyGetPayrollRunEmployeeQuery: () => [api.detailTrigger, { isFetching: false }],
  useLazyListPayrollRunEmployeeSourcesQuery: () => [api.sourceTrigger, { isFetching: false }],
  useListPayrollRunsQuery: (...args: unknown[]) => api.historyHook(...args),
  useListPayrollRunEventsQuery: (...args: unknown[]) => api.eventsHook(...args),
  useListPayrollObligationsQuery: (...args: unknown[]) => api.obligationsHook(...args),
  useLazyGetPayrollRunQuery: () => [api.approvalDetailTrigger, { isFetching: false }],
}));

vi.mock("../api/legacyPayrollHistoryEndpoints", () => ({
  useListLegacyPayrollHistoryQuery: (...args: unknown[]) => api.legacyHook(...args),
  useLazyGetLegacyPayrollInvoiceQuery: () => [api.legacyDetailTrigger, { isFetching: false }],
}));

vi.mock("../hooks/usePayrollRunCommand", () => ({
  usePayrollRunCommand: (...args: unknown[]) => {
    api.commandHook(...args);
    return ({
    runCommand: api.runCommand,
    createOffCycleRun: api.createOffCycleRun,
    activeIntent: null,
    error: null,
    });
  },
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

const current = (workflowState: PayrollRun["workflowState"] = "review"): PayrollRunProjection => ({
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
    api.historyHook.mockReset();
    api.eventsHook.mockReset();
    api.obligationsHook.mockReset();
    api.legacyHook.mockReset();
    api.legacyDetailTrigger.mockReset();
    api.approvalDetailTrigger.mockReset();
    api.commandHook.mockReset();
    api.runCommand.mockReset();
    api.createOffCycleRun.mockReset();
    const currentData = current();
    const employeeData = employees();
    api.currentState = { data: currentData, currentData, isLoading: false, isFetching: false, refetch: vi.fn() };
    api.employeesState = { data: employeeData, currentData: employeeData, isLoading: false, isFetching: false, refetch: vi.fn() };
    api.currentHook.mockImplementation(() => api.currentState);
    api.employeesHook.mockImplementation(() => api.employeesState);
    const emptyPage = { data: { items: [], nextCursor: null, hasMore: false }, isLoading: false, isFetching: false, isError: false, refetch: vi.fn() };
    api.historyHook.mockReturnValue(emptyPage);
    api.eventsHook.mockReturnValue(emptyPage);
    api.obligationsHook.mockReturnValue(emptyPage);
    api.legacyHook.mockReturnValue(emptyPage);
    api.runCommand.mockResolvedValue({ operationId: "b".repeat(64), command: "refresh_sources", state: "succeeded", pollAfterMs: null });
    api.createOffCycleRun.mockResolvedValue({ operationId: "c".repeat(64), command: "create_off_cycle", state: "succeeded", pollAfterMs: null });
  });

  it("starts only the atomic current pair and defers every detail, history, and legacy request", () => {
    render(<AgencyPayrollRunsWorkspace scope={scope} />);

    expect(api.currentHook).toHaveBeenCalledWith(scope, { skip: false });
    expect(api.employeesHook).toHaveBeenCalledWith(scope, { skip: false });
    expect(api.pageTrigger).not.toHaveBeenCalled();
    expect(api.detailTrigger).not.toHaveBeenCalled();
    expect(api.sourceTrigger).not.toHaveBeenCalled();
    expect(api.historyHook).not.toHaveBeenCalled();
    expect(api.eventsHook).not.toHaveBeenCalled();
    expect(api.obligationsHook).not.toHaveBeenCalled();
    expect(api.legacyHook).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "Current payroll" })).toBeInTheDocument();
    expect(screen.getAllByText("$130.00")).toHaveLength(2);
    expect(screen.getByText("Refreshing payroll sources…")).toBeInTheDocument();
    expect(screen.getByText("1 blocker · 1 warning")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refresh sources" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Approve payroll" })).toBeDisabled();
  });

  it("mounts only the selected stable payroll tab and starts its read lazily", async () => {
    const view = render(<AgencyPayrollRunsWorkspace scope={scope} />);
    const labels = ["Current", "History", "Audit", "Obligations", "Legacy"];
    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual(labels);

    fireEvent.click(screen.getByRole("tab", { name: "History" }));
    await screen.findByRole("heading", { name: "Payroll history" });
    expect(api.historyHook).toHaveBeenCalledWith({ ...scope, runType: "regular" });
    expect(screen.queryByRole("heading", { name: "Current payroll" })).not.toBeInTheDocument();
    expect(api.eventsHook).not.toHaveBeenCalled();
    expect(api.obligationsHook).not.toHaveBeenCalled();
    expect(api.legacyHook).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("tab", { name: "Audit" }));
    await screen.findByRole("heading", { name: "Audit timeline" });
    expect(api.eventsHook).toHaveBeenCalledWith({ ...scope, runId: "run-1", activeRevisionId: "revision-1" });
    expect(screen.queryByRole("heading", { name: "Payroll history" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Obligations" }));
    await screen.findByRole("heading", { name: "Off-cycle obligations" });
    expect(api.obligationsHook).toHaveBeenCalledWith({ ...scope, state: "open" });
    expect(screen.queryByRole("heading", { name: "Audit timeline" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Create off-cycle payroll" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Legacy" }));
    await screen.findByRole("heading", { name: "Legacy payroll invoice history" }, { timeout: 5_000 });
    expect(api.legacyHook).toHaveBeenCalledOnce();
    expect(api.legacyHook.mock.calls[0]?.[0]).toEqual(expect.objectContaining(scope));
    expect(screen.queryByRole("heading", { name: "Off-cycle obligations" })).not.toBeInTheDocument();

    api.legacyHook.mockClear();
    view.rerender(<AgencyPayrollRunsWorkspace scope={{ ...scope, agencyId: "agency-2" }} />);
    expect(screen.getByRole("tab", { name: "Current" })).toHaveAttribute("aria-selected", "true");
    expect(api.legacyHook).not.toHaveBeenCalled();
  }, 10_000);

  it("hides employee-scoped actions and avoids a duplicate refresh after a terminal command", async () => {
    const projection = current();
    delete projection.activeOperation;
    projection.capabilities.commands.request_preview = { enabled: true, reasonCode: null };
    projection.prerequisites.noBlockers = true;
    api.currentState = { ...api.currentState, data: projection, currentData: projection };
    render(<AgencyPayrollRunsWorkspace scope={scope} />);

    expect(screen.queryByRole("button", { name: "Add adjustment" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Defer employee" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Refresh sources" }));
    await waitFor(() => expect(api.runCommand).toHaveBeenCalledWith(expect.objectContaining({
      ...scope,
      runId: "run-1",
      command: "refresh_sources",
      expectedProjectionRevision: 7,
      expectedActiveRevisionId: "revision-1",
      idempotencyKey: expect.any(String),
    })));
    expect(api.currentState.refetch).not.toHaveBeenCalled();
    expect(api.commandHook).toHaveBeenCalledWith(scope, expect.any(Function));

    (api.currentState.refetch as ReturnType<typeof vi.fn>).mockClear();
    api.runCommand.mockRejectedValueOnce(Object.assign(new Error("stale"), { code: "PROJECTION_STALE", refreshRequired: true }));
    fireEvent.click(screen.getByRole("button", { name: "Request preview" }));
    await waitFor(() => expect(api.currentState.refetch).toHaveBeenCalledOnce());
  });

  it("opens and cancels approval without mutation, then relies on terminal invalidation after success", async () => {
    const projection = current("ready_to_approve");
    delete projection.activeOperation;
    projection.prerequisites = { revisionReady: true, dispositionsComplete: true, noBlockers: true, providerSynchronized: true, previewReady: true };
    projection.capabilities.commands.approve_payroll = { enabled: true, reasonCode: null };
    projection.run.preview = {
      status: "succeeded", revisionId: "revision-1", hash: "a".repeat(64), observedAt: "2026-08-24T12:00:00.000Z",
      totals: { grossCents: 125_00, reimbursementsCents: 5_00, employeeTaxesCents: 10_00, employeeDeductionsCents: 0, employerTaxesCents: 10_00, employerContributionsCents: 0, netPayCents: 120_00, expectedCashRequirementCents: 140_00 },
    };
    const approvalDetail = { ...projection, approvalChallenge: "challenge-1", approvalChallengeExpiresAt: "2099-08-24T12:05:00.000Z" };
    api.currentState = { ...api.currentState, data: projection, currentData: projection };
    api.approvalDetailTrigger.mockReturnValue({ unwrap: () => Promise.resolve(approvalDetail), abort: vi.fn() });
    render(<AgencyPayrollRunsWorkspace scope={scope} />);

    api.commandHook.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "Approve payroll" }));
    expect(await screen.findByRole("heading", { name: "Approve payroll" })).toBeInTheDocument();
    expect(api.commandHook).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole("button", { name: "Keep reviewing" }));
    expect(api.runCommand).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Approve payroll" }));
    await screen.findByText("Expected cash requirement");
    fireEvent.click(screen.getByRole("checkbox", { name: /reviewed these totals/i }));
    fireEvent.click(screen.getByRole("button", { name: "Approve payroll" }));
    await waitFor(() => expect(api.runCommand).toHaveBeenCalledWith(expect.objectContaining({
      ...scope, runId: "run-1", command: "approve_payroll", expectedProjectionRevision: 7,
      expectedActiveRevisionId: "revision-1", expectedPreviewRevisionId: "revision-1",
      expectedPreviewHash: "a".repeat(64), approvalChallenge: "challenge-1", acknowledgement: true,
    })));
    expect(api.currentState.refetch).not.toHaveBeenCalled();

    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Approve payroll" })).not.toBeInTheDocument());
    (api.currentState.refetch as ReturnType<typeof vi.fn>).mockClear();
    api.runCommand.mockRejectedValueOnce(Object.assign(new Error("stale"), {
      code: "PROJECTION_STALE",
      refreshRequired: true,
    }));
    fireEvent.click(screen.getByRole("button", { name: "Approve payroll" }));
    await screen.findByText("Expected cash requirement");
    fireEvent.click(screen.getByRole("checkbox", { name: /reviewed these totals/i }));
    fireEvent.click(screen.getByRole("button", { name: "Approve payroll" }));
    await waitFor(() => expect(api.currentState.refetch).toHaveBeenCalledOnce());
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
    expect(api.currentState.refetch).not.toHaveBeenCalled();

    api.currentState = { ...api.currentState, isFetching: false };
    view.rerender(<AgencyPayrollRunsWorkspace scope={scope} />);
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
