import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Outlet, Route, Routes as ReactRoutes, useLocation, useNavigate } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  OperationalAgencyProvider,
  useOperationalAgency,
} from "@/lib/operational-agency/OperationalAgencyProvider";
import type { OperationalActor } from "@/lib/operational-agency/types";
import { useFinancialOverview } from "@/pages/agency/billing/financial-overview/hooks/useFinancialOverview";
import { Routes } from "@/routes/constants";

const billingApi = vi.hoisted(() => ({
  getClaimsDashboard: vi.fn(),
  listBillingClaims: vi.fn(),
  getPayrollDashboard: vi.fn(),
  listPayrollInvoices: vi.fn(),
}));
const operationsApi = vi.hoisted(() => ({
  getOperationalAgencyContext: vi.fn(),
  listOperationalAgencies: vi.fn(),
}));
const auth = vi.hoisted(() => ({
  accessList: ["Billing Management"] as string[],
  agency: undefined as { name: string; supportedClientTypes?: ("ddd" | "hha")[] } | undefined,
}));
const reduxState = vi.hoisted(() => ({
  modeByAgency: { "actor-agency": "hha" } as Record<string, "ddd" | "hha">,
}));

vi.mock("react-router", async () => vi.importActual<typeof import("react-router")>("react-router"));
vi.mock("@/lib/api/claims", () => ({
  getClaimsDashboard: billingApi.getClaimsDashboard,
  listBillingClaims: billingApi.listBillingClaims,
}));
vi.mock("@/lib/api/payroll", () => ({
  getPayrollDashboard: billingApi.getPayrollDashboard,
  listPayrollInvoices: billingApi.listPayrollInvoices,
}));
vi.mock("@/hooks/useEffectiveAgencyMode", async () => ({
  ...(await vi.importActual<typeof import("@/hooks/useEffectiveAgencyMode")>("@/hooks/useEffectiveAgencyMode")),
  useEffectiveAgencyMode: () => "hha",
}));
vi.mock("react-redux", () => ({
  useSelector: (selector: (state: unknown) => unknown) => selector({
    agencyMode: { modeByAgency: reduxState.modeByAgency },
  }),
}));
vi.mock("@/utils/auth", () => ({
  useAuth: () => ({
    user: {
      uid: "super-1",
      userType: "super_admin",
      agencyId: "actor-agency",
      agency: auth.agency,
      profile: { accessList: auth.accessList },
    },
  }),
}));
vi.mock("@/lib/api/super-admin-operations", () => ({
  getOperationalAgencyContext: operationsApi.getOperationalAgencyContext,
  listOperationalAgencies: operationsApi.listOperationalAgencies,
}));
vi.mock("@/lib/operational-agency/dataAdapters", () => ({
  createAgencyOperationalDataAdapter: vi.fn(() => ({})),
  createSuperAdminOperationalDataAdapter: vi.fn(() => ({})),
}));
vi.mock("@/pages/agency/billing/claims", () => ({ default: () => null }));
vi.mock("@/pages/agency/billing/payroll", () => ({ default: () => null }));
vi.mock("@/pages/agency/billing/expenses", () => ({ default: () => null }));

import SuperAdminBillingWorkspace from "./SuperAdminBillingWorkspace";
import { SuperAdminBillingIndex } from "./index";
import { useBillingWorkspaceContext } from "./BillingWorkspaceContext";
import { FinancialOverview } from "@/pages/agency/billing/pages";

const atlas = {
  id: "atlas",
  name: "Atlas Care",
  status: "active",
  supportedClientTypes: ["ddd"] as const,
  timezone: "America/New_York",
};
const beacon = { ...atlas, id: "beacon", name: "Beacon Supports" };
const dualAtlas = { ...atlas, supportedClientTypes: ["ddd", "hha"] as const };

const claimsDashboard = {
  overview: {
    submitted: { count: 3, amount: 300 },
    pending: { count: 1, amount: 100 },
    paid: { count: 2, amount: 200 },
    rejected: { count: 0, amount: 0 },
    atRisk: { count: 0, amount: 0 },
  },
  claimsByStatus: { total: 3, segments: [] },
  rejectionReasons: { total: 0, segments: [] },
};

