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
  upcomingHook: vi.fn(),
  forceBuildHook: vi.fn(),
  forceBuild: vi.fn(),
  statusHook: vi.fn(),
  historyHook: vi.fn(),
  eventsHook: vi.fn(),
  obligationsHook: vi.fn(),
  approvalDetailTrigger: vi.fn(),
  commandHook: vi.fn(),
  runCommand: vi.fn(),
  createOffCycleRun: vi.fn(),
  invalidateTags: vi.fn(),
  dispatch: vi.fn(),
  currentRefetch: vi.fn(),
  employeeRefetch: vi.fn(),
  forceBuildState: { isLoading: false } as Record<string, unknown>,
  statusState: { currentData: undefined, isError: false } as Record<string, unknown>,
  currentState: {} as Record<string, unknown>,
  employeesState: {} as Record<string, unknown>,
  upcomingState: {} as Record<string, unknown>,
}));

vi.mock("../api/payrollRunEndpoints", () => ({
  useGetCurrentPayrollRunQuery: (...args: unknown[]) => api.currentHook(...args),
  useGetCurrentPayrollEmployeesQuery: (...args: unknown[]) => api.employeesHook(...args),
  useLazyListPayrollRunEmployeesQuery: () => [api.pageTrigger, { isFetching: false }],
  useLazyGetPayrollRunEmployeeQuery: () => [api.detailTrigger, { isFetching: false }],
  useLazyListPayrollRunEmployeeSourcesQuery: () => [api.sourceTrigger, { isFetching: false }],
  useGetUpcomingPayrollQuery: (...args: unknown[]) => api.upcomingHook(...args),
  useForceBuildUpcomingPayrollMutation: () => api.forceBuildHook(),
  useGetForceBuildStatusQuery: (...args: unknown[]) => api.statusHook(...args),
  useListPayrollRunsQuery: (...args: unknown[]) => api.historyHook(...args),
  useListPayrollRunEventsQuery: (...args: unknown[]) => api.eventsHook(...args),
  useListPayrollObligationsQuery: (...args: unknown[]) => api.obligationsHook(...args),
  useLazyGetPayrollRunQuery: () => [api.approvalDetailTrigger, { isFetching: false }],
  payrollRunApi: { util: { invalidateTags: (...args: unknown[]) => api.invalidateTags(...args) } },
}));

