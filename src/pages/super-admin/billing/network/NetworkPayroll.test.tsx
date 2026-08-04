import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { BillingWorkspaceProvider, type BillingWorkspaceContextValue } from "../BillingWorkspaceContext";
import type { NetworkBillingPayrollRow } from "../types";

const api = vi.hoisted(() => ({ bootstrap: vi.fn(), options: vi.fn(), search: vi.fn(), page: vi.fn(), invalidate: vi.fn() }));
const payroll = vi.hoisted(() => ({ createPayrollInvoice: vi.fn(), getPayrollInvoiceById: vi.fn(), markPayrollInvoicePaid: vi.fn(), cancelPayrollInvoice: vi.fn() }));
vi.mock("@/lib/firebase", () => ({ app: {}, auth: {}, db: {} }));
vi.mock("@/utils/auth/store/authSlice", () => ({ default: (state = {}) => state }));
vi.mock("@/utils/auth/services/authService", () => ({}));
vi.mock("react-redux", () => ({ useDispatch: () => vi.fn() }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/components/ui/button", () => ({ Button: (p: ButtonHTMLAttributes<HTMLButtonElement>) => <button {...p} /> }));
vi.mock("@/components/ui/dialog", () => ({ Dialog: ({ open, children }: { open: boolean; children: ReactNode }) => open ? <div role="dialog">{children}</div> : null, DialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>, DialogDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>, DialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>, DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>, DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2> }));
vi.mock("@/components/modals/DeleteConfirmationModal", () => ({ DeleteConfirmationModal: ({ isOpen, title, onConfirm }: { isOpen: boolean; title: string; onConfirm: () => void }) => isOpen ? <div role="dialog" aria-label={title}><button onClick={onConfirm}>Confirm {title}</button></div> : null }));
vi.mock("@/lib/api/payroll", () => ({ ...payroll }));
vi.mock("@/lib/api/network-billing", () => ({ NETWORK_BILLING_QUERY_OPTIONS: {}, networkBillingApi: { useGetPayrollBootstrapQuery: api.bootstrap, useLazyGetPayrollPageQuery: () => [api.page, { isFetching: false }], useLazySearchBillingOptionsQuery: () => [api.search, api.options()], util: { invalidateTags: api.invalidate } } }));
vi.mock("@/pages/agency/billing/payroll/components/PayrollOverviewCards", () => ({ default: ({ stats }: { stats: Array<{ label: string; value: string }> }) => <div aria-label="Payroll overview">{stats.map((stat) => <span key={stat.label}>{stat.label}: {stat.value}</span>)}</div> }));
vi.mock("@/pages/agency/billing/payroll/components/PayrollSummaryChart", () => ({ default: () => <div aria-label="Payroll summary chart" /> }));
vi.mock("@/pages/agency/billing/payroll/components/TopOvertimeAlerts", () => ({ default: () => <div aria-label="Top overtime alerts" /> }));
vi.mock("@/pages/agency/billing/payroll/components/PayrollWorkspaceTabs", () => ({ default: ({ onTabChange }: { onTabChange: (value: "staff" | "generated") => void }) => <><button onClick={() => onTabChange("staff")}>Due</button><button onClick={() => onTabChange("generated")}>Saved</button></> }));
vi.mock("@/pages/agency/billing/payroll/components/DuePayrollTable", () => ({ default: ({ entries, onCreateInvoiceClick }: { entries: Array<{ id: string; staffName: string; agencyName: string }>; onCreateInvoiceClick: (entry: unknown) => void }) => <div>{entries.map((entry) => <div key={`${entry.agencyName}:${entry.staffName}`}><span>{entry.staffName}</span><button onClick={() => onCreateInvoiceClick(entry)}>Create invoice for {entry.staffName}</button></div>)}</div> }));
vi.mock("@/pages/agency/billing/payroll/components/SavedPayrollTable", () => ({ default: ({ invoices, onViewInvoice, onMarkPaid, onCancel }: { invoices: Array<{ id: string; employeeName: string }>; onViewInvoice: (invoice: unknown) => void; onMarkPaid: (invoice: unknown) => void; onCancel: (invoice: unknown) => void }) => <div>{invoices.map((invoice) => <div key={invoice.id}><span>{invoice.employeeName}</span><button onClick={() => onViewInvoice(invoice)}>View invoice</button><button onClick={() => onMarkPaid(invoice)}>Mark paid</button><button onClick={() => onCancel(invoice)}>Cancel invoice</button></div>)}</div> }));
vi.mock("@/pages/agency/billing/payroll/components/MarkPayrollInvoicePaidDialog", () => ({ default: ({ open, onConfirm }: { open: boolean; onConfirm: () => void }) => open ? <button onClick={onConfirm}>Confirm mark paid</button> : null }));
vi.mock("@/pages/agency/billing/payroll/utils/buildPayrollInvoiceDocument", () => ({ buildPayrollInvoiceDocument: () => null }));
import NetworkPayroll from "./NetworkPayroll";

const rows: NetworkBillingPayrollRow[] = [{ id: "due-1", agencyId: "atlas", agencyName: "Atlas Care", staffKey: "atlas:staff-1", staffName: "Avery Nurse", employeeId: "staff-1", sourceType: "shift", sourceId: "shift-1", totalsExact: true, grossAmount: 100, totalHours: 42, mode: "ddd" }];
const workspace: BillingWorkspaceContextValue = { scope: { kind: "network" }, startDate: "2026-07-01", endDate: "2026-07-31", mode: "ddd", actorUid: "super-1", environment: "staging", onDateRangeChange: vi.fn() };

function UrlBackedNetworkPayroll() {
  const [payrollTab, setPayrollTab] = useState<"due" | "saved">("due");
  return <><output aria-label="Workspace payroll tab">{payrollTab}</output><BillingWorkspaceProvider value={{ ...workspace, payrollTab, onPayrollTabChange: setPayrollTab }}><NetworkPayroll /></BillingWorkspaceProvider></>;
}

function dueSummary(overrides: Record<string, unknown> = {}) {
  return {
    overview: {
      totalDue: { amount: 350, count: 3, exact: false },
      staffCount: { count: 3 },
      pendingHours: { hours: 16 },
      overtimeHours: { hours: 2 },
      missingTimesheets: { count: 1 },
    },
    coverage: { expectedAgencyCount: 2, readyAgencyCount: 1, pendingAgencyCount: 0, staleAgencyCount: 1, failedAgencyCount: 0 },
    freshness: { oldestComputedAt: "2026-08-02T00:00:00.000Z", newestComputedAt: "2026-08-03T00:00:00.000Z" },
    meta: { evaluatedAt: "2026-08-03T00:00:00.000Z", calculationVersion: 1, totalsExact: false },
    ...overrides,
  };
}

describe("NetworkPayroll", () => {
  it.each([
    ["exact", dueSummary({ overview: { totalDue: { amount: 350, count: 3, exact: true }, staffCount: { count: 3 }, pendingHours: { hours: 16 }, overtimeHours: { hours: 2 }, missingTimesheets: { count: 1 } }, coverage: { expectedAgencyCount: 2, readyAgencyCount: 2, pendingAgencyCount: 0, staleAgencyCount: 0, failedAgencyCount: 0 }, meta: { evaluatedAt: "2026-08-03T00:00:00.000Z", calculationVersion: 1, totalsExact: true } }), "Payroll rollup is exact"],
    ["pending", dueSummary({ coverage: { expectedAgencyCount: 2, readyAgencyCount: 1, pendingAgencyCount: 1, staleAgencyCount: 0, failedAgencyCount: 0 } }), "Awaiting updated status"],
    ["partial", dueSummary({ coverage: { expectedAgencyCount: 3, readyAgencyCount: 1, pendingAgencyCount: 1, staleAgencyCount: 1, failedAgencyCount: 0 } }), "1 of 3 agencies"],
    ["stale", dueSummary({ coverage: { expectedAgencyCount: 2, readyAgencyCount: 1, pendingAgencyCount: 0, staleAgencyCount: 1, failedAgencyCount: 0 } }), "The oldest successful calculation is from"],
    ["failed", dueSummary({ coverage: { expectedAgencyCount: 2, readyAgencyCount: 1, pendingAgencyCount: 0, staleAgencyCount: 0, failedAgencyCount: 1 } }), "Check again"],
    ["unavailable", dueSummary({ overview: { totalDue: { amount: null, count: 0, exact: false }, staffCount: { count: 3 }, pendingHours: { hours: 16 }, overtimeHours: { hours: 2 }, missingTimesheets: { count: 1 } }, coverage: { expectedAgencyCount: 2, readyAgencyCount: 0, pendingAgencyCount: 2, staleAgencyCount: 0, failedAgencyCount: 0 }, freshness: { oldestComputedAt: null, newestComputedAt: null } }), "No payroll rollup"],
  ])("renders the %s aggregate state from the rollup", (_state, summary, expected) => {
    api.options.mockReturnValue({ data: [] });
    api.bootstrap.mockReturnValue({ data: { page: { rows, loadedCount: 99, nextCursor: null, total: 1, hasMore: false }, summary }, isLoading: false, isFetching: false, refetch: vi.fn() });
    api.search.mockReturnValue({ unwrap: vi.fn().mockResolvedValue([]), abort: vi.fn() });

    render(<UrlBackedNetworkPayroll />);

    expect(screen.getByLabelText("Network payroll aggregate status")).toHaveTextContent(expected);
    expect(screen.getByLabelText("Payroll overview")).toHaveTextContent("Staff count: 3");
    expect(screen.queryByText("Staff count: 99")).toBeNull();
  });

  it("fails closed rather than normalizing an impossible aggregate freshness timestamp", () => {
    api.options.mockReturnValue({ data: [] });
    api.bootstrap.mockReturnValue({ data: { page: { rows, nextCursor: null, total: 1, hasMore: false }, summary: dueSummary({ freshness: { oldestComputedAt: "2026-02-30T00:00:00.000Z", newestComputedAt: "2026-08-03T00:00:00.000Z" } }) }, isLoading: false, isFetching: false, refetch: vi.fn() });
    api.search.mockReturnValue({ unwrap: vi.fn().mockResolvedValue([]), abort: vi.fn() });

    render(<UrlBackedNetworkPayroll />);

    expect(screen.getByLabelText("Network payroll aggregate status")).toHaveTextContent("The oldest successful calculation is from Unknown calculation time.");
  });

  it("uses the authorized staff name projected by the payroll page without issuing label lookups", () => {
    const labeledRows = [{ ...rows[0], staffKey: "atlas:staff-1", staffName: "Avery Nurse" }] as unknown as NetworkBillingPayrollRow[];
    api.options.mockReturnValue({ data: [] });
    api.bootstrap.mockReturnValue({ data: { page: { rows: labeledRows, nextCursor: null, total: 1, hasMore: false }, summary: { overview: { totalDue: { amount: null, count: 1, exact: false } }, meta: { evaluatedAt: "2026-08-03", totalsExact: false } } }, isLoading: false, isFetching: false });
    api.search.mockReturnValue({ unwrap: vi.fn().mockResolvedValue([]), abort: vi.fn() });
    render(<BillingWorkspaceProvider value={workspace}><NetworkPayroll /></BillingWorkspaceProvider>);
    expect(screen.getByText("Avery Nurse")).toBeVisible();
    expect(screen.queryByText("atlas:staff-1")).toBeNull();
    expect(api.search).not.toHaveBeenCalled();
  });

  it("updates the provider-backed workspace tab and bootstrap range when Saved is selected", async () => {
    api.options.mockReturnValue({ data: [{ id: "staff-1", name: "Avery Nurse", agencyId: "atlas", agencyName: "Atlas Care", kind: "staff" }] });
    api.bootstrap.mockReturnValue({ data: { page: { rows, nextCursor: null, total: 1, hasMore: false }, summary: { overview: { totalDue: { amount: 100, count: 1, exact: true } }, meta: { evaluatedAt: "2026-08-03", totalsExact: true } } }, isLoading: false, isFetching: false });
    api.search.mockReturnValue({ unwrap: vi.fn().mockResolvedValue([]), abort: vi.fn() });
    render(<UrlBackedNetworkPayroll />);
    expect(screen.getByRole("region", { name: "Network payroll" })).toBeVisible();
    expect(screen.getByLabelText("Network payroll aggregate status")).toBeVisible();
    expect(screen.queryByLabelText("Payroll summary chart")).toBeNull();
    expect(screen.queryByLabelText("Top overtime alerts")).toBeNull();
    expect(screen.getByRole("option", { name: /Avery Nurse/ })).toBeVisible();
    expect(screen.queryByText("atlas:staff-1")).toBeNull();
    expect(api.bootstrap).toHaveBeenLastCalledWith(expect.objectContaining({ tab: "due", startDate: "2026-07-27", endDate: "2026-08-02", scope: { kind: "network" } }), expect.anything());
    fireEvent.click(screen.getByRole("button", { name: "Saved" }));
    await waitFor(() => {
      expect(screen.getByLabelText("Workspace payroll tab")).toHaveTextContent("saved");
      expect(api.bootstrap).toHaveBeenLastCalledWith(expect.objectContaining({ tab: "saved", startDate: "2026-07-01", endDate: "2026-07-31", scope: { kind: "network" } }), expect.anything());
    });
  });

  it("debounces and aborts authorized staff search without mounting an agency provider", () => {
    vi.useFakeTimers();
    api.options.mockReturnValue({ data: [] });
    api.bootstrap.mockReturnValue({ data: { page: { rows: [], nextCursor: null, total: 0, hasMore: false }, summary: { overview: { totalDue: { amount: 0, count: 0, exact: true } }, meta: { evaluatedAt: "", totalsExact: true } } }, isLoading: false, isFetching: false });
    const first = { unwrap: vi.fn().mockResolvedValue([]), abort: vi.fn() };
    api.search.mockReturnValue(first);
    render(<BillingWorkspaceProvider value={workspace}><NetworkPayroll /></BillingWorkspaceProvider>);
    fireEvent.change(screen.getByLabelText("Find a staff member"), { target: { value: "Avery" } });
    act(() => vi.advanceTimersByTime(300));
    expect(api.search).toHaveBeenCalledWith(expect.objectContaining({ q: "Avery", kind: "staff", scope: { kind: "network" } }));
    fireEvent.change(screen.getByLabelText("Find a staff member"), { target: { value: "Bea" } });
    expect(first.abort).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("binds every payroll invoice action to the row agency and invalidates network data", async () => {
    const savedRows = [{ id: "invoice-1", agencyId: "beacon", agencyName: "Beacon Supports", staffKey: "beacon:staff-2", employeeId: "staff-2", employeeName: "Blair Support", kind: "payrollInvoice" as const, grossAmount: 80, totalHours: 4, mode: "ddd" as const, invoiceNumber: "PAY-1", status: "pending" as const }];
    api.options.mockReturnValue({ data: [] });
    api.bootstrap.mockImplementation((args: { tab: string }) => ({ data: args.tab === "saved"
      ? { page: { rows: savedRows, nextCursor: null, total: 1, hasMore: false }, summary: { overview: { savedInvoices: { count: 1, exact: true } }, meta: { evaluatedAt: "2026-08-03", totalsExact: true } } }
      : { page: { rows, nextCursor: null, total: 1, hasMore: false }, summary: { overview: { totalDue: { amount: null, count: 1, exact: false } }, meta: { evaluatedAt: "2026-08-03", totalsExact: false } } }, isLoading: false, isFetching: false }));
    api.search.mockReturnValue({ unwrap: vi.fn().mockResolvedValue([]), abort: vi.fn() });
    payroll.createPayrollInvoice.mockResolvedValue({ id: "created-1", grossAmount: 100, totalHours: 2, invoiceNumber: "PAY-NEW", status: "pending", employeeName: "Avery Nurse", periodStart: "2026-07-01", periodEnd: "2026-07-31", shiftIds: ["shift-1"] });
    payroll.getPayrollInvoiceById.mockResolvedValue({ id: "invoice-1" });
    payroll.markPayrollInvoicePaid.mockResolvedValue(undefined);
    payroll.cancelPayrollInvoice.mockResolvedValue(undefined);
    render(<BillingWorkspaceProvider value={workspace}><NetworkPayroll /></BillingWorkspaceProvider>);

    fireEvent.click(screen.getByRole("button", { name: "Create invoice for Avery Nurse" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm Create payroll invoice?" }));
    await waitFor(() => expect(payroll.createPayrollInvoice).toHaveBeenCalledWith(expect.objectContaining({ context: { agencyId: "atlas" } })));

    fireEvent.click(screen.getByRole("button", { name: "Saved" }));
    fireEvent.click(await screen.findByRole("button", { name: "View invoice" }));
    await waitFor(() => expect(payroll.getPayrollInvoiceById).toHaveBeenCalledWith({ context: { agencyId: "beacon" }, invoiceId: "invoice-1" }));
    fireEvent.click(screen.getByRole("button", { name: "Mark paid" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm mark paid" }));
    await waitFor(() => expect(payroll.markPayrollInvoicePaid).toHaveBeenCalledWith({ context: { agencyId: "beacon" }, invoiceId: "invoice-1" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel invoice" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm Cancel this payroll invoice?" }));
    await waitFor(() => expect(payroll.cancelPayrollInvoice).toHaveBeenCalledWith({ context: { agencyId: "beacon" }, invoiceId: "invoice-1" }));
    expect(api.invalidate).toHaveBeenCalledWith(expect.arrayContaining([{ type: "Payroll", id: "NETWORK" }, { type: "NETWORK", id: "atlas" }]));
    expect(api.invalidate).toHaveBeenCalledWith(expect.arrayContaining([{ type: "Payroll", id: "NETWORK" }, { type: "NETWORK", id: "beacon" }]));
  });
});
