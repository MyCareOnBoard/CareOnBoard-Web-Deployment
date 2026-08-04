import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import {
  createMemoryRouter,
  MemoryRouter,
  Outlet,
  Route,
  RouterProvider,
  Routes as ReactRoutes,
  useLocation,
  useNavigate,
} from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
const networkBilling = vi.hoisted(() => ({
  overview: vi.fn(),
  expensesBootstrap: vi.fn(),
  expensesPage: vi.fn(),
  refetch: vi.fn(),
}));
const unfinishedClaimsPage = vi.hoisted(() => vi.fn());

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
  useDispatch: () => vi.fn(),
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
vi.mock("@/lib/api/network-billing", () => ({
  NETWORK_BILLING_QUERY_OPTIONS: { refetchOnMountOrArgChange: 30 },
  networkBillingApi: {
    useGetOverviewBootstrapQuery: networkBilling.overview,
    useGetExpensesBootstrapQuery: networkBilling.expensesBootstrap,
    useLazyGetExpensesPageQuery: networkBilling.expensesPage,
    util: { invalidateTags: vi.fn() },
  },
}));
vi.mock("@/lib/api/billing-expenses", () => ({
  useApproveExpenseMutation: () => [vi.fn(), { isLoading: false }],
  useDeleteExpenseMutation: () => [vi.fn(), { isLoading: false }],
  useRejectExpenseMutation: () => [vi.fn(), { isLoading: false }],
}));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("react-loader-spinner", () => ({ Oval: () => null }));
vi.mock("@/components/ui/button", () => ({ Button: (props: ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props} /> }));
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ open, children }: { open: boolean; children: ReactNode }) => open ? <div role="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}));
vi.mock("@/components/modals/DeleteConfirmationModal", () => ({
  DeleteConfirmationModal: () => null,
}));
vi.mock("@/pages/agency/billing/expenses/components/RejectExpenseModal", () => ({ default: () => null }));
vi.mock("@/pages/agency/billing/expenses/components/ExpensesOverviewCards", () => ({ default: () => null }));
vi.mock("@/pages/agency/billing/expenses/components/ExpensesByStatusChart", () => ({ default: () => null }));
vi.mock("@/pages/agency/billing/expenses/components/ExpensesWorkspaceTabs", () => ({ default: () => null }));
vi.mock("@/pages/agency/billing/expenses/components/PendingExpensesTable", () => ({ default: () => null }));
vi.mock("@/pages/agency/billing/expenses/components/ExpensesHistoryTable", () => ({ default: () => null }));
vi.mock("@/layouts/SuperAdminLayout", async () => {
  const React = await import("react");
  const { Outlet: RouteOutlet } = await import("react-router");
  return { default: () => React.createElement(RouteOutlet) };
});
vi.mock("@/pages/agency/billing/claims", () => ({
  default: () => {
    unfinishedClaimsPage();
    return null;
  },
}));
vi.mock("@/pages/agency/billing/payroll", () => ({ default: () => null }));
vi.mock("@/pages/agency/billing/expenses", () => ({ default: () => null }));

import SuperAdminBillingWorkspace from "./SuperAdminBillingWorkspace";
import { SuperAdminBillingIndex } from "./index";
import { useBillingWorkspaceContext } from "./BillingWorkspaceContext";
import { FinancialOverview } from "@/pages/agency/billing/pages";
import FinancialOverviewPage from "@/pages/agency/billing/financial-overview";
import { router } from "@/routes";

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