vi.mock("@/store/redux/hooks", async (importOriginal) => ({
  ...await importOriginal<Record<string, unknown>>(),
  useAppDispatch: () => api.dispatch,
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

const scope = { audience: "agency" as const, actorUid: "actor-1", agencyId: "agency-1", mode: "ddd" as const };

const run = (workflowState: PayrollRun["workflowState"] = "review"): PayrollRun => ({
  runId: "run-1",
  mode: "ddd",
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
  capabilities: {
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
    api.upcomingHook.mockReset();
    api.forceBuildHook.mockReset();
    api.forceBuild.mockReset();
    api.statusHook.mockReset();
    api.historyHook.mockReset();
    api.eventsHook.mockReset();
    api.obligationsHook.mockReset();
    api.approvalDetailTrigger.mockReset();
    api.commandHook.mockReset();
    api.runCommand.mockReset();
    api.createOffCycleRun.mockReset();
    api.invalidateTags.mockReset();
    api.dispatch.mockReset();
    api.currentRefetch.mockReset();
    api.employeeRefetch.mockReset();
    api.forceBuildState = { isLoading: false };
    api.statusState = { currentData: undefined, isError: false };
    const currentData = current();
    const employeeData = employees();
    api.currentState = { data: currentData, currentData, isLoading: false, isFetching: false, refetch: api.currentRefetch };
    api.employeesState = { data: employeeData, currentData: employeeData, isLoading: false, isFetching: false, refetch: api.employeeRefetch };
    const upcomingData = {
      kind: "upcoming" as const,
      mode: "ddd" as const,
      projectionRevision: 8,
      forceBuild: { enabled: true as const, reasonCode: null },
      periodStart: "2026-08-24",
      periodEnd: "2026-09-06",
      payday: "2026-09-11",
      totals: {
        regularHours: 40,
        overtimeHours: 4,
        totalHours: 44,
        grossEarningsCents: 88_000,
        reimbursementCents: 5_000,
        totalDueCents: 93_000,
      },
      employeeCount: 1,
      blockerCount: 1,
      blockerCodes: ["SHIFT_AWAITING_APPROVAL"],
      sourceCounts: { shift: 2, ride: 0, expense: 1, staff_timesheet: 0 },
      items: [{
        employeeId: "upcoming-employee-1",
        employmentType: "field" as const,
        displayName: "Alex Morgan",
        regularHours: 40,
        overtimeHours: 4,
        grossEarningsCents: 88_000,
        reimbursementCents: 5_000,
        totalDueCents: 93_000,
        sourceCount: 3,
        sourceCounts: { shift: 2, ride: 0, expense: 1, staff_timesheet: 0 },
        hasBlockers: true,
        blockerCodes: ["SHIFT_AWAITING_APPROVAL"],
      }],
      nextCursor: null,
      hasMore: false,
      asOf: "2026-08-25T12:00:00.000Z",
    };
    api.upcomingState = {
      data: upcomingData,
      currentData: upcomingData,
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: vi.fn(),
    };
    api.currentHook.mockImplementation(() => api.currentState);
    api.employeesHook.mockImplementation(() => api.employeesState);
    api.upcomingHook.mockImplementation(() => api.upcomingState);
    api.forceBuild.mockReturnValue({
      unwrap: () => Promise.resolve({ buildId: "build-1", state: "queued", pollAfterMs: 2000 }),
    });
    api.forceBuildHook.mockImplementation(() => [api.forceBuild, api.forceBuildState]);
    api.statusHook.mockImplementation(() => api.statusState);
    api.invalidateTags.mockImplementation((tags) => ({ type: "payroll/invalidate", payload: tags }));
    api.dispatch.mockImplementation((action) => {
      const tags = (action as { payload?: unknown }).payload;
      if (!Array.isArray(tags)) return action;
      if (tags.some((tag) => tag?.type === "PayrollRun"
        && tag.id === '["agency","actor-1","agency-1",null,"ddd"]:["current","current"]')) {
        api.currentRefetch();
      }
      if (tags.some((tag) => tag?.type === "PayrollRunEmployee"
        && tag.id === '["agency","actor-1","agency-1",null,"ddd"]:["current","current","*"]')) {
        api.employeeRefetch();
      }
      return action;
    });
    const emptyData = { items: [], nextCursor: null, hasMore: false };
    const emptyPage = { data: emptyData, currentData: emptyData, isLoading: false, isFetching: false, isError: false, refetch: vi.fn() };
    api.historyHook.mockReturnValue(emptyPage);
    api.eventsHook.mockReturnValue(emptyPage);
    api.obligationsHook.mockReturnValue(emptyPage);
    api.runCommand.mockResolvedValue({ operationId: "b".repeat(64), command: "refresh_sources", state: "succeeded", pollAfterMs: null });
    api.createOffCycleRun.mockResolvedValue({ operationId: "c".repeat(64), command: "create_off_cycle", state: "succeeded", pollAfterMs: null });
  });

  it("starts only the atomic current pair and defers detail and secondary Check reads", () => {
    render(<AgencyPayrollRunsWorkspace scope={scope} />);

    expect(api.currentHook).toHaveBeenCalledWith(scope, { skip: false });
    expect(api.employeesHook).toHaveBeenCalledWith(scope, { skip: false });
    expect(api.pageTrigger).not.toHaveBeenCalled();
    expect(api.detailTrigger).not.toHaveBeenCalled();
    expect(api.sourceTrigger).not.toHaveBeenCalled();
    expect(api.upcomingHook).not.toHaveBeenCalled();
    expect(api.historyHook).not.toHaveBeenCalled();
    expect(api.eventsHook).not.toHaveBeenCalled();
    expect(api.obligationsHook).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "Current payroll" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Current payroll overview" })).toBeInTheDocument();
    expect(screen.getByText(/Review current and upcoming pay periods/i)).toBeInTheDocument();
    expect(screen.getAllByText("$130.00")).toHaveLength(2);
    expect(screen.getByText("Refreshing payroll sources…")).toBeInTheDocument();
    expect(screen.getByText("1 blocking · 1 to review")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refresh sources" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Approve payroll" })).toBeDisabled();
  });

  it("mounts only the selected stable payroll tab and starts its read lazily", async () => {
    const view = render(<AgencyPayrollRunsWorkspace scope={scope} />);
    const labels = ["Current", "Upcoming", "History", "Audit", "Obligations"];
    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual(labels);

    fireEvent.click(screen.getByRole("tab", { name: "Upcoming" }));
    await screen.findByRole("heading", { name: "Upcoming payroll" });
    expect(api.upcomingHook).toHaveBeenCalledWith(scope, { refetchOnMountOrArgChange: true });
    expect(screen.getByText("Alex Morgan")).toBeInTheDocument();
    expect(screen.getByText("$880.00")).toBeInTheDocument();
    expect(screen.getByText("$50.00")).toBeInTheDocument();
    expect(screen.getAllByText("$930.00")).toHaveLength(2);
    expect(screen.getByText("$880.00 gross · $50.00 reimbursements")).toBeInTheDocument();
    expect(screen.getByText("2 shifts · 1 expense")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Current payroll" })).not.toBeInTheDocument();
    expect(api.historyHook).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("tab", { name: "History" }));
    await screen.findByRole("heading", { name: "Payroll history" });
    expect(api.historyHook).toHaveBeenCalledWith({ ...scope, runType: "regular" });
    expect(screen.queryByRole("heading", { name: "Current payroll" })).not.toBeInTheDocument();
    expect(api.eventsHook).not.toHaveBeenCalled();
    expect(api.obligationsHook).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("tab", { name: "Audit" }));
    await screen.findByRole("heading", { name: "Audit timeline" });
    expect(api.eventsHook).toHaveBeenCalledWith({ ...scope, runId: "run-1", activeRevisionId: "revision-1" });
    expect(screen.queryByRole("heading", { name: "Payroll history" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Obligations" }));
    await screen.findByRole("heading", { name: "Off-cycle obligations" });
    expect(api.obligationsHook).toHaveBeenCalledWith({ ...scope, state: "open" });
    expect(screen.queryByRole("heading", { name: "Audit timeline" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Create off-cycle payroll" })).not.toBeInTheDocument();

    api.obligationsHook.mockClear();
    view.rerender(<AgencyPayrollRunsWorkspace scope={{ ...scope, agencyId: "agency-2" }} />);
    expect(screen.getByRole("tab", { name: "Current" })).toHaveAttribute("aria-selected", "true");
    expect(api.obligationsHook).not.toHaveBeenCalled();
    expect(api.upcomingHook).toHaveBeenCalledTimes(1);
  }, 10_000);

  it("switches to Current, refreshes its caches, and focuses its heading only after build success", async () => {
    const view = render(<AgencyPayrollRunsWorkspace scope={scope} />);

    fireEvent.click(screen.getByRole("tab", { name: "Upcoming" }));
    await screen.findByRole("heading", { name: "Upcoming payroll" });
    fireEvent.click(screen.getByRole("button", { name: "Build test payrolls now" }));
    fireEvent.click(await screen.findByRole("button", { name: "Build test payrolls" }));
    await waitFor(() => expect(api.statusHook).toHaveBeenLastCalledWith(
      { ...scope, buildId: "build-1" },
      { pollingInterval: 2000, refetchOnMountOrArgChange: true },
    ));
    expect(screen.getByRole("tab", { name: "Upcoming" })).toHaveAttribute("aria-selected", "true");

    api.statusState = {
      currentData: { buildId: "build-1", state: "succeeded", pollAfterMs: null },
      isError: false,
    };
    view.rerender(<AgencyPayrollRunsWorkspace scope={scope} />);

    await waitFor(() => expect(screen.getByRole("tab", { name: "Current" }))
      .toHaveAttribute("aria-selected", "true"));
    expect(api.currentRefetch).toHaveBeenCalledOnce();
    expect(api.employeeRefetch).toHaveBeenCalledOnce();
    expect(api.invalidateTags).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ type: "PayrollRun" }),
      expect.objectContaining({ type: "PayrollRunEmployee" }),
      expect.objectContaining({ type: "PayrollHistory" }),
    ]));
    expect(screen.getByRole("heading", { name: "Current payroll" })).toHaveFocus();
  });

  it("keeps Upcoming selected when the force build fails", async () => {
    const view = render(<AgencyPayrollRunsWorkspace scope={scope} />);

    fireEvent.click(screen.getByRole("tab", { name: "Upcoming" }));
    await screen.findByRole("heading", { name: "Upcoming payroll" });
    fireEvent.click(screen.getByRole("button", { name: "Build test payrolls now" }));
    fireEvent.click(await screen.findByRole("button", { name: "Build test payrolls" }));

    api.statusState = {
      currentData: { buildId: "build-1", state: "failed", pollAfterMs: null },
      isError: false,
    };
    view.rerender(<AgencyPayrollRunsWorkspace scope={scope} />);

    expect(await screen.findByText(/Nothing was moved to Current/)).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Upcoming" })).toHaveAttribute("aria-selected", "true");
    expect(api.invalidateTags).not.toHaveBeenCalled();
    expect(api.currentRefetch).not.toHaveBeenCalled();
    expect(api.employeeRefetch).not.toHaveBeenCalled();
  });

  it("preserves the selected tab but resets its page and hides prior-mode data when mode changes", async () => {
    const dddFirst = {
      ...api.upcomingState.currentData as Record<string, unknown>,
      items: [{
        ...(api.upcomingState.currentData as { items: Array<Record<string, unknown>> }).items[0],
        employeeId: "ddd-first",
        displayName: "DDD first page",
      }],
      nextCursor: "ddd-page-2",
      hasMore: true,
    };
    const dddSecond = {
      ...dddFirst,
      items: [{
        ...(dddFirst.items as Array<Record<string, unknown>>)[0],
        employeeId: "ddd-second",
        displayName: "DDD second page",
      }],
      nextCursor: null,
      hasMore: false,
    };
    const hhaFirst = {
      ...dddFirst,
      items: [{
        ...(dddFirst.items as Array<Record<string, unknown>>)[0],
        employeeId: "hha-first",
        displayName: "HHA first page",
      }],
      nextCursor: null,
      hasMore: false,
    };
    api.upcomingHook.mockImplementation((args: { mode: "ddd" | "hha"; cursor?: string }) => ({
      ...api.upcomingState,
      data: args.mode === "hha" ? hhaFirst : args.cursor ? dddSecond : dddFirst,
      currentData: args.mode === "hha" ? hhaFirst : args.cursor ? dddSecond : dddFirst,
    }));
    const view = render(<AgencyPayrollRunsWorkspace scope={scope} />);

    fireEvent.click(screen.getByRole("tab", { name: "Upcoming" }));
    await screen.findByText("DDD first page");
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(await screen.findByText("DDD second page")).toBeInTheDocument();

    api.currentHook.mockClear();
    api.employeesHook.mockClear();
    api.upcomingHook.mockClear();
    view.rerender(<AgencyPayrollRunsWorkspace scope={{ ...scope, mode: "hha" }} />);

    expect(screen.getByRole("tab", { name: "Upcoming" })).toHaveAttribute("aria-selected", "true");
    expect(await screen.findByText("HHA first page")).toBeInTheDocument();
    expect(screen.queryByText("DDD second page")).not.toBeInTheDocument();
    expect(api.currentHook).toHaveBeenCalledOnce();
    expect(api.currentHook).toHaveBeenCalledWith({ ...scope, mode: "hha" }, { skip: false });
    expect(api.employeesHook).toHaveBeenCalledOnce();
    expect(api.employeesHook).toHaveBeenCalledWith({ ...scope, mode: "hha" }, { skip: false });
    expect(api.upcomingHook).toHaveBeenCalledOnce();
    expect(api.upcomingHook).toHaveBeenCalledWith(
      { ...scope, mode: "hha" },
      { refetchOnMountOrArgChange: true },
    );
    expect(api.historyHook).not.toHaveBeenCalled();
    expect(api.eventsHook).not.toHaveBeenCalled();
    expect(api.obligationsHook).not.toHaveBeenCalled();

    view.rerender(<AgencyPayrollRunsWorkspace scope={scope} />);

    expect(screen.getByRole("tab", { name: "Upcoming" })).toHaveAttribute("aria-selected", "true");
    expect(await screen.findByText("DDD first page")).toBeInTheDocument();
    expect(screen.queryByText("DDD second page")).not.toBeInTheDocument();
  });

  it("closes an open approval when the program mode changes", async () => {
    const projection = current("ready_to_approve");
    delete projection.activeOperation;
    projection.prerequisites = { revisionReady: true, dispositionsComplete: true, noBlockers: true, providerSynchronized: true, previewReady: true };
    projection.capabilities.commands.approve_payroll = { enabled: true, reasonCode: null };
    projection.run.preview = {
      status: "succeeded", revisionId: "revision-1", hash: "a".repeat(64), observedAt: "2026-08-24T12:00:00.000Z",
      totals: { grossCents: 125_00, reimbursementsCents: 5_00, employeeTaxesCents: 10_00, employeeDeductionsCents: 0, employerTaxesCents: 10_00, employerContributionsCents: 0, netPayCents: 120_00, expectedCashRequirementCents: 140_00 },
    };
    api.currentState = { ...api.currentState, data: projection, currentData: projection };
    const approvalRequest = { unwrap: () => new Promise<PayrollRunProjection>(() => undefined), abort: vi.fn() };
    api.approvalDetailTrigger.mockReturnValue(approvalRequest);
    const view = render(<AgencyPayrollRunsWorkspace scope={scope} />);

    fireEvent.click(screen.getByRole("button", { name: "Approve payroll" }));
    expect(await screen.findByRole("dialog", { name: "Approve payroll" })).toBeInTheDocument();
    view.rerender(<AgencyPayrollRunsWorkspace scope={{ ...scope, mode: "hha" }} />);

    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Approve payroll" })).not.toBeInTheDocument());
    view.rerender(<AgencyPayrollRunsWorkspace scope={scope} />);
    expect(screen.queryByRole("dialog", { name: "Approve payroll" })).not.toBeInTheDocument();
  });

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
    };
    api.currentState = {
      ...api.currentState,
      data: empty,
      currentData: empty,
    };
    api.employeesState = { ...api.employeesState, data: empty, currentData: empty };
    view.rerender(<AgencyPayrollRunsWorkspace scope={scope} />);
    expect(screen.getByText("No active payroll period.")).toBeInTheDocument();
    expect(screen.getByText(/Check Upcoming for the next scheduled pay period/i)).toBeInTheDocument();
  });

  it("reserves geometry while loading and announces localized progress politely", () => {
    api.currentState = { data: undefined, currentData: undefined, isLoading: true, isFetching: true, refetch: vi.fn() };
    api.employeesState = { data: undefined, currentData: undefined, isLoading: true, isFetching: true, refetch: vi.fn() };
    render(<AgencyPayrollRunsWorkspace scope={scope} />);

    const skeleton = screen.getByTestId("payroll-tab-skeleton");
    expect(skeleton).toHaveAttribute("role", "status");
    expect(skeleton).toHaveAttribute("aria-busy", "true");
    expect(skeleton).toHaveTextContent("Loading the current payroll…");
    expect(screen.getByTestId("payroll-tab-skeleton-content")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByTestId("payroll-workspace")).toHaveAttribute("aria-busy", "true");
  });

  it("shows an accessible skeleton while the upcoming payroll is loading", () => {
    api.upcomingState = {
      data: undefined,
      currentData: undefined,
      isLoading: true,
      isFetching: true,
      isError: false,
      refetch: vi.fn(),
    };
    render(<AgencyPayrollRunsWorkspace scope={scope} />);

    fireEvent.click(screen.getByRole("tab", { name: "Upcoming" }));

    expect(screen.getByRole("status")).toHaveTextContent("Loading upcoming payroll…");
    const skeleton = screen.getByTestId("payroll-tab-skeleton");
    expect(skeleton).toHaveAttribute("role", "status");
    expect(skeleton).toHaveAttribute("aria-busy", "true");
    expect(skeleton).toHaveTextContent("Loading upcoming payroll…");
    expect(screen.getByTestId("payroll-tab-skeleton-content")).toHaveAttribute("aria-hidden", "true");
  });

  it("keeps the audit tab in a loading state until the current payroll settles", () => {
    api.currentState = { data: undefined, currentData: undefined, isLoading: true, isFetching: true, refetch: vi.fn() };
    api.employeesState = { data: undefined, currentData: undefined, isLoading: true, isFetching: true, refetch: vi.fn() };
    render(<AgencyPayrollRunsWorkspace scope={scope} />);

    fireEvent.click(screen.getByRole("tab", { name: "Audit" }));

    const skeleton = screen.getByTestId("payroll-tab-skeleton");
    expect(skeleton).toHaveAttribute("role", "status");
    expect(skeleton).toHaveAttribute("aria-busy", "true");
    expect(screen.getByTestId("payroll-tab-skeleton-content")).toHaveAttribute("aria-hidden", "true");
    expect(screen.queryByText("No active payroll is available for audit.")).not.toBeInTheDocument();
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
