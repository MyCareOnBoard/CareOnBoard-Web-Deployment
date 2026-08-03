import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BillingWorkspaceContextValue } from "../BillingWorkspaceContext";
import type { NetworkBillingClaimRow } from "../types";

const api = vi.hoisted(() => ({
  bootstrap: vi.fn(),
  page: vi.fn(),
  options: vi.fn(),
  loadPage: vi.fn(),
  invalidateTags: vi.fn((tags) => ({ type: "network/invalidate", payload: tags })),
}));
const dispatch = vi.hoisted(() => vi.fn());
const claims = vi.hoisted(() => ({
  cancelBillingClaim: vi.fn(),
  createBillingClaim: vi.fn(),
  getBillingClaimById: vi.fn(),
  updateBillingClaimStatus: vi.fn(),
}));
const invoices = vi.hoisted(() => ({
  cancelOutOfPocketInvoice: vi.fn(),
  createOutOfPocketInvoice: vi.fn(),
  getOutOfPocketInvoice: vi.fn(),
  sendOutOfPocketInvoice: vi.fn(),
}));
const agencyClaims = vi.hoisted(() => vi.fn());
const operationalProvider = vi.hoisted(() => vi.fn());

vi.mock("react-redux", () => ({ useDispatch: () => dispatch }));
vi.mock("@/lib/api/network-billing", () => ({
  NETWORK_BILLING_QUERY_OPTIONS: { refetchOnMountOrArgChange: 30 },
  networkBillingApi: {
    useGetClaimsBootstrapQuery: api.bootstrap,
    useLazyGetClaimsPageQuery: () => [api.loadPage, { isFetching: false }],
    useSearchBillingOptionsQuery: api.options,
    util: { invalidateTags: api.invalidateTags },
  },
}));
vi.mock("@/lib/api/claims", () => ({
  ...claims,
}));
vi.mock("@/lib/api/out-of-pocket", () => ({
  ...invoices,
}));
vi.mock("@/pages/agency/billing/claims", () => ({
  default: () => {
    agencyClaims();
    return <output aria-label="Agency claims">Agency claims</output>;
  },
}));
vi.mock("@/lib/operational-agency/OperationalAgencyProvider", () => ({
  OperationalAgencyProvider: (props: { children: ReactNode }) => {
    operationalProvider();
    return <>{props.children}</>;
  },
}));
vi.mock("@/pages/agency/billing/claims/components/ClaimsOverviewCards", () => ({
  default: ({ loading, stats }: { loading?: boolean; stats: Array<{ label: string; value: string }> }) => (
    <div aria-label="Claims overview" data-loading={String(Boolean(loading))}>{stats.map((stat) => <span key={stat.label}>{stat.value}</span>)}</div>
  ),
}));
vi.mock("@/pages/agency/billing/claims/components/ClaimsWorkspaceTabs", () => ({
  default: ({ activeTab, onTabChange }: { activeTab: string; onTabChange: (tab: "shifts" | "saved") => void }) => (
    <div>
      <button type="button" aria-pressed={activeTab === "shifts"} onClick={() => onTabChange("shifts")}>Ready to bill</button>
      <button type="button" aria-pressed={activeTab === "saved"} onClick={() => onTabChange("saved")}>Claims &amp; invoices</button>
    </div>
  ),
}));
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: { children: ReactNode; open: boolean }) => open ? <div role="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}));
vi.mock("@/pages/agency/billing/claims/components/UpdateClaimStatusModal", () => ({
  default: ({ open, onConfirm }: { open: boolean; onConfirm: (value: { status: "paid" }) => Promise<void> }) => open ? <button type="button" onClick={() => void onConfirm({ status: "paid" })}>Confirm status</button> : null,
}));
vi.mock("@/pages/agency/billing/claims/components/CancelClaimDialog", () => ({
  default: ({ open, onConfirm }: { open: boolean; onConfirm: () => Promise<void> }) => open ? <button type="button" onClick={() => void onConfirm()}>Confirm claim cancellation</button> : null,
}));

import SuperAdminBillingClaims from "../SuperAdminBillingClaims";
import { BillingWorkspaceProvider } from "../BillingWorkspaceContext";
import { ClaimDetailBody, InvoiceDetailBody } from "./NetworkClaims";

const summary = {
  overview: {
    submitted: { amount: 0, count: 0 }, pending: { amount: 50, count: 1 }, paid: { amount: 10, count: 1 }, rejected: { amount: 0, count: 0 }, atRisk: { amount: 0, count: 0 },
  },
  claimsByStatus: { total: 2, segments: [] },
  rejectionReasons: { total: 0, segments: [] },
  meta: { atRiskDays: 30, evaluatedAt: "2026-08-03T00:00:00.000Z" },
};