const payrollDashboard = {
  overview: {
    totalDue: { count: 0, amount: 0 },
    hoursPendingApproval: { hours: 0 },
    overtime: { hours: 0 },
    missingTimesheet: { count: 0 },
    upcomingPayout: { date: null },
  },
  payrollByStatus: { total: 0, segments: [] },
  overtimeAlerts: [],
};

function FinancialProbe() {
  const overview = useFinancialOverview({ startDate: "2026-07-01", endDate: "2026-07-07" });
  return (
    <>
      <output aria-label="Total revenue">{overview.overviewStats[0]?.value}</output>
      <output aria-label="Overview loading">{String(overview.loading)}</output>
    </>
  );
}

function FinancialProvider({ actor, agency = atlas }: { actor: OperationalActor; agency?: typeof atlas }) {
  return (
    <OperationalAgencyProvider
      actor={actor}
      agencyId={agency.id}
      agency={agency}
      mode="ddd"
      capabilities={{ canManageShifts: false, canManageBilling: true, shiftMaintenance: false }}
      data={{} as never}
    >
      <FinancialProbe />
    </OperationalAgencyProvider>
  );
}

function renderFinancialOverview(actor: OperationalActor) {
  return render(<FinancialProvider actor={actor} />);
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => { resolve = next; });
  return { promise, resolve };
}

describe("shared financial overview context", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.accessList = ["Billing Management"];
    auth.agency = undefined;
    reduxState.modeByAgency = { "actor-agency": "hha" };
    operationsApi.listOperationalAgencies.mockResolvedValue({
      data: [atlas, beacon],
      nextCursor: null,
    });
    operationsApi.getOperationalAgencyContext.mockImplementation(
      (_feature: string, agencyId: string) => Promise.resolve(agencyId === "beacon" ? beacon : atlas),
    );
    billingApi.getClaimsDashboard.mockResolvedValue(claimsDashboard);
    billingApi.getPayrollDashboard.mockResolvedValue(payrollDashboard);
    billingApi.listBillingClaims.mockResolvedValue({ claims: [], total: 0 });
    billingApi.listPayrollInvoices.mockResolvedValue({ invoices: [], total: 0 });
  });

  it("defines all planned billing URLs before mounting later billing pages", () => {
    expect(Routes.superAdmin.billing).toEqual({
      index: "/super-admin/billing",
      financialOverview: "/super-admin/billing/financial-overview",
      payrollManagement: "/super-admin/billing/payroll-management",
      claims: "/super-admin/billing/claims",
      expenses: "/super-admin/billing/expenses",
      staffTimesheets: "/super-admin/billing/staff-timesheets",
    });
  });

  it("uses the provider agency and mode for identical agency and super-admin overview requests", async () => {
    const agencyView = renderFinancialOverview("agency");
    await waitFor(() => expect(screen.getByLabelText("Total revenue")).toHaveTextContent("$200.00"));
    const agencyCurrentRequest = billingApi.getClaimsDashboard.mock.calls.find(
      ([input]) => input.query.startDate === "2026-07-01",
    )?.[0];
    expect(agencyCurrentRequest).toEqual(expect.objectContaining({
      context: { agencyId: "atlas" },
      query: { startDate: "2026-07-01", endDate: "2026-07-07", mode: "ddd" },
    }));
    agencyView.unmount();

    vi.clearAllMocks();
    billingApi.getClaimsDashboard.mockResolvedValue(claimsDashboard);
    billingApi.getPayrollDashboard.mockResolvedValue(payrollDashboard);
    billingApi.listBillingClaims.mockResolvedValue({ claims: [], total: 0 });
    billingApi.listPayrollInvoices.mockResolvedValue({ invoices: [], total: 0 });

    renderFinancialOverview("super_admin");
    await waitFor(() => expect(screen.getByLabelText("Total revenue")).toHaveTextContent("$200.00"));
    const superAdminCurrentRequest = billingApi.getClaimsDashboard.mock.calls.find(
      ([input]) => input.query.startDate === "2026-07-01",
    )?.[0];
    expect(superAdminCurrentRequest).toEqual(expect.objectContaining({
      context: { agencyId: "atlas" },
      query: { startDate: "2026-07-01", endDate: "2026-07-07", mode: "ddd" },
    }));
    expect(superAdminCurrentRequest.context).toEqual(agencyCurrentRequest.context);
    expect(superAdminCurrentRequest.query).toEqual(agencyCurrentRequest.query);
    expect(billingApi.getPayrollDashboard).toHaveBeenCalledTimes(1);
    expect(billingApi.listBillingClaims).toHaveBeenCalledTimes(1);
    expect(billingApi.listPayrollInvoices).toHaveBeenCalledTimes(1);
  });

  it("clears prior metrics and aborts stale overview requests when the provider agency changes", async () => {
    const beaconClaims = deferred<typeof claimsDashboard>();
    let atlasSignal: AbortSignal | undefined;
    billingApi.getClaimsDashboard.mockImplementation((input) => {
      if (input.context.agencyId === "atlas") {
        atlasSignal = input.signal;
        return Promise.resolve(claimsDashboard);
      }
      if (input.query.startDate === "2026-07-01") return beaconClaims.promise;
      return Promise.resolve(claimsDashboard);
    });

    const view = render(<FinancialProvider actor="super_admin" />);
    await waitFor(() => expect(screen.getByLabelText("Total revenue")).toHaveTextContent("$200.00"));

    view.rerender(<FinancialProvider actor="super_admin" agency={beacon} />);
    await waitFor(() => expect(billingApi.getClaimsDashboard).toHaveBeenCalledWith(
      expect.objectContaining({ context: { agencyId: "beacon" } }),
    ));
    expect(screen.getByLabelText("Total revenue")).toHaveTextContent("$0.00");
    expect(screen.getByLabelText("Overview loading")).toHaveTextContent("true");
    expect(atlasSignal?.aborted).toBe(true);

    beaconClaims.resolve({
      ...claimsDashboard,
      overview: {
        ...claimsDashboard.overview,
        paid: { count: 4, amount: 900 },
      },
    });
    await waitFor(() => expect(screen.getByLabelText("Total revenue")).toHaveTextContent("$900.00"));
  });

  it("preserves the agency overview ddd fallback when supported client types are missing", async () => {
    render(<FinancialOverview />);

    await waitFor(() => expect(billingApi.getClaimsDashboard).toHaveBeenCalled());
    const currentRequest = billingApi.getClaimsDashboard.mock.calls[0]?.[0];
    expect(currentRequest).toEqual(expect.objectContaining({
      context: { agencyId: "actor-agency" },
      query: expect.objectContaining({ mode: "ddd" }),
    }));
  });
});

