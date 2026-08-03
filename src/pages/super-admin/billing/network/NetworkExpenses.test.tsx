import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { BillingWorkspaceProvider, type BillingWorkspaceContextValue } from "../BillingWorkspaceContext";

const api = vi.hoisted(() => ({ bootstrap: vi.fn(), page: vi.fn(), invalidate: vi.fn() }));
const expensesApi = vi.hoisted(() => ({ approve: vi.fn(), reject: vi.fn(), remove: vi.fn() }));

vi.mock("react-redux", () => ({ useDispatch: () => vi.fn() }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/components/ui/button", () => ({ Button: (props: ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props} /> }));
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ open, children }: { open: boolean; children: ReactNode }) => open ? <div role="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}));
vi.mock("@/components/modals/DeleteConfirmationModal", () => ({
  DeleteConfirmationModal: ({ isOpen, onConfirm, title }: { isOpen: boolean; onConfirm: () => void; title: string }) => isOpen ? <button onClick={onConfirm}>{title}</button> : null,
}));
vi.mock("@/pages/agency/billing/expenses/components/RejectExpenseModal", () => ({
  default: ({ open, onConfirm }: { open: boolean; onConfirm: (notes: string) => void }) => open ? <button onClick={() => onConfirm("Needs receipt")}>Decline with notes</button> : null,
}));
vi.mock("@/pages/agency/billing/expenses", () => ({ default: () => <output>Agency expenses</output> }));
vi.mock("@/lib/api/billing-expenses", () => ({
  useApproveExpenseMutation: () => [expensesApi.approve, { isLoading: false }],
  useRejectExpenseMutation: () => [expensesApi.reject, { isLoading: false }],
  useDeleteExpenseMutation: () => [expensesApi.remove, { isLoading: false }],
}));
vi.mock("@/lib/api/network-billing", () => ({
  NETWORK_BILLING_QUERY_OPTIONS: {},
  networkBillingApi: {
    useGetExpensesBootstrapQuery: api.bootstrap,
    useLazyGetExpensesPageQuery: () => [api.page, { isFetching: false }],
    util: { invalidateTags: api.invalidate },
  },
}));
vi.mock("@/pages/agency/billing/expenses/components/ExpensesOverviewCards", () => ({ default: () => <output>Expense overview</output> }));
vi.mock("@/pages/agency/billing/expenses/components/ExpensesByStatusChart", () => ({ default: ({ onStatusSegmentClick }: { onStatusSegmentClick: (label: string) => void }) => <div><button onClick={() => onStatusSegmentClick("Approved")}>Approved chart segment</button><button onClick={() => onStatusSegmentClick("Awaiting review")}>Awaiting review chart segment</button></div> }));
vi.mock("@/pages/agency/billing/expenses/components/ExpensesWorkspaceTabs", () => ({ default: ({ activeTab, onTabChange }: { activeTab: string; onTabChange: (tab: "pending" | "all") => void }) => <div><output>active:{activeTab}</output><button onClick={() => onTabChange("all")}>History</button><button onClick={() => onTabChange("pending")}>Awaiting review</button></div> }));
vi.mock("@/pages/agency/billing/expenses/components/PendingExpensesTable", () => ({ default: ({ expenses, onApprove, onDecline, onDelete, showAgency }: { expenses: Array<{ employeeName: string; agencyName: string }>; onApprove: (row: unknown) => void; onDecline: (row: unknown) => void; onDelete: (row: unknown) => void; showAgency: boolean }) => <section aria-label="Pending expenses"><output>{showAgency ? expenses.map((row) => `${row.employeeName} at ${row.agencyName}`).join(",") : "missing-agency"}</output>{expenses[0] ? <><button onClick={() => onApprove(expenses[0])}>Approve row</button><button onClick={() => onDecline(expenses[0])}>Decline row</button><button onClick={() => onDelete(expenses[0])}>Delete row</button></> : null}</section> }));
vi.mock("@/pages/agency/billing/expenses/components/ExpensesHistoryTable", () => ({ default: ({ expenses, statusFilter, onStatusFilterChange, onLoadMore, nextCursor, hasMore, incomplete, isRefetching, showAgency, statusFilterOptions }: { expenses: Array<{ employeeName: string; agencyName: string }>; statusFilter: string; onStatusFilterChange: (status: "all" | "approved" | "rejected" | "pending") => void; onLoadMore: () => void; nextCursor: string | null; hasMore: boolean; incomplete?: boolean; isRefetching: boolean; showAgency: boolean; statusFilterOptions?: Array<{ value: string; label: string }> }) => <section aria-label="Expense history"><output>{showAgency ? expenses.map((row) => `${row.employeeName} at ${row.agencyName}`).join(",") : "missing-agency"}</output><output>status:{statusFilter}</output><output>cursor:{nextCursor ?? "none"}</output><output>has-more:{String(hasMore)}</output><output>refresh:{String(isRefetching)}</output><select aria-label="History status" value={statusFilter} onChange={(event) => onStatusFilterChange(event.target.value as "all" | "approved" | "rejected" | "pending")}>{(statusFilterOptions ?? []).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>{hasMore || incomplete ? <button onClick={onLoadMore}>{incomplete ? "Retry reviewed expenses" : "Load more"}</button> : <output>End of history</output>}</section> }));

import NetworkExpenses from "./NetworkExpenses";
import SuperAdminBillingExpenses from "../SuperAdminBillingExpenses";

const workspace: BillingWorkspaceContextValue = { scope: { kind: "network" }, startDate: "2026-07-01", endDate: "2026-07-31", mode: "ddd", actorUid: "super-1", environment: "staging", onDateRangeChange: vi.fn() };
const row = { id: "expense-1", agencyId: "atlas", agencyName: "Atlas Care", staffKey: "staff-1", status: "pending" as const, mode: "ddd" as const, amount: 30, employeeId: "staff-1", employeeUid: "staff-1", employeeName: "Avery Nurse", category: "Mileage", date: "2026-07-02", submittedAt: "2026-07-02", reviewedAt: null, payrollInvoiceId: null };
const summary = { overview: { submitted: { count: 1, amount: 30 }, awaitingReview: { count: 1, amount: 30 }, approved: { count: 0, amount: 0 }, declined: { count: 0, amount: 0 } }, expensesByStatus: { total: 1, segments: [{ status: "pending" as const, count: 1 }] }, meta: { evaluatedAt: "2026-07-03", totalsExact: true, branchCount: 2 } };

function renderPage(value = workspace) {
  return render(<BillingWorkspaceProvider value={value}><NetworkExpenses /></BillingWorkspaceProvider>);
}

describe("NetworkExpenses", () => {
  it("selects the provider-free network controller from the rendered super-admin expenses wrapper", () => {
    api.bootstrap.mockReturnValue({ data: { page: { rows: [row], total: 1, nextCursor: null, hasMore: false }, summary }, isLoading: false, isFetching: false });
    const { rerender } = render(<BillingWorkspaceProvider value={workspace}><SuperAdminBillingExpenses /></BillingWorkspaceProvider>);
    expect(screen.getByRole("region", { name: "Network expenses" })).toBeVisible();
    rerender(<BillingWorkspaceProvider value={{ ...workspace, scope: { kind: "agency", agencyId: "atlas" } }}><SuperAdminBillingExpenses /></BillingWorkspaceProvider>);
    expect(screen.getByText("Agency expenses")).toBeVisible();
  });

  it("boots reviewed history through one combined request and carries its cursor to a terminal state", async () => {
    const responses = {
      pending: { data: { page: { rows: [row], total: 1, nextCursor: null, hasMore: false }, summary }, isLoading: false, isFetching: false },
      history: { data: { page: { rows: [{ ...row, id: "expense-approved", employeeName: "Approved Avery", status: "approved" as const }, { ...row, id: "expense-rejected", employeeName: "Declined Avery", status: "rejected" as const }], total: 2, nextCursor: "after-history", hasMore: true }, summary }, isLoading: false, isFetching: false },
    };
    api.bootstrap.mockImplementation((args: { tab: string }) => args.tab === "pending" ? responses.pending : responses.history);
    api.page.mockImplementation((args: { tab: string; status?: string }) => ({ unwrap: vi.fn().mockResolvedValue({ page: { rows: [{ ...row, id: "expense-history-2", status: "approved" }], total: 3, nextCursor: null, hasMore: false } }) }));
    renderPage();
    expect(screen.getByRole("region", { name: "Network expenses" })).toBeVisible();
    expect(screen.getByText("Avery Nurse at Atlas Care")).toBeVisible();
    expect(api.bootstrap).toHaveBeenCalledWith(expect.objectContaining({ tab: "pending", status: "pending", mode: "ddd" }), expect.anything());
    fireEvent.click(screen.getByRole("button", { name: "History" }));
    expect(await screen.findByRole("region", { name: "Expense history" })).toBeVisible();
    expect(screen.getByText("Approved Avery at Atlas Care,Declined Avery at Atlas Care")).toBeVisible();
    expect(screen.getByText("status:all")).toBeVisible();
    const historyBootstraps = api.bootstrap.mock.calls.filter(([args]) => args.tab === "history");
    expect(historyBootstraps.every(([args]) => !Object.hasOwn(args, "status"))).toBe(true);
    expect(new Set(historyBootstraps.map(([args]) => JSON.stringify(args))).size).toBe(1);
    fireEvent.click(screen.getByRole("button", { name: "Load more" }));
    await waitFor(() => expect(api.page).toHaveBeenCalledWith(expect.objectContaining({ tab: "history", cursor: "after-history" })));
    expect(api.page.mock.calls.find(([args]) => args.tab === "history")?.[0]).not.toHaveProperty("status");
    await waitFor(() => expect(screen.getByText("End of history")).toBeVisible());
    expect(screen.getByText("has-more:false")).toBeVisible();
  });

  it("keeps successful reviewed records visible and exposes a local retry for a combined history partial failure", async () => {
    const retry = vi.fn();
    const pendingResponse = { data: { page: { rows: [row], total: 1, nextCursor: null, hasMore: false }, summary }, isLoading: false, isFetching: false };
    const historyResponse = {
      data: {
        page: {
          rows: [{ ...row, id: "expense-approved", employeeName: "Approved Avery", status: "approved" as const }],
          total: null,
          nextCursor: null,
          hasMore: false,
          partialData: { reason: "A reviewed expense branch is temporarily unavailable.", exactTotalsAvailable: false },
        },
        summary,
      },
      isLoading: false,
      isFetching: false,
      refetch: retry,
    };
    api.bootstrap.mockImplementation((args: { tab: string }) => args.tab === "pending" ? pendingResponse : historyResponse);
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "History" }));
    expect(await screen.findByText("Approved Avery at Atlas Care")).toBeVisible();
    expect(screen.getByRole("alert")).toHaveTextContent("Some reviewed expense data could not load");
    expect(screen.getAllByRole("button", { name: "Retry reviewed expenses" })).toHaveLength(2);
    fireEvent.click(screen.getAllByRole("button", { name: "Retry reviewed expenses" })[0]);
    expect(retry).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("End of history")).toBeNull();
  });

  it("does not append an old load-more response after the workspace date range changes", async () => {
    let resolvePage: (value: { page: { rows: typeof row[]; total: number; nextCursor: null; hasMore: false } }) => void = () => {};
    const pendingPage = new Promise<{ page: { rows: typeof row[]; total: number; nextCursor: null; hasMore: false } }>((resolve) => {
      resolvePage = resolve;
    });
    const oldHistory = { data: { page: { rows: [{ ...row, id: "old-history", employeeName: "Old range" }], total: 2, nextCursor: "old-cursor", hasMore: true }, summary }, isLoading: false, isFetching: false };
    const newHistory = { data: { page: { rows: [{ ...row, id: "new-history", employeeName: "New range" }], total: 1, nextCursor: null, hasMore: false }, summary }, isLoading: false, isFetching: false };
    const pendingResponse = { data: { page: { rows: [row], total: 1, nextCursor: null, hasMore: false }, summary }, isLoading: false, isFetching: false };
    api.bootstrap.mockImplementation((args: { tab: string; startDate: string }) => args.tab === "pending" ? pendingResponse : args.startDate === "2026-08-01" ? newHistory : oldHistory);
    api.page.mockReturnValue({ unwrap: () => pendingPage });
    const { rerender } = renderPage();

    fireEvent.click(screen.getByRole("button", { name: "History" }));
    await screen.findByText("Old range at Atlas Care");
    fireEvent.click(screen.getByRole("button", { name: "Load more" }));
    rerender(<BillingWorkspaceProvider value={{ ...workspace, startDate: "2026-08-01", endDate: "2026-08-31" }}><NetworkExpenses /></BillingWorkspaceProvider>);
    expect(await screen.findByText("New range at Atlas Care")).toBeVisible();
    resolvePage({ page: { rows: [{ ...row, id: "old-continuation", employeeName: "Old continuation" }], total: 2, nextCursor: null, hasMore: false } });
    await waitFor(() => expect(screen.queryByText("Old continuation at Atlas Care")).toBeNull());
  });

  it("maps history filters and chart segments to valid network datasets", async () => {
    const responses = {
      pending: { data: { page: { rows: [row], total: 1, nextCursor: null, hasMore: false }, summary }, isLoading: false, isFetching: false },
      approved: { data: { page: { rows: [{ ...row, id: "expense-approved", status: "approved" as const }], total: 1, nextCursor: null, hasMore: false }, summary }, isLoading: false, isFetching: false },
      rejected: { data: { page: { rows: [{ ...row, id: "expense-rejected", status: "rejected" as const }], total: 1, nextCursor: null, hasMore: false }, summary }, isLoading: false, isFetching: false },
    };
    api.bootstrap.mockImplementation((args: { tab: string; status: string }) => args.tab === "pending" ? responses.pending : args.status === "approved" ? responses.approved : responses.rejected);
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "History" }));
    await screen.findByText("status:all");
    fireEvent.change(screen.getByRole("combobox", { name: "History status" }), { target: { value: "rejected" } });
    expect(screen.getByText("status:rejected")).toBeVisible();
    expect(api.bootstrap.mock.calls.filter(([args]) => args.tab === "history").every(([args]) => !Object.hasOwn(args, "status"))).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Awaiting review chart segment" }));
    await waitFor(() => expect(screen.getByText("active:pending")).toBeVisible());
    expect(api.bootstrap).toHaveBeenCalledWith(expect.objectContaining({ tab: "pending", status: "pending" }), expect.anything());
  });

  it("binds approval, decline, and deletion to the row agency then invalidates network summaries and tables", async () => {
    api.bootstrap.mockReturnValue({ data: { page: { rows: [row], total: 1, nextCursor: null, hasMore: false }, summary }, isLoading: false, isFetching: false });
    const request = () => ({ unwrap: vi.fn().mockResolvedValue({ success: true }) });
    expensesApi.approve.mockImplementation(request); expensesApi.reject.mockImplementation(request); expensesApi.remove.mockImplementation(request);
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Approve row" }));
    fireEvent.click(await screen.findByRole("button", { name: "Approve expense for Avery Nurse?" }));
    await waitFor(() => expect(expensesApi.approve).toHaveBeenCalledWith({ agencyId: "atlas", expenseId: "expense-1" }));
    fireEvent.click(screen.getByRole("button", { name: "Decline row" }));
    fireEvent.click(await screen.findByRole("button", { name: "Decline with notes" }));
    await waitFor(() => expect(expensesApi.reject).toHaveBeenCalledWith({ agencyId: "atlas", expenseId: "expense-1", reviewerNotes: "Needs receipt" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete row" }));
    fireEvent.click(await screen.findByRole("button", { name: "Delete expense for Avery Nurse?" }));
    await waitFor(() => expect(expensesApi.remove).toHaveBeenCalledWith({ agencyId: "atlas", expenseId: "expense-1" }));
    expect(api.invalidate).toHaveBeenCalledWith(expect.arrayContaining([{ type: "Expenses", id: "NETWORK" }, { type: "Overview", id: "NETWORK" }, { type: "NETWORK", id: "atlas" }]));
  });

  it("clears row-bound action state when either the workspace scope or visible category changes", async () => {
    const response = { data: { page: { rows: [row], total: 1, nextCursor: null, hasMore: false }, summary }, isLoading: false, isFetching: false };
    api.bootstrap.mockReturnValue(response);
    const { rerender } = render(<BillingWorkspaceProvider value={workspace}><SuperAdminBillingExpenses /></BillingWorkspaceProvider>);
    fireEvent.click(screen.getByRole("button", { name: "Approve row" }));
    expect(await screen.findByRole("button", { name: "Approve expense for Avery Nurse?" })).toBeVisible();
    rerender(<BillingWorkspaceProvider value={{ ...workspace, scope: { kind: "agency", agencyId: "atlas" } }}><SuperAdminBillingExpenses /></BillingWorkspaceProvider>);
    expect(screen.queryByRole("button", { name: "Approve expense for Avery Nurse?" })).toBeNull();
    expect(screen.getByText("Agency expenses")).toBeVisible();
    rerender(<BillingWorkspaceProvider value={workspace}><SuperAdminBillingExpenses /></BillingWorkspaceProvider>);
    expect(await screen.findByRole("button", { name: "Approve row" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Approve row" }));
    expect(await screen.findByRole("button", { name: "Approve expense for Avery Nurse?" })).toBeVisible();
    fireEvent.change(screen.getByLabelText("Expense category"), { target: { value: "Mileage" } });
    expect(screen.queryByRole("button", { name: "Approve expense for Avery Nurse?" })).toBeNull();
  });

  it("keeps loaded rows visible while retryable paging fails", async () => {
    const pendingResponse = { data: { page: { rows: [row], total: 1, nextCursor: null, hasMore: false }, summary }, isLoading: false, isFetching: false };
    const historyResponse = { data: { page: { rows: [row], total: 1, nextCursor: "after-1", hasMore: true }, summary }, isLoading: false, isFetching: false };
    api.bootstrap.mockImplementation((args: { tab: string }) => args.tab === "history" ? historyResponse : pendingResponse);
    api.page.mockReturnValue({ unwrap: vi.fn().mockRejectedValue(new Error("offline")) });
    const { rerender } = renderPage();
    fireEvent.click(screen.getByRole("button", { name: "History" }));
    await screen.findByText("cursor:after-1");
    fireEvent.click(await screen.findByRole("button", { name: "Load more" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("current rows are still available");
    rerender(<BillingWorkspaceProvider value={{ ...workspace, scope: { kind: "agency", agencyId: "beacon" } }}><NetworkExpenses /></BillingWorkspaceProvider>);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("keeps cached rows visible and offers a local retry when a background bootstrap refresh fails", async () => {
    const retry = vi.fn();
    api.bootstrap.mockReturnValue({ data: { page: { rows: [row], total: 1, nextCursor: null, hasMore: false }, summary }, isError: true, isLoading: false, isFetching: false, refetch: retry });
    renderPage();
    expect(screen.getByText("Avery Nurse at Atlas Care")).toBeVisible();
    expect(screen.getByRole("alert")).toHaveTextContent("may be out of date");
    fireEvent.click(screen.getByRole("button", { name: "Retry network expenses" }));
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
