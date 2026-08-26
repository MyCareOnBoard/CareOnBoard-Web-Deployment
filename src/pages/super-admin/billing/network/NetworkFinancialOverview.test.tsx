import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import type { NetworkBillingOverview } from "../types";

const api = vi.hoisted(() => ({
  overview: vi.fn(),
  refetch: vi.fn(),
  prepare: vi.fn(),
}));
const agencyOverview = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api/network-billing", () => ({
  NETWORK_BILLING_QUERY_OPTIONS: { refetchOnMountOrArgChange: 30 },
  networkBillingApi: {
    useGetOverviewBootstrapQuery: api.overview,
    usePrepareNetworkBillingMutation: () => [api.prepare, { isLoading: false }],
  },
}));
vi.mock("@/pages/agency/billing/financial-overview", () => ({
  default: () => {
    agencyOverview();
    return <output aria-label="Agency financial overview">Agency overview</output>;
  },
}));

import NetworkFinancialOverview from "./NetworkFinancialOverview";
import SuperAdminBillingFinancialOverview from "../SuperAdminBillingFinancialOverview";
import { BillingWorkspaceProvider, type BillingWorkspaceContextValue } from "../BillingWorkspaceContext";

const overview: NetworkBillingOverview = {
  scope: { kind: "global", agencyCount: 2 },
  periods: {
    current: { start: "2026-07-01", end: "2026-07-31" },
    previous: { start: "2026-06-01", end: "2026-06-30" },
  },
  current: {
    claims: { count: 8, amount: 1200 },
    payroll: { count: 4, amount: 420 },
    expenses: { count: 2, amount: 80 },
  },
  previous: {
    claims: { count: 4, amount: 800 },
    payroll: { count: 2, amount: 300 },
    expenses: { count: 1, amount: 50 },
  },
  recentActivity: [{
    id: "activity-1",
    agencyId: "atlas",
    agencyName: "Atlas Care",
    kind: "claim",
    amount: 1200,
    status: "paid",
    date: "2026-07-30T12:00:00.000Z",
  }],
  meta: { totalsExact: true, branchCount: 2 },
};

function workspace(
  overrides: Partial<BillingWorkspaceContextValue> = {},
): BillingWorkspaceContextValue {
  return {
    scope: { kind: "network" },
    startDate: "2026-07-01",
    endDate: "2026-07-31",
    mode: "ddd",
    actorUid: "super-1",
    environment: "staging",
    onDateRangeChange: vi.fn(),
    ...overrides,
  };
}

function renderWithWorkspace(children: ReactNode, value = workspace()) {
  return render(<BillingWorkspaceProvider value={value}>{children}</BillingWorkspaceProvider>);
}

function queryResult(overrides: Record<string, unknown> = {}) {
  return {
    data: overview,
    isLoading: false,
    isFetching: false,
    isError: false,
    refetch: api.refetch,
    ...overrides,
  };
}