const domainRequest = vi.fn();

function BillingDomainProbe() {
  const operational = useOperationalAgency();
  const location = useLocation();
  domainRequest(operational.agencyId);
  return (
    <div>
      <output aria-label="Billing domain agency">{operational.agency.name}</output>
      <output aria-label="Billing location">{`${location.pathname}${location.search}`}</output>
    </div>
  );
}

function BillingWorkspaceProbe() {
  const workspace = useBillingWorkspaceContext();
  const location = useLocation();
  return (
    <div>
      <output aria-label="Billing workspace scope">
        {workspace.scope.kind === "network" ? "network" : workspace.scope.agencyId}
      </output>
      <output aria-label="Billing workspace actor">{workspace.actorUid}</output>
      <output aria-label="Billing workspace environment">{workspace.environment}</output>
      <output aria-label="Billing workspace dates">{`${workspace.startDate}:${workspace.endDate}`}</output>
      <output aria-label="Billing workspace mode">{workspace.mode ?? "all"}</output>
      <output aria-label="Billing location">{`${location.pathname}${location.search}`}</output>
    </div>
  );
}

function DirectoryCapabilityProbe() {
  const operational = useOperationalAgency();
  return (
    <>
      <output aria-label="Can access clients">{String(operational.capabilities.canAccessClientDirectory)}</output>
      <output aria-label="Can access staff">{String(operational.capabilities.canAccessStaffDirectory)}</output>
      <output aria-label="Client details route">
        {operational.directoryRoutes?.clientDetails?.("client-1") ?? "none"}
      </output>
      <output aria-label="Staff details route">
        {operational.directoryRoutes?.staffDetails?.("staff-1") ?? "none"}
      </output>
    </>
  );
}

function SwitchAgency() {
  const navigate = useNavigate();
  return <button type="button" onClick={() => navigate("/super-admin/billing/financial-overview?agencyId=beacon")}>Switch agency</button>;
}

