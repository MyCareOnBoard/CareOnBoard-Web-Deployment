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
  searchOptions: vi.fn(),
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

vi.mock("@/lib/firebase", () => ({ app: {}, auth: {}, db: {} }));
vi.mock("@/utils/auth/store/authSlice", () => ({ default: (state = {}) => state }));
vi.mock("@/utils/auth/services/authService", () => ({}));
vi.mock("react-loader-spinner", () => ({ Oval: () => null }));
vi.mock("@/hooks/useStaffLabels", () => ({ useStaffLabels: () => ({ labels: { noun: "Staff" } }) }));
vi.mock("@/pages/agency/billing/claims/components/ClientNameLink", () => ({
  default: ({ name }: { name: string }) => <span>{name}</span>,
  ProviderFreeClientName: ({ name }: { name: string }) => <span>{name}</span>,
}));
vi.mock("react-redux", () => {
  const typedDispatch = Object.assign(() => dispatch, { withTypes: () => () => dispatch });
  const typedSelector = Object.assign(() => undefined, { withTypes: () => () => undefined });
  return { useDispatch: typedDispatch, useSelector: typedSelector };
});
vi.mock("@/lib/api/network-billing", () => ({
  NETWORK_BILLING_QUERY_OPTIONS: { refetchOnMountOrArgChange: 30 },
  networkBillingApi: {
    useGetClaimsBootstrapQuery: api.bootstrap,
    useLazyGetClaimsPageQuery: () => [api.loadPage, { isFetching: false }],
    useLazySearchBillingOptionsQuery: () => [api.searchOptions, api.options()],
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
vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  DropdownMenuContent: ({ children }: { children: ReactNode }) => <div role="menu">{children}</div>,
  DropdownMenuItem: ({ children, onClick, onSelect }: { children: ReactNode; onClick?: () => void; onSelect?: () => void }) => <button type="button" role="menuitem" onClick={onClick ?? onSelect}>{children}</button>,
}));
vi.mock("@/components/modals/DeleteConfirmationModal", () => ({
  DeleteConfirmationModal: ({ isOpen, onClose, onConfirm, isDeleting, title, message, confirmText, cancelText }: { isOpen: boolean; onClose: () => void; onConfirm: () => void; isDeleting?: boolean; title: string; message: string; confirmText: string; cancelText: string }) => isOpen ? <div role="dialog" aria-label={title}><p>{message}</p><button type="button" disabled={isDeleting} onClick={onClose}>{cancelText}</button><button type="button" disabled={isDeleting} onClick={onConfirm}>{confirmText}</button></div> : null,
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
  { id: "atlas-shift-4", agencyId: "atlas", agencyName: "Atlas Care", sourceType: "shift", sourceId: "shift-4", serviceCode: "T1005", needsClaim: true, needsInvoice: false, clientId: "client-1", clientName: "Ada", sortDate: "2026-07-04", weekRange: "Jul 1-7" },
  { id: "beacon-shift-1", agencyId: "beacon", agencyName: "Beacon Care", sourceType: "shift", sourceId: "shift-3", serviceCode: "S5125", needsClaim: true, needsInvoice: false, clientId: "client-1", clientName: "Ada", sortDate: "2026-07-03", weekRange: "Jul 1-7" },
];
const savedInvoiceRows: NetworkBillingClaimRow[] = [
  { id: "atlas-invoice-1", agencyId: "atlas", agencyName: "Atlas Care", kind: "invoice", invoiceNumber: "INV-ATLAS-1", amount: 125, status: "draft", emailStatus: "not_sent", clientId: "client-1", clientName: "Ada", payerName: "Ada payer", payerEmail: "payer@example.test", serviceCode: "S5125", serviceDate: "2026-07-03", shiftCount: 1, rideCount: 0, createdAt: "2026-07-03" },
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

async function openAtlasGenerateDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getAllByRole("button", { name: "Claim actions for Ada at Atlas Care for S5125 during Jul 1-7" })[0]!);
  await user.click(screen.getAllByRole("menuitem", { name: "Generate bills" })[1]!);
  return screen.getByRole("dialog");
}

describe("NetworkClaims", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.bootstrap.mockReturnValue(result());
    api.options.mockReturnValue({ data: [], isFetching: false });
    api.searchOptions.mockReturnValue({ abort: vi.fn(), unwrap: vi.fn().mockResolvedValue([]) });
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
    expect(api.searchOptions).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(300));
    expect(api.searchOptions).toHaveBeenCalledWith(expect.objectContaining({ q: "Ada", kind: "client" }));
    fireEvent.click(screen.getByRole("option", { name: /Ada.*Atlas Care/ }));
    expect(api.bootstrap).toHaveBeenLastCalledWith(expect.objectContaining({ tab: "ready", clientId: "client-1", clientAgencyId: "atlas" }), expect.any(Object));
  });

  it("aborts an in-flight authorized-client search before starting the superseding debounced request", () => {
    vi.useFakeTimers();
    const first = { abort: vi.fn(), unwrap: vi.fn().mockResolvedValue([]) };
    const second = { abort: vi.fn(), unwrap: vi.fn().mockResolvedValue([]) };
    api.searchOptions.mockReturnValueOnce(first).mockReturnValueOnce(second);
    renderClaims();

    fireEvent.change(screen.getByLabelText("Find a client"), { target: { value: "Ada" } });
    act(() => vi.advanceTimersByTime(300));
    fireEvent.change(screen.getByLabelText("Find a client"), { target: { value: "Bea" } });
    expect(first.abort).toHaveBeenCalledTimes(1);
    act(() => vi.advanceTimersByTime(300));
    expect(api.searchOptions).toHaveBeenLastCalledWith(expect.objectContaining({ q: "Bea" }));
  });

  it("loads saved data only after its tab becomes active and retains agency-separated ready groups", async () => {
    const user = userEvent.setup();
    renderClaims();

    expect(screen.getAllByText("Atlas Care").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Beacon Care").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: /Claim actions for Ada at / })).toHaveLength(6);
    expect(screen.getAllByRole("button", { name: "Claim actions for Ada at Atlas Care for S5125 during Jul 1-7" })).toHaveLength(2);
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

    const dialog = await openAtlasGenerateDialog(user);
    await user.click(within(dialog).getByRole("button", { name: "Generate bills" }));
    await waitFor(() => expect(claims.createBillingClaim).toHaveBeenCalledWith(expect.objectContaining({ context: { agencyId: "atlas" }, payload: expect.objectContaining({ shiftIds: expect.arrayContaining(["shift-1", "shift-2"]) }) })));
    expect(invoices.createOutOfPocketInvoice).toHaveBeenCalledWith(expect.objectContaining({ context: { agencyId: "atlas" }, payload: expect.objectContaining({ shiftIds: expect.arrayContaining(["shift-1", "shift-2"]) }) }));
    expect(api.invalidateTags).toHaveBeenCalledWith([{ type: "Claims", id: "NETWORK" }, { type: "NETWORK", id: "atlas" }]);
    expect(dispatch).toHaveBeenCalled();
  });

  it("keeps successful billing legs out of a partial-failure retry and prevents duplicate submits while pending", async () => {
    const user = userEvent.setup();
    let resolveInvoice: (() => void) | undefined;
    claims.createBillingClaim.mockResolvedValue({});
    invoices.createOutOfPocketInvoice.mockImplementation(() => new Promise<void>((resolve) => { resolveInvoice = resolve; }));
    renderClaims();

    const dialog = await openAtlasGenerateDialog(user);
    const submit = within(dialog).getByRole("button", { name: "Generate bills" });
    await user.click(submit);
    await user.click(submit);
    expect(claims.createBillingClaim).toHaveBeenCalledTimes(1);
    expect(invoices.createOutOfPocketInvoice).toHaveBeenCalledTimes(1);
    expect(submit).toBeDisabled();

    resolveInvoice?.();
    await waitFor(() => expect(screen.queryByRole("dialog", { name: /generate bills/i })).toBeNull());
  });

  it("retries only the failed billing leg after a partial generation failure", async () => {
    const user = userEvent.setup();
    claims.createBillingClaim.mockResolvedValue({});
    invoices.createOutOfPocketInvoice.mockRejectedValueOnce(new Error("invoice service unavailable")).mockResolvedValueOnce({});
    renderClaims();

    const dialog = await openAtlasGenerateDialog(user);
    await user.click(within(dialog).getByRole("button", { name: "Generate bills" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("The completed billing leg will not be repeated");
    await user.click(within(dialog).getByRole("button", { name: "Retry remaining bills" }));

    await waitFor(() => expect(screen.queryByRole("dialog", { name: /generate bills/i })).toBeNull());
    expect(claims.createBillingClaim).toHaveBeenCalledTimes(1);
    expect(invoices.createOutOfPocketInvoice).toHaveBeenCalledTimes(2);
  });

  it("keeps rendered rows and exposes an accessible retry after a load-more failure", async () => {
    const user = userEvent.setup();
    api.loadPage.mockReturnValue({ unwrap: vi.fn().mockRejectedValue(new Error("network unavailable")) });
    renderClaims();

    await user.click(screen.getByRole("button", { name: "Load more ready-to-bill items" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't load more ready-to-bill items");
    expect(screen.getAllByText("Atlas Care").some((element) => element.textContent === "Atlas Care")).toBe(true);
    expect(screen.getByRole("button", { name: "Retry loading more ready-to-bill items" })).toBeVisible();
  });

  it("uses the provider-free shared claims table variants with responsive cards, coverage, and row actions", () => {
    renderClaims();

    expect(screen.getAllByText("Coverage").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Payer / Insurance").length).toBeGreaterThan(0);
    expect(document.querySelector(".lg\\:hidden")).not.toBeNull();
  });

  it("renders fetched claim and invoice detail content instead of placeholder copy", () => {
    render(<><ClaimDetailBody loading={false} detail={{ id: "claim-1", claimNumber: "CLM-001", clientName: "Ada", serviceCode: "S5125", serviceDate: "2026-07-03", shiftIds: ["shift-1"], rideIds: [], status: "pending", amount: 50, clientId: "client-1", weekRange: "Jul 1-7", rejectionReason: null, reportPrefill: {} as import("@/lib/api/claims").BillingClaimDetail["reportPrefill"], createdAt: "2026-07-03", updatedAt: "2026-07-03", shifts: [] }} /><InvoiceDetailBody loading={false} detail={{ id: "invoice-1", invoiceNumber: "INV-001", clientName: "Ada", payerName: "Ada payer", payerEmail: "payer@example.test", status: "draft", emailStatus: "not_sent", amount: 15, clientId: "client-1", serviceCode: "S5125", serviceDate: "2026-07-03", shiftCount: 1, rideCount: 0, emailedTo: null, emailedAt: null, createdAt: "2026-07-03", shiftIds: ["shift-3"], rideIds: [], invoice: { payerName: "Ada payer", payerEmail: "payer@example.test", clientName: "Ada", agencyName: "Beacon Care", periodStart: "2026-07-01", periodEnd: "2026-07-07", lines: [{ description: "Support", quantity: "1", rate: "$15", amount: "$15" }], total: 15, totalLabel: "$15" } }} /></>);
    expect(screen.getByText("Service: S5125")).toBeVisible();
    expect(screen.getByText("Support · $15")).toBeVisible();
  });

  it("keeps the network saved status filter while hiding the agency client search", async () => {
    const user = userEvent.setup();
    api.bootstrap.mockReturnValue(result(savedInvoiceRows, null));
    renderClaims();

    await user.click(screen.getByRole("button", { name: "Claims & invoices" }));

    const statusFilter = screen.getByRole("combobox", { name: "Status" });
    expect(statusFilter).toBeVisible();
    expect(screen.queryByPlaceholderText("Search client name...")).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText("Search authorized clients")).toBeVisible();
    await user.selectOptions(statusFilter, "paid");
    expect(api.bootstrap).toHaveBeenLastCalledWith(expect.objectContaining({ tab: "saved", status: "paid" }), expect.any(Object));
  });

  it("confirms a saved invoice cancellation with its clicked agency, keeps it pending, and localizes failures", async () => {
    const user = userEvent.setup();
    let rejectCancellation: ((error: Error) => void) | undefined;
    invoices.cancelOutOfPocketInvoice.mockImplementationOnce(() => new Promise((_, reject) => {
      rejectCancellation = reject;
    })).mockResolvedValueOnce(undefined);
    api.bootstrap.mockReturnValue(result(savedInvoiceRows, null));
    renderClaims();

    await user.click(screen.getByRole("button", { name: "Claims & invoices" }));
    await user.click(screen.getAllByRole("button", { name: "Actions for invoice INV-ATLAS-1" })[0]!);
    await user.click(screen.getAllByRole("menuitem", { name: "Cancel invoice" })[0]!);
    const confirmation = screen.getByRole("dialog", { name: "Cancel this invoice?" });
    const confirm = within(confirmation).getByRole("button", { name: "Cancel invoice" });
    await user.click(confirm);

    expect(invoices.cancelOutOfPocketInvoice).toHaveBeenCalledWith({ context: { agencyId: "atlas" }, invoiceId: "atlas-invoice-1" });
    expect(confirm).toBeDisabled();
    rejectCancellation?.(new Error("Invoice is already locked"));
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't cancel invoice. Invoice is already locked");
    expect(api.invalidateTags).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "Cancel this invoice?" })).toBeVisible();

    await user.click(within(screen.getByRole("dialog", { name: "Cancel this invoice?" })).getByRole("button", { name: "Cancel invoice" }));
    await waitFor(() => expect(api.invalidateTags).toHaveBeenCalledWith([{ type: "Claims", id: "NETWORK" }, { type: "NETWORK", id: "atlas" }]));
    expect(screen.queryByRole("dialog", { name: "Cancel this invoice?" })).toBeNull();
  });
});