describe("NetworkFinancialOverview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.overview.mockReturnValue(queryResult());
  });

  it("issues one network overview bootstrap request without mounting an agency domain page", () => {
    renderWithWorkspace(<NetworkFinancialOverview />);

    expect(api.overview).toHaveBeenCalledTimes(1);
    expect(api.overview).toHaveBeenCalledWith({
      actorUid: "super-1",
      environment: "staging",
      scope: { kind: "network" },
      startDate: "2026-07-01",
      endDate: "2026-07-31",
      mode: "ddd",
      tab: "overview",
    }, expect.any(Object));
    expect(agencyOverview).not.toHaveBeenCalled();
    expect(screen.getByText("$1,200.00")).toBeVisible();
  });

  it("uses the shared overview structure for an initial skeleton", () => {
    api.overview.mockReturnValue(queryResult({ data: undefined, isLoading: true }));
    renderWithWorkspace(<NetworkFinancialOverview />);

    expect(screen.getByRole("region", { name: "Network financial overview" })).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("Overview")).toBeVisible();
    expect(screen.getByText("Claims by status")).toBeVisible();
    expect(screen.getByText("Payroll summary")).toBeVisible();
    expect(screen.getByText("Recent activity")).toBeVisible();
  });

  it("localizes partial failures and retries the affected domain without clearing working data", async () => {
    const user = userEvent.setup();
    api.overview.mockReturnValue(queryResult({
      data: {
        ...overview,
        current: { ...overview.current, claims: null },
        partialErrors: {
          "current.claims": "Claims are temporarily unavailable.",
          "previous.claims": "The prior claim period is temporarily unavailable.",
        },
      },
    }));
    renderWithWorkspace(<NetworkFinancialOverview />);

    expect(screen.getByRole("alert")).toHaveTextContent("Claims are temporarily unavailable.");
    expect(screen.getByRole("alert")).toHaveTextContent("The prior claim period is temporarily unavailable.");
    expect(screen.getByText("$420.00")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Retry claims data" }));
    expect(api.refetch).toHaveBeenCalledTimes(1);
  });

  it("shows a recoverable error when the overview bootstrap fails before any data arrives", async () => {
    const user = userEvent.setup();
    api.overview.mockReturnValue(queryResult({
      data: undefined,
      isError: true,
      error: { status: 503 },
    }));
    renderWithWorkspace(<NetworkFinancialOverview />);

    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't load network financial overview");
    await user.click(screen.getByRole("button", { name: "Retry network financial overview" }));
    expect(api.refetch).toHaveBeenCalledTimes(1);
  });

  it("keeps the overview skeleton visible instead of fabricated zero totals while a data-less retry is fetching", () => {
    api.overview.mockReturnValue(queryResult({
      data: undefined,
      isLoading: false,
      isFetching: true,
    }));
    renderWithWorkspace(<NetworkFinancialOverview />);

    expect(screen.getByRole("region", { name: "Network financial overview" })).toHaveAttribute("aria-busy", "true");
    expect(screen.queryAllByText("$0.00")).toHaveLength(0);
  });

  it("offers preparation only when the overview reports the network index readiness error", () => {
    api.overview.mockReturnValue(queryResult({
      data: undefined,
      isError: true,
      error: { status: 503, data: { code: "NETWORK_BILLING_INDEX_NOT_READY" } },
    }));
    renderWithWorkspace(<NetworkFinancialOverview />);

    expect(screen.getByRole("button", { name: "Prepare network billing" })).toBeVisible();
  });

  it("closes the dialog after preparation is ready", async () => {
    const user = userEvent.setup();
    api.overview.mockReturnValue(queryResult({
      data: undefined,
      isError: true,
      error: { status: 503, data: { code: "NETWORK_BILLING_INDEX_NOT_READY" } },
    }));
    api.prepare.mockReturnValue({
      unwrap: () => Promise.resolve({ ready: true, ownership: { deletedRecords: [] } }),
    });
    renderWithWorkspace(<NetworkFinancialOverview />);

    await user.click(screen.getByRole("button", { name: "Prepare network billing" }));
    await user.click(screen.getByRole("button", { name: "Prepare billing now" }));

    await waitFor(() => expect(api.prepare).toHaveBeenCalledWith({
      actorUid: "super-1",
      environment: "staging",
      scope: { kind: "network" },
    }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("keeps the dialog open when preparation is incomplete", async () => {
    const user = userEvent.setup();
    api.overview.mockReturnValue(queryResult({
      data: undefined,
      isError: true,
      error: { status: 503, data: { code: "NETWORK_BILLING_INDEX_NOT_READY" } },
    }));
    api.prepare.mockReturnValue({
      unwrap: () => Promise.resolve({ ready: false, ownership: { deletedRecords: [] } }),
    });
    renderWithWorkspace(<NetworkFinancialOverview />);

    await user.click(screen.getByRole("button", { name: "Prepare network billing" }));
    await user.click(screen.getByRole("button", { name: "Prepare billing now" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("some billing records still need attention");
    expect(screen.getByRole("alertdialog")).toBeVisible();
  });

  it("keeps successful rows and metrics visible while the overview refreshes", () => {
    api.overview.mockReturnValue(queryResult({ isFetching: true }));
    renderWithWorkspace(<NetworkFinancialOverview />);

    expect(screen.getByText("$1,200.00")).toBeVisible();
    expect(screen.getAllByText("Atlas Care").length).toBeGreaterThan(0);
    expect(screen.getByRole("region", { name: "Network financial overview" })).toHaveAttribute("aria-busy", "true");
  });

  it("renders network activity with its owning agency", () => {
    renderWithWorkspace(<NetworkFinancialOverview />);

    expect(screen.getAllByText("Agency").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Atlas Care").length).toBeGreaterThan(0);
  });

  it("uses the existing agency overview in a singular agency scope", () => {
    renderWithWorkspace(
      <SuperAdminBillingFinancialOverview />,
      workspace({ scope: { kind: "agency", agencyId: "atlas" } }),
    );

    expect(screen.getByLabelText("Agency financial overview")).toBeVisible();
    expect(agencyOverview).toHaveBeenCalledTimes(1);
    expect(api.overview).not.toHaveBeenCalled();
  });
});
