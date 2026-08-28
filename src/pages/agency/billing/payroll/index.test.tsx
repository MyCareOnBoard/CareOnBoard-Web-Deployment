import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AgencyPayrollDashboardPage } from "./index";

const state = vi.hoisted(() => ({
  user: {} as Record<string, unknown> | null,
  mode: "ddd" as "ddd" | "hha" | null,
}));

vi.mock("@/utils/auth", () => ({ useAuth: () => ({ user: state.user }) }));
vi.mock("@/hooks/useEffectiveAgencyMode", () => ({ useEffectiveAgencyMode: () => state.mode }));
vi.mock("@/lib/operational-agency/OperationalAgencyProvider", () => ({
  OperationalAgencyProvider: () => <div data-testid="legacy-provider">Legacy provider</div>,
  useOperationalAgency: () => ({ agencyId: "agency-1" }),
}));
vi.mock("@/features/payroll/runs/pages/AgencyPayrollWorkspaceBoundary", () => ({
  AgencyPayrollWorkspaceBoundary: ({ scope }: { scope: { actorUid: string; agencyId: string; mode: string } }) => (
    <div data-testid="payroll-workspace-scope">{scope.actorUid}:{scope.agencyId}:{scope.mode}</div>
  ),
}));

describe("agency payroll route adapter", () => {
  beforeEach(() => {
    state.mode = "ddd";
    state.user = {
      uid: "actor-1",
      agencyId: "agency-1",
      agency: { id: "agency-1", supportedClientTypes: ["ddd"] },
      profile: { accessList: ["Payroll Management"] },
    };
  });

  it("passes the authenticated agency scope to the payroll workspace", () => {
    render(<AgencyPayrollDashboardPage />);
    expect(screen.getByTestId("payroll-workspace-scope")).toHaveTextContent("actor-1:agency-1:ddd");
    expect(screen.queryByTestId("legacy-provider")).not.toBeInTheDocument();
  });

  it("fails closed before issuing payroll work without a complete identity", () => {
    state.user = { uid: "actor-1" };
    render(<AgencyPayrollDashboardPage />);
    expect(screen.getByRole("alert")).toHaveTextContent("Sign in again to manage payroll.");
    expect(screen.queryByTestId("payroll-workspace-scope")).not.toBeInTheDocument();
  });

  it("fails closed for a dual-mode agency until the user chooses DDD or HHA", () => {
    state.mode = null;
    state.user = {
      uid: "actor-1",
      agencyId: "agency-1",
      agency: { id: "agency-1", supportedClientTypes: ["ddd", "hha"] },
      profile: { accessList: ["Payroll Management"] },
    };

    render(<AgencyPayrollDashboardPage />);

    expect(screen.getByRole("alert")).toHaveTextContent("Choose DDD or HHA");
    expect(screen.queryByTestId("payroll-workspace-scope")).not.toBeInTheDocument();
  });
});
