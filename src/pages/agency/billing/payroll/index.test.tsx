import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AgencyPayrollDashboardPage } from "./index";

const auth = vi.hoisted(() => ({ user: {} as Record<string, unknown> | null }));

vi.mock("@/utils/auth", () => ({ useAuth: () => ({ user: auth.user }) }));
vi.mock("react-redux", () => ({ useSelector: () => "ddd" }));
vi.mock("@/lib/operational-agency/OperationalAgencyProvider", () => ({
  OperationalAgencyProvider: () => <div data-testid="legacy-provider">Legacy provider</div>,
  useOperationalAgency: () => ({ agencyId: "agency-1" }),
}));
vi.mock("@/features/payroll/runs/pages/PayrollWorkspaceCutoverBoundary", () => ({
  PayrollWorkspaceCutoverBoundary: ({ scope }: { scope: { actorUid: string; agencyId: string } }) => (
    <div data-testid="payroll-cutover-scope">{scope.actorUid}:{scope.agencyId}</div>
  ),
}));

describe("agency payroll route adapter", () => {
  beforeEach(() => {
    auth.user = {
      uid: "actor-1",
      agencyId: "agency-1",
      agency: { id: "agency-1", supportedClientTypes: ["ddd"] },
      profile: { accessList: ["Payroll Management"] },
    };
  });

  it("passes the authenticated agency scope to the cutover bootstrap", () => {
    render(<AgencyPayrollDashboardPage />);
    expect(screen.getByTestId("payroll-cutover-scope")).toHaveTextContent("actor-1:agency-1");
    expect(screen.queryByTestId("legacy-provider")).not.toBeInTheDocument();
  });

  it("fails closed before issuing payroll work without a complete identity", () => {
    auth.user = { uid: "actor-1" };
    render(<AgencyPayrollDashboardPage />);
    expect(screen.getByRole("alert")).toHaveTextContent("Sign in again to manage payroll.");
    expect(screen.queryByTestId("payroll-cutover-scope")).not.toBeInTheDocument();
  });
});
