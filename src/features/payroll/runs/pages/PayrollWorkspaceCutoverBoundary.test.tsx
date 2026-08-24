import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CurrentPayrollWorkspaceState } from "../hooks/useCurrentPayrollWorkspace";
import { PayrollWorkspaceCutoverBoundary } from "./PayrollWorkspaceCutoverBoundary";

const workspace = vi.hoisted(() => ({ state: {} as CurrentPayrollWorkspaceState, hook: vi.fn() }));

vi.mock("../hooks/useCurrentPayrollWorkspace", () => ({
  useCurrentPayrollWorkspace: (...args: unknown[]) => workspace.hook(...args),
}));
vi.mock("./AgencyPayrollRunsWorkspace", () => ({
  AgencyPayrollRunsWorkspaceView: ({ workspace: value }: { workspace: CurrentPayrollWorkspaceState }) => (
    <div data-testid="new-payroll-workspace" data-freshness={value.freshness}>New payroll workspace</div>
  ),
}));
vi.mock("@/pages/agency/billing/payroll/legacy", () => ({
  LegacyAgencyPayrollDashboardPage: () => <button type="button">Legacy create payroll invoice</button>,
}));

const scope = { audience: "agency" as const, actorUid: "actor-1", agencyId: "agency-1" };
const base = {
  scopeKey: "scope",
  employeePage: null,
  identity: { kind: "empty", runId: null, activeRevisionId: null, revisionNumber: null },
  commandsEnabled: false,
  mismatchIdentity: null,
  isLoading: false,
  isFetching: false,
  error: null,
  refetch: vi.fn(),
} as const;

describe("PayrollWorkspaceCutoverBoundary", () => {
  beforeEach(() => {
    workspace.hook.mockReset();
    workspace.hook.mockImplementation(() => workspace.state);
  });

  it("lazy-loads the preserved legacy workspace only for a matching legacy pair", async () => {
    workspace.state = {
      ...base,
      runResponse: {
        kind: "empty",
        runId: null,
        activeRevisionId: null,
        revisionNumber: null,
        run: null,
        emptyReason: "no_active_period",
        workspaceMode: "legacy",
        capabilities: { replacementWorkspace: false },
      },
      workspaceMode: "legacy",
      freshness: "fresh",
    } as unknown as CurrentPayrollWorkspaceState;

    render(<PayrollWorkspaceCutoverBoundary scope={scope} />);
    expect(await screen.findByRole("button", { name: "Legacy create payroll invoice" })).toBeInTheDocument();
    expect(screen.queryByTestId("new-payroll-workspace")).not.toBeInTheDocument();
  });

  it("uses the replacement workspace for a matching post-cutover run", () => {
    workspace.state = {
      ...base,
      runResponse: { kind: "run", workspaceMode: "run" },
      workspaceMode: "run",
      freshness: "fresh",
    } as unknown as CurrentPayrollWorkspaceState;
    render(<PayrollWorkspaceCutoverBoundary scope={scope} />);
    expect(screen.getByTestId("new-payroll-workspace")).toBeInTheDocument();
    expect(screen.queryByText("Legacy create payroll invoice")).not.toBeInTheDocument();
  });

  it("fails closed on an unknown pair and exposes no legacy controls", () => {
    workspace.state = {
      ...base,
      runResponse: null,
      workspaceMode: null,
      identity: null,
      freshness: "unavailable",
    } as CurrentPayrollWorkspaceState;
    render(<PayrollWorkspaceCutoverBoundary scope={scope} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Payroll workspace is temporarily unavailable.");
    expect(screen.queryByText("Legacy create payroll invoice")).not.toBeInTheDocument();
  });

  it("retains the new workspace read-only after a post-cutover rollback", () => {
    workspace.state = {
      ...base,
      runResponse: { kind: "run", workspaceMode: "run" },
      workspaceMode: "run",
      freshness: "stale",
    } as unknown as CurrentPayrollWorkspaceState;
    render(<PayrollWorkspaceCutoverBoundary scope={scope} />);
    expect(screen.getByTestId("new-payroll-workspace")).toHaveAttribute("data-freshness", "stale");
    expect(screen.queryByText("Legacy create payroll invoice")).not.toBeInTheDocument();
  });
});
