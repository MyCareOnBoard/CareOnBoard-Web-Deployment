import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  workspace: {} as Record<string, unknown>,
  operational: { agencyId: "atlas", agency: { name: "Atlas Care" } },
}));
const routing = vi.hoisted(() => ({ navigate: vi.fn() }));

vi.mock("react-router", async () => ({
  ...(await vi.importActual<typeof import("react-router")>("react-router")),
  useNavigate: () => routing.navigate,
  useLocation: () => ({
    pathname: "/super-admin/billing/payroll-management",
    search: "?scope=network&status=open",
    hash: "",
    state: null,
    key: "payroll-test",
  }),
}));

vi.mock("./BillingWorkspaceContext", () => ({ useBillingWorkspaceContext: () => state.workspace }));
vi.mock("@/lib/operational-agency/OperationalAgencyProvider", () => ({ useOperationalAgency: () => state.operational }));
vi.mock("@/features/payroll/runs/pages/NetworkPayrollRunsWorkspace", () => ({
  NetworkPayrollRunsWorkspace: ({ actorUid, onOpenAgency }: { actorUid: string; onOpenAgency: (agencyId: string) => void }) => (
    <div><output aria-label="Network actor">{actorUid}</output><button type="button" onClick={() => onOpenAgency("atlas")}>Open agency</button></div>
  ),
}));
vi.mock("@/features/payroll/runs/pages/SuperAdminAgencyPayrollRunsWorkspace", () => ({
  SuperAdminAgencyPayrollRunsWorkspace: ({ scope, agencyName }: { scope: { actorUid: string; agencyId: string; operationalContextRevision: number }; agencyName: string }) => (
    <div>
      <output aria-label="Selected payroll scope">{`${scope.actorUid}:${scope.agencyId}:${scope.operationalContextRevision}`}</output>
      <output aria-label="Selected payroll agency">{agencyName}</output>
    </div>
  ),
}));

import SuperAdminBillingPayroll from "./SuperAdminBillingPayroll";

describe("SuperAdminBillingPayroll", () => {
  beforeEach(() => {
    state.workspace = {
      actorUid: "super-1",
      scope: { kind: "network" },
      operationalContextRevision: 0,
    };
    state.operational = { agencyId: "atlas", agency: { name: "Atlas Care" } };
  });

  it("mounts the network run workspace for network scope", () => {
    render(<MemoryRouter><SuperAdminBillingPayroll /></MemoryRouter>);
    expect(screen.getByLabelText("Network actor")).toHaveTextContent("super-1");
  });

  it("passes only the revalidated agency identity and local context revision to the read-only workspace", () => {
    state.workspace = {
      actorUid: "super-1",
      scope: { kind: "agency", agencyId: "atlas" },
      operationalContextRevision: 7,
    };
    render(<MemoryRouter><SuperAdminBillingPayroll /></MemoryRouter>);
    expect(screen.getByLabelText("Selected payroll scope")).toHaveTextContent("super-1:atlas:7");
    expect(screen.getByLabelText("Selected payroll agency")).toHaveTextContent("Atlas Care");
    expect(screen.queryByRole("button", { name: /approve/i })).not.toBeInTheDocument();
  });

  it("fails closed when the URL agency and revalidated provider disagree", () => {
    state.workspace = {
      actorUid: "super-1",
      scope: { kind: "agency", agencyId: "beacon" },
      operationalContextRevision: 8,
    };
    render(<MemoryRouter><SuperAdminBillingPayroll /></MemoryRouter>);
    expect(screen.getByRole("alert")).toHaveTextContent("Selected payroll context is unavailable");
    expect(screen.queryByLabelText("Selected payroll scope")).not.toBeInTheDocument();
  });
});
