import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { checkPayrollApi } from "../../api/checkPayrollApi";
import type { AgencyPayrollSetupProjection } from "../../model/types";
import type { CurrentPayrollWorkspaceState } from "../hooks/useCurrentPayrollWorkspace";
import { AgencyPayrollWorkspaceBoundary } from "./AgencyPayrollWorkspaceBoundary";

const baseQuery = vi.hoisted(() => vi.fn());
const state = vi.hoisted(() => ({
  workspace: {} as CurrentPayrollWorkspaceState,
  workspaceHook: vi.fn(),
}));

vi.mock("@/lib/baseQuery", () => ({ customBaseQuery: baseQuery }));
vi.mock("../hooks/useCurrentPayrollWorkspace", () => ({
  useCurrentPayrollWorkspace: (...args: unknown[]) => state.workspaceHook(...args),
}));
vi.mock("./AgencyPayrollRunsWorkspace", () => ({
  AgencyPayrollRunsWorkspaceView: () => <div>Payroll workspace</div>,
  PayrollWorkspaceEmptyState: ({ onRetry }: { onRetry?: () => void }) => (
    <button type="button" onClick={onRetry}>Try again</button>
  ),
}));

const scope = {
  audience: "agency" as const,
  actorUid: "actor-1",
  agencyId: "agency-1",
  mode: "ddd" as const,
};

const setupProjection: AgencyPayrollSetupProjection = {
  projectionRevision: 1,
  integration: { state: "configured", environment: "sandbox" },
  preflight: { values: {}, missingFieldCodes: [] },
  readiness: { status: "ready", blockers: [], nextAction: null },
  setup: {
    companyOnboardRevision: null,
    designatedSignerPresent: false,
    signerCandidate: null,
    designatedSigner: null,
    companyLinked: true,
    officeWorkplaceLinked: true,
    enrollmentProfileLocked: true,
    signatoryLinked: false,
  },
  schedulePrerequisite: { state: "complete", recoveryAction: null, timeZone: "America/Chicago", frequency: "weekly", payrollStartDate: "2026-08-24", firstPeriodEnd: "2026-09-06", firstPayday: "2026-09-11", secondPayday: null, compatibilityCode: null, compatibilityMessage: null, nextPeriodStart: "2026-08-31", nextPeriodEnd: "2026-09-06", nextPayday: "2026-09-11", nextApprovalDeadline: "2026-09-08T17:00:00.000Z", lastReconciledAt: "2026-08-30T12:00:00.000Z" },
  payrollActivation: { status: "ready", blocker: null },
  capabilities: {
    canView: true,
    canManage: true,
    canCreateIntegration: false,
    canDesignateSigner: false,
    createCompanyOnboardSession: false,
    canSubmitCompanyImplementation: false,
    canRetryCompanySync: false,
    canRefreshCompanyReconciliation: false,
  },
};

function createStore() {
  return configureStore({
    reducer: { [checkPayrollApi.reducerPath]: checkPayrollApi.reducer },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(checkPayrollApi.middleware),
  });
}

describe("AgencyPayrollWorkspaceBoundary", () => {
  beforeEach(() => {
    baseQuery.mockReset();
    baseQuery.mockResolvedValue({ data: setupProjection });
    state.workspaceHook.mockReset();
    state.workspace = {
      scopeKey: "scope-a",
      runResponse: null,
      employeePage: null,
      identity: null,
      freshness: "unavailable",
      commandsEnabled: false,
      mismatchIdentity: null,
      isLoading: false,
      isFetching: false,
      error: { status: 503 },
      refetch: vi.fn(),
    };
    state.workspaceHook.mockImplementation(() => state.workspace);
  });

  it("offers a retry when the initial Check payroll pair is unavailable", async () => {
    const user = userEvent.setup();
    const store = createStore();
    render(
      <Provider store={store}>
        <AgencyPayrollWorkspaceBoundary scope={scope} />
      </Provider>,
    );

    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(state.workspace.refetch).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Payroll workspace")).not.toBeInTheDocument();
  });

  it("reuses the mode-less setup request and cache when the run mode changes", async () => {
    const store = createStore();
    const { rerender } = render(
      <Provider store={store}>
        <AgencyPayrollWorkspaceBoundary scope={scope} setupAuthorized />
      </Provider>,
    );
    await waitFor(() => expect(baseQuery).toHaveBeenCalledTimes(1));

    rerender(
      <Provider store={store}>
        <AgencyPayrollWorkspaceBoundary scope={{ ...scope, mode: "hha" }} setupAuthorized />
      </Provider>,
    );

    await waitFor(() => {
      expect(Object.keys(store.getState().checkPayrollApi.queries)).toHaveLength(1);
      expect(state.workspaceHook).toHaveBeenLastCalledWith(
        { ...scope, mode: "hha" },
        { skip: false },
      );
    });
    expect(baseQuery).toHaveBeenCalledTimes(1);
  });
});
