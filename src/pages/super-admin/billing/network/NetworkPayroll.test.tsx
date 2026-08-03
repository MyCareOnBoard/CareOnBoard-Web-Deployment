import { act, fireEvent, render, screen } from "@testing-library/react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
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
vi.mock("@/components/modals/DeleteConfirmationModal", () => ({ DeleteConfirmationModal: ({ isOpen, title }: { isOpen: boolean; title: string }) => isOpen ? <div role="dialog" aria-label={title} /> : null }));
vi.mock("@/lib/api/payroll", () => ({ ...payroll }));
vi.mock("@/lib/api/network-billing", () => ({ NETWORK_BILLING_QUERY_OPTIONS: {}, networkBillingApi: { useGetPayrollBootstrapQuery: api.bootstrap, useLazyGetPayrollPageQuery: () => [api.page, { isFetching: false }], useLazySearchBillingOptionsQuery: () => [api.search, api.options()], util: { invalidateTags: api.invalidate } } }));
vi.mock("@/pages/agency/billing/payroll/components/PayrollOverviewCards", () => ({ default: ({ stats }: { stats: Array<{ label: string }> }) => <div aria-label="Payroll overview">{stats.map((stat) => <span key={stat.label}>{stat.label}</span>)}</div> }));
vi.mock("@/pages/agency/billing/payroll/components/PayrollSummaryChart", () => ({ default: () => <div aria-label="Payroll summary chart" /> }));
vi.mock("@/pages/agency/billing/payroll/components/TopOvertimeAlerts", () => ({ default: () => <div aria-label="Top overtime alerts" /> }));
vi.mock("@/pages/agency/billing/payroll/components/PayrollWorkspaceTabs", () => ({ default: ({ onTabChange }: { onTabChange: (value: "staff" | "generated") => void }) => <><button onClick={() => onTabChange("staff")}>Due</button><button onClick={() => onTabChange("generated")}>Saved</button></> }));
vi.mock("@/pages/agency/billing/payroll/components/DuePayrollTable", () => ({ default: ({ entries }: { entries: Array<{ staffName: string; agencyName: string }> }) => <div>{entries.map((entry) => <span key={`${entry.agencyName}:${entry.staffName}`}>{entry.staffName}</span>)}</div> }));
vi.mock("@/pages/agency/billing/payroll/components/SavedPayrollTable", () => ({ default: () => <div>Saved payroll table</div> }));
vi.mock("@/pages/agency/billing/payroll/components/MarkPayrollInvoicePaidDialog", () => ({ default: () => null }));
vi.mock("@/pages/agency/billing/payroll/utils/buildPayrollInvoiceDocument", () => ({ buildPayrollInvoiceDocument: () => null }));
import NetworkPayroll from "./NetworkPayroll";

const rows: NetworkBillingPayrollRow[] = [{ id: "due-1", agencyId: "atlas", agencyName: "Atlas Care", staffKey: "opaque-staff-key", sourceType: "shift", sourceId: "shift-1", totalsExact: true, grossAmount: 100, totalHours: 42, mode: "ddd" }];
const workspace: BillingWorkspaceContextValue = { scope: { kind: "network" }, startDate: "2026-07-01", endDate: "2026-07-31", mode: "ddd", actorUid: "super-1", environment: "staging", onDateRangeChange: vi.fn() };

describe("NetworkPayroll", () => {
  it("renders provider-free due and saved demand tabs, using authorized staff labels rather than opaque row keys", () => {
    api.options.mockReturnValue({ data: [{ id: "opaque-staff-key", name: "Avery Nurse", agencyId: "atlas", agencyName: "Atlas Care", kind: "staff" }] });
    api.bootstrap.mockReturnValue({ data: { page: { rows, nextCursor: null, total: 1, hasMore: false }, summary: { overview: { totalDue: { amount: 100, count: 1, exact: true } }, meta: { evaluatedAt: "2026-08-03", totalsExact: true } } }, isLoading: false, isFetching: false });
    api.search.mockReturnValue({ unwrap: vi.fn().mockResolvedValue([]), abort: vi.fn() });
    render(<BillingWorkspaceProvider value={workspace}><NetworkPayroll /></BillingWorkspaceProvider>);
    expect(screen.getByRole("region", { name: "Network payroll" })).toBeVisible();
    expect(screen.getByLabelText("Payroll summary chart")).toBeVisible();
    expect(screen.getByLabelText("Top overtime alerts")).toBeVisible();
    expect(screen.getByText("Avery Nurse")).toBeVisible();
    expect(screen.queryByText("opaque-staff-key")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Saved" }));
    expect(api.bootstrap).toHaveBeenLastCalledWith(expect.objectContaining({ tab: "saved", scope: { kind: "network" } }), expect.anything());
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
});