function renderWorkspace(entry: string, nested = <BillingWorkspaceProbe />) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <ReactRoutes>
        <Route path="/super-admin/billing" element={<SuperAdminBillingWorkspace />}>
          <Route index element={<SuperAdminBillingIndex />} />
          <Route path="financial-overview" element={nested} />
        </Route>
      </ReactRoutes>
    </MemoryRouter>,
  );
}

describe("SuperAdminBillingWorkspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.accessList = ["Billing Management"];
    auth.agency = undefined;
    operationsApi.listOperationalAgencies.mockResolvedValue({
      data: [atlas, beacon],
      nextCursor: null,
    });
    operationsApi.getOperationalAgencyContext.mockImplementation(
      (_feature: string, agencyId: string) => Promise.resolve(agencyId === "beacon" ? beacon : atlas),
    );
  });

  it("fails closed before loading agencies or mounting content without Billing Management", () => {
    auth.accessList = ["Agency Billing Monitor"];
    renderWorkspace("/super-admin/billing/financial-overview?agencyId=atlas", <BillingDomainProbe />);

    expect(screen.getByRole("alert")).toHaveTextContent("You do not have Billing Management access.");
    expect(screen.queryByLabelText("Billing domain agency")).not.toBeInTheDocument();
    expect(operationsApi.getOperationalAgencyContext).not.toHaveBeenCalled();
    expect(operationsApi.listOperationalAgencies).not.toHaveBeenCalled();
  });

  it("defaults to network scope and mounts child content without singular agency resolution", async () => {
    renderWorkspace("/super-admin/billing/financial-overview?status=open");

    expect(screen.getByLabelText("Billing workspace scope")).toHaveTextContent("network");
    expect(screen.getByLabelText("Billing workspace actor")).toHaveTextContent("super-1");
    expect(screen.getByLabelText("Billing workspace environment")).toHaveTextContent("staging");
    expect(screen.getByRole("button", { name: "Select an agency, all authorized agencies" })).toBeVisible();
    await waitFor(() => expect(operationsApi.listOperationalAgencies).toHaveBeenCalledWith(
      "billing-management",
      expect.objectContaining({ limit: 50, signal: expect.any(AbortSignal) }),
    ));
    expect(operationsApi.getOperationalAgencyContext).not.toHaveBeenCalled();
    expect(domainRequest).not.toHaveBeenCalled();
  });

  it("revalidates a direct-link agency before mounting nested billing content", async () => {
    renderWorkspace("/super-admin/billing/financial-overview?agencyId=atlas", <BillingDomainProbe />);

    expect(await screen.findByLabelText("Billing domain agency")).toHaveTextContent("Atlas Care");
    expect(screen.getByRole("heading", { name: "Billing Management" })).toBeVisible();
    expect(screen.queryByText("Billing workspace · America/New_York")).not.toBeInTheDocument();
    expect(operationsApi.getOperationalAgencyContext).toHaveBeenCalledWith(
      "billing-management",
      "atlas",
      expect.any(AbortSignal),
    );
    expect(domainRequest).toHaveBeenCalledWith("atlas");
  });

  it("derives separate directory capabilities and selected-agency routes from access scopes", async () => {
    auth.accessList = ["Billing Management", "Clients Directory", "Staff Directory"];
    renderWorkspace(
      "/super-admin/billing/financial-overview?agencyId=atlas",
      <DirectoryCapabilityProbe />,
    );

    expect(await screen.findByLabelText("Can access clients")).toHaveTextContent("true");
    expect(screen.getByLabelText("Can access staff")).toHaveTextContent("true");
    expect(screen.getByLabelText("Client details route")).toHaveTextContent(
      "/super-admin/clients/client-1?agencyId=atlas",
    );
    expect(screen.getByLabelText("Staff details route")).toHaveTextContent("none");
  });

  it("fails closed when context revalidation returns a different agency", async () => {
    operationsApi.getOperationalAgencyContext.mockResolvedValue(beacon);
    renderWorkspace("/super-admin/billing/financial-overview?agencyId=atlas");

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load this agency.");
    expect(screen.queryByLabelText("Billing domain agency")).not.toBeInTheDocument();
    expect(domainRequest).not.toHaveBeenCalled();
  });

  it("selects only API-provided agencies and preserves agencyId in the nested overview URL", async () => {
    const user = userEvent.setup();
    renderWorkspace("/super-admin/billing");

    await user.click(screen.getByRole("button", { name: "Select an agency, all authorized agencies" }));
    await user.click(await screen.findByRole("option", { name: "Beacon Supports" }));

    expect(await screen.findByLabelText("Billing workspace scope")).toHaveTextContent("beacon");
    expect(screen.getByLabelText("Billing location")).toHaveTextContent(
      "/super-admin/billing/financial-overview?agencyId=beacon",
    );
  });

  it("redirects an indexed direct link with its resolved agencyId intact", async () => {
    renderWorkspace("/super-admin/billing?agencyId=atlas");

    expect(await screen.findByLabelText("Billing workspace scope")).toHaveTextContent("atlas");
    expect(screen.getByLabelText("Billing location")).toHaveTextContent(
      "/super-admin/billing/financial-overview?agencyId=atlas",
    );
  });

  it("preserves normalized operational query context when redirecting an indexed direct link", async () => {
    operationsApi.getOperationalAgencyContext.mockResolvedValue(dualAtlas);
    renderWorkspace("/super-admin/billing?agencyId=atlas&clientType=hha&view=summary");

    const location = (await screen.findByLabelText("Billing location")).textContent ?? "";
    const target = new URL(location, "https://careonboard.test");
    expect(target.pathname).toBe("/super-admin/billing/financial-overview");
    expect(Object.fromEntries(target.searchParams)).toMatchObject({
      agencyId: "atlas",
      clientType: "hha",
      view: "summary",
    });
  });

  it("unmounts the previous agency immediately while a new URL agency is being revalidated", async () => {
    let resolveBeacon: ((agency: typeof beacon) => void) | undefined;
    operationsApi.getOperationalAgencyContext.mockImplementation(
      (_feature: string, agencyId: string) => agencyId === "beacon"
        ? new Promise<typeof beacon>((resolve) => { resolveBeacon = resolve; })
        : Promise.resolve(atlas),
    );
    const user = userEvent.setup();
    renderWorkspace(
      "/super-admin/billing/financial-overview?agencyId=atlas",
      <><SwitchAgency /><Outlet /><BillingDomainProbe /></>,
    );

    expect(await screen.findByLabelText("Billing domain agency")).toHaveTextContent("Atlas Care");
    await user.click(screen.getByRole("button", { name: "Switch agency" }));
    await waitFor(() => expect(operationsApi.getOperationalAgencyContext).toHaveBeenCalledWith(
      "billing-management",
      "beacon",
      expect.any(AbortSignal),
    ));
    expect(screen.queryByLabelText("Billing domain agency")).not.toBeInTheDocument();

    resolveBeacon?.(beacon);
    expect(await screen.findByLabelText("Billing domain agency")).toHaveTextContent("Beacon Supports");
  });

  it("rejects ambiguous direct-link agency parameters without resolving either agency", async () => {
    renderWorkspace("/super-admin/billing/financial-overview?agencyId=atlas&agencyId=beacon");

    expect(screen.getByRole("alert")).toHaveTextContent("Choose exactly one agency to manage billing.");
    expect(operationsApi.getOperationalAgencyContext).not.toHaveBeenCalled();
    expect(domainRequest).not.toHaveBeenCalled();
  });

  it("uses structural workspace regions instead of a generic spinner while an agency resolves", () => {
    operationsApi.getOperationalAgencyContext.mockReturnValue(new Promise(() => undefined));
    renderWorkspace("/super-admin/billing/financial-overview?agencyId=atlas", <BillingDomainProbe />);

    const skeleton = screen.getByLabelText("Loading billing workspace");
    expect(skeleton).toHaveAttribute("aria-busy", "true");
    expect(screen.getByTestId("billing-skeleton-header")).toBeVisible();
    expect(screen.getByTestId("billing-skeleton-kpis")).toBeVisible();
    expect(screen.getByTestId("billing-skeleton-nav")).toBeVisible();
    expect(screen.getByTestId("billing-skeleton-content")).toBeVisible();
    expect(screen.queryByLabelText("Loading agency")).not.toBeInTheDocument();
  });
});