afterEach(() => {
  vi.useRealTimers();
});

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
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-08-03T12:00:00"));
    render(<FinancialOverview />);

    await waitFor(() => expect(billingApi.getClaimsDashboard).toHaveBeenCalled());
    const currentRequest = billingApi.getClaimsDashboard.mock.calls[0]?.[0];
    expect(currentRequest).toEqual(expect.objectContaining({
      context: { agencyId: "actor-agency" },
      query: expect.objectContaining({
        startDate: "2026-08-03",
        endDate: "2026-08-09",
        mode: "ddd",
      }),
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
      <output aria-label="Billing payroll week">{workspace.payrollWeekStart}</output>
      <output aria-label="Billing payroll tab">{workspace.payrollTab}</output>
      <output aria-label="Billing location">{`${location.pathname}${location.search}`}</output>
      <button type="button" onClick={() => workspace.onPayrollWeekChange?.("2026-08-03")}>Change payroll week</button>
      <button type="button" onClick={() => workspace.onPayrollTabChange?.("saved")}>Show saved payroll</button>
    </div>
  );
}

function AgencyWorkspaceContextProbe() {
  const workspace = useBillingWorkspaceContext();
  const operational = useOperationalAgency();
  const location = useLocation();
  return (
    <>
      <output aria-label="Context program mode">{workspace.mode ?? "all"}</output>
      <output aria-label="Provider program mode">{operational.mode ?? "all"}</output>
      <output aria-label="Context date range">{`${workspace.startDate}:${workspace.endDate}`}</output>
      <output aria-label="Billing location">{`${location.pathname}${location.search}`}</output>
    </>
  );
}

let datasetProbeSerial = 0;

function DatasetResetProbe() {
  const workspace = useBillingWorkspaceContext();
  const [instance] = useState(() => ++datasetProbeSerial);
  const [selection, setSelection] = useState("");
  return (
    <>
      <output aria-label="Dataset instance">{instance}</output>
      <output aria-label="Dataset mode">{workspace.mode ?? "all"}</output>
      <output aria-label="Dataset dates">{`${workspace.startDate}:${workspace.endDate}`}</output>
      <label>
        Page selection
        <input value={selection} onChange={(event) => setSelection(event.target.value)} />
      </label>
    </>
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
          <Route path="claims" element={nested} />
          <Route path="expenses" element={nested} />
          <Route path="payroll-management" element={nested} />
        </Route>
      </ReactRoutes>
    </MemoryRouter>,
  );
}

function renderActualBillingRoute(entry: string) {
  const configuredRouter = createMemoryRouter(router.routes, { initialEntries: [entry] });
  return {
    configuredRouter,
    ...render(
      <RouterProvider router={configuredRouter} />,
    ),
  };
}

describe("SuperAdminBillingWorkspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    datasetProbeSerial = 0;
    auth.accessList = ["Billing Management"];
    auth.agency = undefined;
    operationsApi.listOperationalAgencies.mockResolvedValue({
      data: [atlas, beacon],
      nextCursor: null,
    });
    operationsApi.getOperationalAgencyContext.mockImplementation(
      (_feature: string, agencyId: string) => Promise.resolve(agencyId === "beacon" ? beacon : atlas),
    );
    networkBilling.overview.mockReturnValue({
      data: {
        scope: { kind: "global", agencyCount: 2 },
        periods: {
          current: { start: "2026-07-01", end: "2026-07-31" },
          previous: { start: "2026-06-01", end: "2026-06-30" },
        },
        current: {
          claims: { count: 2, amount: 240 },
          payroll: { count: 1, amount: 80 },
          expenses: { count: 1, amount: 20 },
        },
        previous: { claims: null, payroll: null, expenses: null },
        recentActivity: [],
        meta: { totalsExact: true, branchCount: 2 },
      },
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: networkBilling.refetch,
    });
    networkBilling.expensesBootstrap.mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      isError: true,
      refetch: networkBilling.refetch,
    });
    networkBilling.expensesPage.mockReturnValue([vi.fn(), { isFetching: false }]);
  });

  it("fails closed before loading agencies or mounting content without Billing Management", () => {
    auth.accessList = ["Agency Billing Monitor"];
    renderWorkspace("/super-admin/billing/financial-overview?agencyId=atlas", <BillingDomainProbe />);

    expect(screen.getByRole("alert")).toHaveTextContent("You do not have Billing Management access.");
    expect(screen.queryByLabelText("Billing domain agency")).not.toBeInTheDocument();
    expect(operationsApi.getOperationalAgencyContext).not.toHaveBeenCalled();
    expect(operationsApi.listOperationalAgencies).not.toHaveBeenCalled();
  });

  it("mounts the completed network overview through the actual super-admin route without an agency provider", async () => {
    renderActualBillingRoute(
      "/super-admin/billing/financial-overview?clientType=ddd&startDate=2026-07-01&endDate=2026-07-31",
    );

    expect(await screen.findByRole("region", { name: "Network financial overview" })).toBeVisible();
    const overviewArgs = networkBilling.overview.mock.calls.map(([args]) => args);
    expect(overviewArgs).toEqual(expect.arrayContaining([
      expect.objectContaining({
        scope: { kind: "network" },
        startDate: "2026-07-01",
        endDate: "2026-07-31",
        mode: "ddd",
        tab: "overview",
      }),
    ]));
    expect(new Set(overviewArgs.map((args) => JSON.stringify(args))).size).toBe(1);
    expect(screen.queryByLabelText("Network billing workspace")).not.toBeInTheDocument();
    expect(operationsApi.getOperationalAgencyContext).not.toHaveBeenCalled();
  });

  it("keeps the completed network overview mounted for a trailing-slash direct link", async () => {
    renderActualBillingRoute(
      "/super-admin/billing/financial-overview/?clientType=ddd&startDate=2026-07-01&endDate=2026-07-31",
    );

    expect(await screen.findByRole("region", { name: "Network financial overview" })).toBeVisible();
    expect(screen.queryByLabelText("Network billing workspace")).not.toBeInTheDocument();
  });

  it("mounts the configured provider-free network expenses controller instead of the staging bridge", async () => {
    const { configuredRouter } = renderActualBillingRoute(
      "/super-admin/billing/expenses?status=open&clientType=ddd&startDate=2026-07-01&endDate=2026-07-31",
    );

    await waitFor(() => expect(configuredRouter.state.errors).toBeNull());
    await waitFor(() => expect(networkBilling.expensesBootstrap).toHaveBeenCalled());
    expect(await screen.findByRole("region", { name: "Network expenses" })).toBeVisible();
    expect(screen.queryByLabelText("Network billing workspace")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Select an agency, all authorized agencies" })).toBeVisible();
    expect(networkBilling.expensesBootstrap).toHaveBeenCalledWith(
      expect.objectContaining({
        scope: { kind: "network" },
        startDate: "2026-07-01",
        endDate: "2026-07-31",
        mode: "ddd",
        tab: "pending",
      }),
      expect.objectContaining({ skip: false }),
    );
    expect(operationsApi.getOperationalAgencyContext).not.toHaveBeenCalled();
  });

  it("canonicalizes network payroll week state and keeps it independent from the billing date range", async () => {
    const user = userEvent.setup();
    renderWorkspace(
      "/super-admin/billing/payroll-management?scope=network&startDate=2026-07-01&endDate=2026-08-02&payrollWeekStart=2026-07-29&payrollTab=invalid",
    );

    expect(await screen.findByLabelText("Billing payroll week")).toHaveTextContent("2026-07-27");
    expect(screen.getByLabelText("Billing payroll tab")).toHaveTextContent("due");
    expect(screen.getByLabelText("Billing workspace dates")).toHaveTextContent("2026-07-01:2026-08-02");

    await user.click(screen.getByRole("button", { name: "Change payroll week" }));
    await user.click(screen.getByRole("button", { name: "Show saved payroll" }));
    await waitFor(() => {
      expect(screen.getByLabelText("Billing payroll week")).toHaveTextContent("2026-08-03");
      expect(screen.getByLabelText("Billing payroll tab")).toHaveTextContent("saved");
    });
    expect(screen.getByLabelText("Billing workspace dates")).toHaveTextContent("2026-07-01:2026-08-02");
    expect(screen.getByLabelText("Billing location")).toHaveTextContent(
      "payrollWeekStart=2026-08-03&payrollTab=saved",
    );
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

  it("normalizes agency mode once and gives the provider and child the same workspace context", async () => {
    renderWorkspace(
      "/super-admin/billing/financial-overview?agencyId=atlas&clientType=hha&startDate=2026-07-01&endDate=2026-07-31",
      <AgencyWorkspaceContextProbe />,
    );

    expect(await screen.findByLabelText("Context program mode")).toHaveTextContent("ddd");
    expect(screen.getByLabelText("Provider program mode")).toHaveTextContent("ddd");
    expect(screen.getByLabelText("Context date range")).toHaveTextContent("2026-07-01:2026-07-31");
    await waitFor(() => {
      const location = screen.getByLabelText("Billing location").textContent ?? "";
      expect(new URL(location, "https://careonboard.test").searchParams.get("clientType")).toBe("ddd");
    });
  });

  it("drives the production financial overview render and requests from workspace dates", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-08-03T12:00:00"));
    const user = userEvent.setup();
    billingApi.getClaimsDashboard.mockResolvedValue(claimsDashboard);
    billingApi.getPayrollDashboard.mockResolvedValue(payrollDashboard);
    billingApi.listBillingClaims.mockResolvedValue({ claims: [], total: 0 });
    billingApi.listPayrollInvoices.mockResolvedValue({ invoices: [], total: 0 });

    renderWorkspace(
      "/super-admin/billing/financial-overview?agencyId=atlas&clientType=ddd&startDate=2026-07-01&endDate=2026-07-31",
      <FinancialOverviewPage />,
    );

    const financialDateControl = await screen.findByRole("button", { name: "July 1 - July 31, 2026" });
    expect(financialDateControl).toBeVisible();
    await waitFor(() => expect(billingApi.getPayrollDashboard).toHaveBeenCalledWith(
      expect.objectContaining({
        context: { agencyId: "atlas" },
        query: { startDate: "2026-07-01", endDate: "2026-07-31", mode: "ddd" },
      }),
    ));
    expect(billingApi.listBillingClaims).toHaveBeenCalledWith(expect.objectContaining({
      query: expect.objectContaining({ startDate: "2026-07-01", endDate: "2026-07-31" }),
    }));
    expect(billingApi.listPayrollInvoices).toHaveBeenCalledWith(expect.objectContaining({
      query: expect.objectContaining({ startDate: "2026-07-01", endDate: "2026-07-31" }),
    }));

    const expectedRange = {
      startDate: "2026-07-27",
      endDate: "2026-08-03",
    };
    await user.click(financialDateControl);
    await user.click(screen.getByRole("button", { name: "Last 7 days" }));
    await user.click(screen.getByRole("button", { name: "Use this date range" }));

    expect(await screen.findByRole("button", { name: "July 27 - August 3, 2026" })).toBeVisible();
    await waitFor(() => expect(billingApi.getPayrollDashboard).toHaveBeenCalledWith(
      expect.objectContaining({
        context: { agencyId: "atlas" },
        query: { ...expectedRange, mode: "ddd" },
      }),
    ));
    const updatedSearch = new URL(
      screen.getByRole("link", { name: "Payroll" }).getAttribute("href") ?? "",
      "https://careonboard.test",
    ).searchParams;
    expect(updatedSearch.get("startDate")).toBe(expectedRange.startDate);
    expect(updatedSearch.get("endDate")).toBe(expectedRange.endDate);
  });

  it("remounts child selection state when a header control changes the normalized dataset", async () => {
    operationsApi.getOperationalAgencyContext.mockResolvedValue(dualAtlas);
    const user = userEvent.setup();
    renderWorkspace(
      "/super-admin/billing/financial-overview?agencyId=atlas&clientType=ddd&startDate=2026-07-01&endDate=2026-07-31&status=open&cursor=next&page=4",
      <DatasetResetProbe />,
    );

    const initialInstance = Number((await screen.findByLabelText("Dataset instance")).textContent);
    await user.type(screen.getByRole("textbox", { name: "Page selection" }), "selected-row");
    await user.selectOptions(screen.getByRole("combobox", { name: "Program mode" }), "hha");

    await waitFor(() => expect(screen.getByLabelText("Dataset mode")).toHaveTextContent("hha"));
    expect(Number(screen.getByLabelText("Dataset instance").textContent)).toBeGreaterThan(initialInstance);
    expect(screen.getByRole("textbox", { name: "Page selection" })).toHaveValue("");
    const payrollHref = screen.getByRole("link", { name: "Payroll" }).getAttribute("href") ?? "";
    const search = new URL(payrollHref, "https://careonboard.test").searchParams;
    expect(Object.fromEntries(search)).toMatchObject({
      agencyId: "atlas",
      clientType: "hha",
      startDate: "2026-07-01",
      endDate: "2026-07-31",
      status: "open",
    });
    expect(search.has("cursor")).toBe(false);
    expect(search.has("page")).toBe(false);
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
    expect(screen.queryByLabelText("Billing domain agency")).not.toBeInTheDocument();
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

    const header = screen.getByTestId("billing-skeleton-header");
    const headerLayout = screen.getByTestId("billing-skeleton-header-layout");
    const controls = screen.getByTestId("billing-skeleton-controls");
    expect(header).toHaveClass("rounded-2xl", "border-[#dce3e3]", "bg-[#f9fbfb]", "px-4", "py-4", "sm:px-5");
    expect(headerLayout).toHaveClass(
      "xl:grid-cols-[minmax(12rem,1fr)_minmax(0,48rem)]",
      "xl:items-end",
    );
    expect(controls).toHaveClass(
      "sm:grid-cols-2",
      "lg:grid-cols-[minmax(14rem,1fr)_minmax(17rem,1fr)_minmax(10rem,0.65fr)]",
    );
    expect(screen.getAllByTestId("billing-skeleton-control")).toHaveLength(3);
    for (const control of screen.getAllByTestId("billing-skeleton-control")) {
      expect(control.querySelector(".h-11")).not.toBeNull();
    }

    const nav = screen.getByTestId("billing-skeleton-nav");
    const kpis = screen.getByTestId("billing-skeleton-kpis");
    expect(nav.compareDocumentPosition(kpis) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