const readyRows: NetworkBillingClaimRow[] = [
  { id: "atlas-shift-1", agencyId: "atlas", agencyName: "Atlas Care", sourceType: "shift", sourceId: "shift-1", serviceCode: "S5125", needsClaim: true, needsInvoice: true, clientId: "client-1", clientName: "Ada", sortDate: "2026-07-02", weekRange: "Jul 1-7" },
  { id: "atlas-shift-2", agencyId: "atlas", agencyName: "Atlas Care", sourceType: "shift", sourceId: "shift-2", serviceCode: "S5125", needsClaim: true, needsInvoice: true, clientId: "client-1", clientName: "Ada", sortDate: "2026-07-03", weekRange: "Jul 1-7" },
  { id: "beacon-shift-1", agencyId: "beacon", agencyName: "Beacon Care", sourceType: "shift", sourceId: "shift-3", serviceCode: "S5125", needsClaim: true, needsInvoice: false, clientId: "client-1", clientName: "Ada", sortDate: "2026-07-03", weekRange: "Jul 1-7" },
];
function workspace(overrides: Partial<BillingWorkspaceContextValue> = {}): BillingWorkspaceContextValue {
  return {
    scope: { kind: "network" }, startDate: "2026-07-01", endDate: "2026-07-31", mode: "ddd", actorUid: "super-1", environment: "staging", onDateRangeChange: vi.fn(), ...overrides,
  };
}

function result(rows: NetworkBillingClaimRow[] = readyRows, nextCursor: string | null = "cursor-1") {
  return { data: { page: { rows, nextCursor, total: rows.length, hasMore: Boolean(nextCursor) }, summary }, isLoading: false, isFetching: false, isError: false, refetch: vi.fn() };
}

function renderClaims(value = workspace()) {
  return render(<BillingWorkspaceProvider value={value}><SuperAdminBillingClaims /></BillingWorkspaceProvider>);
}

