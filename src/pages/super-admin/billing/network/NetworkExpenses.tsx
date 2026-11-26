import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { Button } from "@/components/ui/button";
import { DeleteConfirmationModal } from "@/components/modals/DeleteConfirmationModal";
import { useToast } from "@/hooks/use-toast";
import type { AgencyExpenseListItem, ExpenseStatus, ExpensesDashboardSummary } from "@/lib/api/billing-expenses";
import { useApproveExpenseMutation, useDeleteExpenseMutation, useRejectExpenseMutation } from "@/lib/api/billing-expenses";
import { NETWORK_BILLING_QUERY_OPTIONS, networkBillingApi, type ExpensesNetworkBillingArgs } from "@/lib/api/network-billing";
import ExpensesByStatusChart from "@/pages/agency/billing/expenses/components/ExpensesByStatusChart";
import ExpensesHistoryTable from "@/pages/agency/billing/expenses/components/ExpensesHistoryTable";
import ExpensesOverviewCards from "@/pages/agency/billing/expenses/components/ExpensesOverviewCards";
import PendingExpensesTable from "@/pages/agency/billing/expenses/components/PendingExpensesTable";
import ExpensesWorkspaceTabs, { type ExpensesWorkspaceTab } from "@/pages/agency/billing/expenses/components/ExpensesWorkspaceTabs";
import type { NetworkAgencyExpense } from "@/pages/agency/billing/expenses/components/expenseTableTypes";
import { formatCurrency } from "@/pages/agency/billing-and-approvals/billingUtils";
import { mapDashboardToOverviewStats, mapDashboardToStatusChart, STATUS_LABEL_TO_FILTER } from "@/pages/agency/billing/expenses/utils/expensesDashboardUtils";
import { useBillingWorkspaceContext } from "../BillingWorkspaceContext";
import type { NetworkBillingExpenseRow } from "../types";

const RejectExpenseModal = lazy(() => import("@/pages/agency/billing/expenses/components/RejectExpenseModal"));

type HistoryStatus = Extract<ExpenseStatus, "approved" | "rejected"> | "all";
type PageStatus = "pending" | "history";
type BusyAction = "approve" | "reject" | "delete" | null;

type PageState = Record<PageStatus, { cursor: string | null; hasMore: boolean; total: number | null }>;

const EMPTY_PAGE_STATE: PageState = {
  pending: { cursor: null, hasMore: false, total: null },
  history: { cursor: null, hasMore: false, total: null },
};

