import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CurrentPayrollWorkspaceState } from "../hooks/useCurrentPayrollWorkspace";
import { AgencyPayrollWorkspaceBoundary } from "./AgencyPayrollWorkspaceBoundary";

const state = vi.hoisted(() => ({
  setup: {} as Record<string, unknown>,
  workspace: {} as CurrentPayrollWorkspaceState,
  setupHook: vi.fn(),
  workspaceHook: vi.fn(),
}));

vi.mock("../../api/agencyPayrollEndpoints", () => ({
  useGetAgencyPayrollSetupQuery: (...args: unknown[]) => state.setupHook(...args),
}));
vi.mock("../hooks/useCurrentPayrollWorkspace", () => ({
  useCurrentPayrollWorkspace: (...args: unknown[]) => state.workspaceHook(...args),
}));
vi.mock("./AgencyPayrollRunsWorkspace", () => ({
  AgencyPayrollRunsWorkspaceView: () => <div>Payroll workspace</div>,
  PayrollWorkspaceEmptyState: ({ onRetry }: { onRetry?: () => void }) => (
    <button type="button" onClick={onRetry}>Try again</button>
  ),
}));

const scope = { audience: "agency" as const, actorUid: "actor-1", agencyId: "agency-1" };

describe("AgencyPayrollWorkspaceBoundary", () => {
  beforeEach(() => {
    state.setupHook.mockReset();
    state.workspaceHook.mockReset();
    state.setupHook.mockReturnValue({ currentData: undefined, error: undefined, refetch: vi.fn() });
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
    render(<AgencyPayrollWorkspaceBoundary scope={scope} />);

    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(state.workspace.refetch).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Payroll workspace")).not.toBeInTheDocument();
  });
});