describe("NetworkClaims", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.bootstrap.mockReturnValue(result());
    api.options.mockReturnValue({ data: [], isFetching: false });
    api.loadPage.mockReturnValue({ unwrap: vi.fn().mockResolvedValue({ page: { rows: [], nextCursor: null, total: 3, hasMore: false } }) });
    claims.getBillingClaimById.mockResolvedValue({ id: "claim-1", claimNumber: "CLM-001", clientName: "Ada", serviceCode: "S5125", serviceDate: "2026-07-03", shiftIds: ["shift-1"], rideIds: [], status: "pending", amount: 50, clientId: "client-1", weekRange: "Jul 1-7", rejectionReason: null, reportPrefill: {}, createdAt: "2026-07-03", updatedAt: "2026-07-03", shifts: [] });
    invoices.getOutOfPocketInvoice.mockResolvedValue({ id: "invoice-1", invoiceNumber: "INV-001", clientName: "Ada", payerName: "Ada payer", payerEmail: "payer@example.test", status: "draft", emailStatus: "not_sent", amount: 15, clientId: "client-1", serviceCode: "S5125", serviceDate: "2026-07-03", shiftCount: 1, rideCount: 0, emailedTo: null, emailedAt: null, createdAt: "2026-07-03", shiftIds: ["shift-3"], rideIds: [], invoice: { payerName: "Ada payer", payerEmail: "payer@example.test", clientName: "Ada", agencyName: "Beacon Care", periodStart: "2026-07-01", periodEnd: "2026-07-07", lines: [{ description: "Support", quantity: "1", rate: "$15", amount: "$15" }], total: 15, totalLabel: "$15" } });
    claims.createBillingClaim.mockResolvedValue({});
    invoices.createOutOfPocketInvoice.mockResolvedValue({});
    claims.updateBillingClaimStatus.mockResolvedValue(undefined);
    claims.cancelBillingClaim.mockResolvedValue(undefined);
    invoices.sendOutOfPocketInvoice.mockResolvedValue({});
    invoices.cancelOutOfPocketInvoice.mockResolvedValue(undefined);
  });

  afterEach(() => vi.useRealTimers());

  it("renders the network route provider-free and only demands the active ready tab", () => {
    renderClaims();

    expect(new Set(api.bootstrap.mock.calls.map(([args]) => JSON.stringify(args))).size).toBe(1);
    expect(api.bootstrap).toHaveBeenLastCalledWith(expect.objectContaining({ tab: "ready", scope: { kind: "network" }, mode: "ddd" }), expect.any(Object));
    expect(agencyClaims).not.toHaveBeenCalled();
    expect(operationalProvider).not.toHaveBeenCalled();
    expect(screen.getByRole("region", { name: "Network claims" })).toBeVisible();
  });

  it("debounces one exact authorized-client control request and applies a selected agency-qualified client", async () => {
    vi.useFakeTimers();
    api.options.mockReturnValue({ data: [{ id: "client-1", name: "Ada", agencyId: "atlas", agencyName: "Atlas Care", kind: "client" }], isFetching: false });
    renderClaims();

    fireEvent.change(screen.getByLabelText("Find a client"), { target: { value: "Ada" } });
    expect(api.options.mock.calls.filter(([args]) => args.q === "Ada")).toHaveLength(0);
    act(() => vi.advanceTimersByTime(300));
    expect(api.options.mock.calls.filter(([args]) => args.q === "Ada")).toHaveLength(1);
    fireEvent.click(screen.getByRole("option", { name: /Ada.*Atlas Care/ }));
    expect(api.bootstrap).toHaveBeenLastCalledWith(expect.objectContaining({ tab: "ready", clientId: "client-1", clientAgencyId: "atlas" }), expect.any(Object));
  });

  it("loads saved data only after its tab becomes active and retains agency-separated ready groups", async () => {
    const user = userEvent.setup();
    renderClaims();

    expect(screen.getAllByRole("rowgroup", { name: /ready billing group/i })).toHaveLength(2);
    await user.click(screen.getByRole("button", { name: "Claims & invoices" }));
    expect(api.bootstrap).toHaveBeenLastCalledWith(expect.objectContaining({ tab: "saved" }), expect.any(Object));
  });

  it("retries a failed cursor once and refuses a repeated successful cursor", async () => {
    const user = userEvent.setup();
    const retry = vi.fn()
      .mockRejectedValueOnce(new Error("temporary"))
      .mockResolvedValueOnce({ page: { rows: [], nextCursor: "cursor-1", total: 3, hasMore: true } });
    api.loadPage.mockImplementation(() => ({ unwrap: retry }));
    renderClaims();
    const button = screen.getByRole("button", { name: "Load more ready-to-bill items" });

    await user.click(button);
    await user.click(button);
    await waitFor(() => expect(retry).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole("button", { name: "Load more ready-to-bill items" })).toBeNull();
  });

  it("uses the grouped row agency for both billing legs and invalidates network plus singular agency tags", async () => {
    const user = userEvent.setup();
    renderClaims();

    await user.click(within(screen.getByRole("rowgroup", { name: /Atlas Care.*Ada/i })).getByRole("button", { name: "Generate bills" }));
    await user.click(screen.getAllByRole("button", { name: "Generate bills" }).at(-1)!);
    await waitFor(() => expect(claims.createBillingClaim).toHaveBeenCalledWith(expect.objectContaining({ context: { agencyId: "atlas" }, payload: expect.objectContaining({ shiftIds: ["shift-1", "shift-2"] }) })));
    expect(invoices.createOutOfPocketInvoice).toHaveBeenCalledWith(expect.objectContaining({ context: { agencyId: "atlas" }, payload: expect.objectContaining({ shiftIds: ["shift-1", "shift-2"] }) }));
    expect(api.invalidateTags).toHaveBeenCalledWith([{ type: "Claims", id: "NETWORK" }, { type: "NETWORK", id: "atlas" }]);
    expect(dispatch).toHaveBeenCalled();
  });

  it("renders fetched claim and invoice detail content instead of placeholder copy", () => {
    render(<><ClaimDetailBody loading={false} detail={{ id: "claim-1", claimNumber: "CLM-001", clientName: "Ada", serviceCode: "S5125", serviceDate: "2026-07-03", shiftIds: ["shift-1"], rideIds: [], status: "pending", amount: 50, clientId: "client-1", weekRange: "Jul 1-7", rejectionReason: null, reportPrefill: {}, createdAt: "2026-07-03", updatedAt: "2026-07-03", shifts: [] }} /><InvoiceDetailBody loading={false} detail={{ id: "invoice-1", invoiceNumber: "INV-001", clientName: "Ada", payerName: "Ada payer", payerEmail: "payer@example.test", status: "draft", emailStatus: "not_sent", amount: 15, clientId: "client-1", serviceCode: "S5125", serviceDate: "2026-07-03", shiftCount: 1, rideCount: 0, emailedTo: null, emailedAt: null, createdAt: "2026-07-03", shiftIds: ["shift-3"], rideIds: [], invoice: { payerName: "Ada payer", payerEmail: "payer@example.test", clientName: "Ada", agencyName: "Beacon Care", periodStart: "2026-07-01", periodEnd: "2026-07-07", lines: [{ description: "Support", quantity: "1", rate: "$15", amount: "$15" }], total: 15, totalLabel: "$15" } }} /></>);
    expect(screen.getByText("Service: S5125")).toBeVisible();
    expect(screen.getByText("Support · $15")).toBeVisible();
  });
});