const NETWORK_HISTORY_STATUS_OPTIONS: Array<{ value: HistoryStatus; label: string }> = [
  { value: "all", label: "All reviewed statuses" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Declined" },
];

function toAgencyExpense(row: NetworkBillingExpenseRow): NetworkAgencyExpense {
  return {
    id: row.id,
    agencyId: row.agencyId,
    agencyName: row.agencyName,
    employeeId: row.employeeId ?? null,
    employeeUid: row.employeeUid ?? null,
    employeeName: row.employeeName ?? "Staff member",
    amount: row.amount,
    category: row.category ?? null,
    message: "",
    receiptUrl: null,
    status: row.status,
    date: row.date ?? null,
    submittedAt: typeof row.submittedAt === "string" ? row.submittedAt : null,
    reviewedAt: typeof row.reviewedAt === "string" ? row.reviewedAt : null,
    reviewerNotes: null,
    payrollInvoiceId: row.payrollInvoiceId ?? null,
  };
}

function dedupe(rows: readonly NetworkBillingExpenseRow[]) {
  return [...new Map(rows.map((row) => [`${row.agencyId}:${row.id}`, row])).values()];
}

function availableCategories(rows: readonly NetworkBillingExpenseRow[]) {
  return [...new Set(rows.map((row) => row.category).filter((category): category is string => Boolean(category)))].sort();
}

function toPageState(page: { nextCursor: string | null; hasMore: boolean; total: number | null }) {
  return { cursor: page.nextCursor, hasMore: page.hasMore, total: page.total };
}

export default function NetworkExpenses() {
  const workspace = useBillingWorkspaceContext();
  const dispatch = useDispatch();
  const { toast } = useToast();
  const [tab, setTab] = useState<ExpensesWorkspaceTab>("pending");
  const [status, setStatus] = useState<HistoryStatus>("all");
  const [category, setCategory] = useState("all");
  const [rows, setRows] = useState<NetworkBillingExpenseRow[]>([]);
  const [pageState, setPageState] = useState<PageState>(EMPTY_PAGE_STATE);
  const seenCursors = useRef(new Set<string>());
  const loadEpoch = useRef(0);
  const [approveTarget, setApproveTarget] = useState<NetworkAgencyExpense | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<NetworkAgencyExpense | null>(null);
  const [declineTarget, setDeclineTarget] = useState<NetworkAgencyExpense | null>(null);
  const [busy, setBusy] = useState<{ id: string; action: BusyAction } | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);

  const base = {
    actorUid: workspace.actorUid,
    environment: workspace.environment,
    scope: workspace.scope,
    startDate: workspace.startDate,
    endDate: workspace.endDate,
  };
  const mode = workspace.mode === "ddd" || workspace.mode === "hha" ? workspace.mode : undefined;
  const pendingArgs: ExpensesNetworkBillingArgs = { ...base, tab: "pending", status: "pending", ...(mode ? { mode } : {}) };
  const historyArgs: ExpensesNetworkBillingArgs = { ...base, tab: "history", ...(mode ? { mode } : {}) };
  const pendingBootstrap = networkBillingApi.useGetExpensesBootstrapQuery(pendingArgs, { ...NETWORK_BILLING_QUERY_OPTIONS, skip: tab !== "pending" });
  const historyBootstrap = networkBillingApi.useGetExpensesBootstrapQuery(historyArgs, { ...NETWORK_BILLING_QUERY_OPTIONS, skip: tab !== "all" });
  const [loadPage, page] = networkBillingApi.useLazyGetExpensesPageQuery();
  const [approveExpense, approveState] = useApproveExpenseMutation();
  const [rejectExpense, rejectState] = useRejectExpenseMutation();
  const [deleteExpense, deleteState] = useDeleteExpenseMutation();

  useEffect(() => {
    loadEpoch.current += 1;
    setCategory("all");
    setRows([]);
    setPageState(EMPTY_PAGE_STATE);
    setApproveTarget(null);
    setDeleteTarget(null);
    setDeclineTarget(null);
    setBusy(null);
    setLoadMoreError(null);
    seenCursors.current.clear();
  }, [tab, workspace.startDate, workspace.endDate, workspace.mode, workspace.scope]);

  useEffect(() => {
    // A category changes the visible dataset, so a row-bound confirmation must never
    // survive to act on a record the reviewer is no longer looking at.
    setApproveTarget(null);
    setDeleteTarget(null);
    setDeclineTarget(null);
  }, [category]);

  useEffect(() => {
    if (tab === "pending") {
      if (!pendingBootstrap.data) return;
      setRows(dedupe(pendingBootstrap.data.page.rows));
      setPageState({ ...EMPTY_PAGE_STATE, pending: toPageState(pendingBootstrap.data.page) });
      seenCursors.current.clear();
      return;
    }

    if (!historyBootstrap.data) return;
    setRows(dedupe(historyBootstrap.data.page.rows));
    setPageState({
      ...EMPTY_PAGE_STATE,
      history: toPageState(historyBootstrap.data.page),
    });
    seenCursors.current.clear();
  }, [historyBootstrap.data, pendingBootstrap.data, tab]);

  const expenses = useMemo(() => rows.map(toAgencyExpense), [rows]);
  const categories = useMemo(() => availableCategories(rows), [rows]);
  const visibleExpenses = useMemo(
    () => category === "all" ? expenses : expenses.filter((expense) => expense.category === category),
    [category, expenses],
  );
  const summary = (tab === "pending" ? pendingBootstrap.data?.summary : historyBootstrap.data?.summary) as ExpensesDashboardSummary | undefined;
  const bootstrapLoading = tab === "pending"
    ? pendingBootstrap.isLoading
    : historyBootstrap.isLoading;
  const bootstrapFetching = tab === "pending"
    ? pendingBootstrap.isFetching
    : historyBootstrap.isFetching;
  const activeBootstrapError = tab === "pending"
    ? pendingBootstrap.isError
    : historyBootstrap.isError;
  const hasBootstrapData = tab === "pending"
    ? Boolean(pendingBootstrap.data)
    : Boolean(historyBootstrap.data);
  const staleBootstrap = tab === "pending"
    ? pendingBootstrap.isError && Boolean(pendingBootstrap.data)
    : historyBootstrap.isError && Boolean(historyBootstrap.data);
  const historyPartialData = tab === "all" ? historyBootstrap.data?.page.partialData ?? null : null;
  const historyHasMore = pageState.history.hasMore && Boolean(pageState.history.cursor);
  const historyNextCursor = pageState.history.cursor;
  const totalCount = tab === "pending"
    ? pageState.pending.total ?? visibleExpenses.length
    : pageState.history.total ?? visibleExpenses.length;
  const actionsDisabled = Boolean(busy || approveState.isLoading || rejectState.isLoading || deleteState.isLoading);

  function invalidate(agencyId: string) {
    dispatch(networkBillingApi.util.invalidateTags([
      { type: "Expenses", id: "NETWORK" },
      { type: "Overview", id: "NETWORK" },
      { type: "NETWORK", id: agencyId },
    ]));
  }

  async function loadMore() {
    if (page.isFetching) return;
    const pageStatus: PageStatus = tab === "pending" ? "pending" : "history";
    const current = pageState[pageStatus];
    const cursorKey = `${pageStatus}:${current.cursor ?? ""}`;
    if (!current.hasMore || !current.cursor || seenCursors.current.has(cursorKey)) return;
    seenCursors.current.add(cursorKey);
    const epoch = loadEpoch.current;
    const pageArgs = pageStatus === "pending" ? pendingArgs : historyArgs;
    try {
      const response = await loadPage({ ...pageArgs, cursor: current.cursor }).unwrap();
      if (epoch !== loadEpoch.current) return;
      setRows((currentRows) => dedupe([...currentRows, ...response.page.rows]));
      setPageState((currentState) => ({
        ...currentState,
        [pageStatus]: toPageState({
          ...response.page,
          nextCursor: response.page.nextCursor === current.cursor ? null : response.page.nextCursor,
          hasMore: response.page.nextCursor === current.cursor ? false : response.page.hasMore,
        }),
      }));
      setLoadMoreError(null);
    } catch {
      if (epoch !== loadEpoch.current) return;
      seenCursors.current.delete(cursorKey);
      setLoadMoreError("Couldn't load more expenses. Your current rows are still available.");
    }
  }

  function retryBootstrap() {
    const retries = tab === "pending"
      ? [pendingBootstrap.refetch]
      : [historyBootstrap.refetch];
    void Promise.all(retries.map((retry) => retry()));
  }

  async function approve() {
    if (!approveTarget || busy) return;
    setBusy({ id: approveTarget.id, action: "approve" });
    try {
      await approveExpense({ agencyId: approveTarget.agencyId, expenseId: approveTarget.id }).unwrap();
      invalidate(approveTarget.agencyId);
      setApproveTarget(null);
      toast({ title: "Expense approved", description: `Included in ${approveTarget.employeeName}'s next payroll.` });
    } catch (error) {
      toast({ title: "Couldn't update expense", description: error instanceof Error ? error.message : "Try again.", variant: "destructive" });
    } finally { setBusy(null); }
  }

  async function reject(notes: string) {
    if (!declineTarget || busy) return;
    setBusy({ id: declineTarget.id, action: "reject" });
    try {
      await rejectExpense({ agencyId: declineTarget.agencyId, expenseId: declineTarget.id, reviewerNotes: notes }).unwrap();
      invalidate(declineTarget.agencyId);
      setDeclineTarget(null);
    } catch (error) {
      toast({ title: "Couldn't update expense", description: error instanceof Error ? error.message : "Try again.", variant: "destructive" });
    } finally { setBusy(null); }
  }

  async function remove() {
    if (!deleteTarget || busy) return;
    setBusy({ id: deleteTarget.id, action: "delete" });
    try {
      await deleteExpense({ agencyId: deleteTarget.agencyId, expenseId: deleteTarget.id }).unwrap();
      invalidate(deleteTarget.agencyId);
      setDeleteTarget(null);
    } catch (error) {
      toast({ title: "Couldn't delete expense", description: error instanceof Error ? error.message : "Try again.", variant: "destructive" });
    } finally { setBusy(null); }
  }

  if (activeBootstrapError && !hasBootstrapData) {
    return <section aria-label="Network expenses" className="rounded-2xl border border-[#efcbc6] bg-[#fff5f3] px-5 py-8 text-center"><p role="alert" className="text-sm text-[#7e3029]">Couldn't load network expenses. Try again to refresh them.</p><Button type="button" variant="outline" className="mt-4 min-h-11" onClick={retryBootstrap}>Retry network expenses</Button></section>;
  }

  return <section aria-label="Network expenses" aria-busy={bootstrapLoading || page.isFetching} className="min-w-0 space-y-6 pb-8">
    <span className="sr-only">Expense submissions for all authorized agencies</span>
    {staleBootstrap ? <div role="alert" className="flex flex-col gap-3 rounded-xl border border-[#f1d08b] bg-[#fff9eb] px-4 py-3 text-sm text-[#744b00] sm:flex-row sm:items-center sm:justify-between"><span>Some network expense data may be out of date. Your last loaded rows are still shown.</span><Button type="button" variant="outline" className="min-h-11 border-[#dca83b] text-[#744b00]" onClick={retryBootstrap}>Retry network expenses</Button></div> : null}
    {historyPartialData ? <div role="alert" className="flex flex-col gap-3 rounded-xl border border-[#f1d08b] bg-[#fff9eb] px-4 py-3 text-sm text-[#744b00] sm:flex-row sm:items-center sm:justify-between"><span>Some reviewed expense data could not load. Successful records are still shown and the history is incomplete.</span><Button type="button" variant="outline" className="min-h-11 border-[#dca83b] text-[#744b00]" onClick={retryBootstrap}>Retry reviewed expenses</Button></div> : null}
    <ExpensesOverviewCards stats={mapDashboardToOverviewStats(summary)} loading={bootstrapLoading && !hasBootstrapData} />
    <ExpensesByStatusChart chart={mapDashboardToStatusChart(summary)} loading={bootstrapLoading && !hasBootstrapData} onStatusSegmentClick={(label) => { const next = STATUS_LABEL_TO_FILTER[label]; if (next === "pending") { setTab("pending"); setStatus("all"); } else if (next === "approved" || next === "rejected") { setTab("all"); setStatus(next); } }} />
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <ExpensesWorkspaceTabs activeTab={tab} onTabChange={setTab} />
      <label className="flex min-h-11 flex-col gap-1 text-[13px] text-[#687173]"><span>Category in loaded rows</span><select aria-label="Expense category" value={category} onChange={(event) => setCategory(event.target.value)} className="min-h-11 rounded-md border border-[#e5e5e6] bg-white px-3 text-sm text-[#10141a]"><option value="all">All categories</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
    </div>
    {tab === "pending" ? <PendingExpensesTable expenses={visibleExpenses.filter((expense) => expense.status === "pending")} loading={bootstrapLoading && !hasBootstrapData} onApprove={setApproveTarget} onDecline={setDeclineTarget} onDelete={setDeleteTarget} actionsDisabled={actionsDisabled} showAgency noun="Staff" /> : <ExpensesHistoryTable expenses={visibleExpenses.filter((expense) => status === "all" || expense.status === status)} totalCount={totalCount} hasMore={historyHasMore} incomplete={Boolean(historyPartialData)} page={1} loading={bootstrapLoading && !hasBootstrapData} isRefetching={bootstrapFetching || page.isFetching} statusFilter={status} statusFilterOptions={NETWORK_HISTORY_STATUS_OPTIONS} onStatusFilterChange={(next) => { if (next === "all" || next === "approved" || next === "rejected") setStatus(next); }} onLoadMore={historyPartialData ? retryBootstrap : () => void loadMore()} nextCursor={historyNextCursor} showAgency noun="Staff" />}
    {loadMoreError ? <p role="alert" className="text-sm text-[#b42318]">{loadMoreError}</p> : null}
    <DeleteConfirmationModal isOpen={Boolean(approveTarget)} onClose={() => !busy && setApproveTarget(null)} onConfirm={() => void approve()} isDeleting={busy?.action === "approve"} title={approveTarget ? `Approve expense for ${approveTarget.employeeName}?` : "Approve expense?"} message={approveTarget ? `${formatCurrency(approveTarget.amount)} will be included in the next payroll for ${approveTarget.agencyName}.` : ""} confirmText="Approve expense" cancelText="Cancel" confirmButtonClassName="flex-1 bg-[#0EAF52] hover:bg-[#0c9644] text-white" />
    <DeleteConfirmationModal isOpen={Boolean(deleteTarget)} onClose={() => !busy && setDeleteTarget(null)} onConfirm={() => void remove()} isDeleting={busy?.action === "delete"} title={deleteTarget ? `Delete expense for ${deleteTarget.employeeName}?` : "Delete expense?"} message={deleteTarget ? `This permanently removes ${formatCurrency(deleteTarget.amount)} from ${deleteTarget.agencyName}.` : ""} confirmText="Delete expense" cancelText="Cancel" />
    {declineTarget ? <Suspense fallback={null}><RejectExpenseModal open expense={declineTarget} saving={busy?.action === "reject"} onClose={() => !busy && setDeclineTarget(null)} onConfirm={(notes) => void reject(notes)} noun="staff member" /></Suspense> : null}
  </section>;
}
