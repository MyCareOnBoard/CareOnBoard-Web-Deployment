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

type HistoryStatus = Extract<ExpenseStatus, "approved" | "rejected">;
type BusyAction = "approve" | "reject" | "delete" | null;

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

export default function NetworkExpenses() {
  const workspace = useBillingWorkspaceContext();
  const dispatch = useDispatch();
  const { toast } = useToast();
  const [tab, setTab] = useState<ExpensesWorkspaceTab>("pending");
  const [status, setStatus] = useState<HistoryStatus>("approved");
  const [category, setCategory] = useState("all");
  const [rows, setRows] = useState<NetworkBillingExpenseRow[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const seenCursors = useRef(new Set<string>());
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
  const args: ExpensesNetworkBillingArgs = tab === "pending"
    ? { ...base, tab: "pending", status: "pending", ...(mode ? { mode } : {}) }
    : { ...base, tab: "history", status, ...(mode ? { mode } : {}) };
  const bootstrap = networkBillingApi.useGetExpensesBootstrapQuery(args, NETWORK_BILLING_QUERY_OPTIONS);
  const [loadPage, page] = networkBillingApi.useLazyGetExpensesPageQuery();
  const [approveExpense, approveState] = useApproveExpenseMutation();
  const [rejectExpense, rejectState] = useRejectExpenseMutation();
  const [deleteExpense, deleteState] = useDeleteExpenseMutation();

  useEffect(() => {
    setCategory("all");
    setRows([]);
    setCursor(null);
    setApproveTarget(null);
    setDeleteTarget(null);
    setDeclineTarget(null);
    setBusy(null);
    setLoadMoreError(null);
    seenCursors.current.clear();
  }, [tab, workspace.startDate, workspace.endDate, workspace.mode, workspace.scope]);

  useEffect(() => {
    setRows([]);
    setCursor(null);
    setApproveTarget(null);
    setDeleteTarget(null);
    setDeclineTarget(null);
    setLoadMoreError(null);
    seenCursors.current.clear();
  }, [status]);

  useEffect(() => {
    // A category changes the visible dataset, so a row-bound confirmation must never
    // survive to act on a record the reviewer is no longer looking at.
    setApproveTarget(null);
    setDeleteTarget(null);
    setDeclineTarget(null);
  }, [category]);

  useEffect(() => {
    if (!bootstrap.data) return;
    setRows(dedupe(bootstrap.data.page.rows));
    setCursor(bootstrap.data.page.nextCursor);
    seenCursors.current.clear();
  }, [bootstrap.data]);

  const expenses = useMemo(() => rows.map(toAgencyExpense), [rows]);
  const categories = useMemo(() => availableCategories(rows), [rows]);
  const visibleExpenses = useMemo(
    () => category === "all" ? expenses : expenses.filter((expense) => expense.category === category),
    [category, expenses],
  );
  const summary = bootstrap.data?.summary as ExpensesDashboardSummary | undefined;
  const actionsDisabled = Boolean(busy || approveState.isLoading || rejectState.isLoading || deleteState.isLoading);

  function invalidate(agencyId: string) {
    dispatch(networkBillingApi.util.invalidateTags([
      { type: "Expenses", id: "NETWORK" },
      { type: "Overview", id: "NETWORK" },
      { type: "Payroll", id: "NETWORK" },
      { type: "NETWORK", id: agencyId },
    ]));
  }

  async function loadMore() {
    const requestedCursor = cursor;
    if (!requestedCursor || page.isFetching || seenCursors.current.has(requestedCursor)) return;
    seenCursors.current.add(requestedCursor);
    try {
      const result = await loadPage({ ...args, cursor: requestedCursor }).unwrap();
      setRows((current) => dedupe([...current, ...result.page.rows]));
      setCursor(result.page.nextCursor === requestedCursor ? null : result.page.nextCursor);
      setLoadMoreError(null);
    } catch {
      seenCursors.current.delete(requestedCursor);
      setLoadMoreError("Couldn't load more expenses. Your current rows are still available.");
    }
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

  if (bootstrap.isError && !bootstrap.data) {
    return <section aria-label="Network expenses" className="rounded-2xl border border-[#efcbc6] bg-[#fff5f3] px-5 py-8 text-center"><p role="alert" className="text-sm text-[#7e3029]">Couldn't load network expenses. Try again to refresh them.</p><Button type="button" variant="outline" className="mt-4 min-h-11" onClick={bootstrap.refetch}>Retry network expenses</Button></section>;
  }

  return <section aria-label="Network expenses" aria-busy={bootstrap.isLoading || page.isFetching} className="min-w-0 space-y-6 pb-8">
    <span className="sr-only">Expense submissions for all authorized agencies</span>
    <ExpensesOverviewCards stats={mapDashboardToOverviewStats(summary)} loading={bootstrap.isLoading && !bootstrap.data} />
    <ExpensesByStatusChart chart={mapDashboardToStatusChart(summary)} loading={bootstrap.isLoading && !bootstrap.data} onStatusSegmentClick={(label) => { const next = STATUS_LABEL_TO_FILTER[label]; if (next === "approved" || next === "rejected") { setTab("all"); setStatus(next); } }} />
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <ExpensesWorkspaceTabs activeTab={tab} onTabChange={setTab} />
      <label className="flex min-h-11 flex-col gap-1 text-[13px] text-[#687173]"><span>Category in loaded rows</span><select aria-label="Expense category" value={category} onChange={(event) => setCategory(event.target.value)} className="min-h-11 rounded-md border border-[#e5e5e6] bg-white px-3 text-sm text-[#10141a]"><option value="all">All categories</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
    </div>
    {tab === "pending" ? <PendingExpensesTable expenses={visibleExpenses.filter((expense) => expense.status === "pending")} loading={bootstrap.isLoading && !bootstrap.data} onApprove={setApproveTarget} onDecline={setDeclineTarget} onDelete={setDeleteTarget} actionsDisabled={actionsDisabled} showAgency noun="Staff" /> : <ExpensesHistoryTable expenses={visibleExpenses} totalCount={bootstrap.data?.page.total ?? visibleExpenses.length} hasMore={bootstrap.data?.page.hasMore ?? false} page={1} loading={bootstrap.isLoading && !bootstrap.data} isRefetching={bootstrap.isFetching || page.isFetching} statusFilter={status} onStatusFilterChange={(next) => { if (next === "approved" || next === "rejected") setStatus(next); }} onLoadMore={() => void loadMore()} nextCursor={cursor} showAgency noun="Staff" />}
    {loadMoreError ? <p role="alert" className="text-sm text-[#b42318]">{loadMoreError}</p> : null}
    <DeleteConfirmationModal isOpen={Boolean(approveTarget)} onClose={() => !busy && setApproveTarget(null)} onConfirm={() => void approve()} isDeleting={busy?.action === "approve"} title={approveTarget ? `Approve expense for ${approveTarget.employeeName}?` : "Approve expense?"} message={approveTarget ? `${formatCurrency(approveTarget.amount)} will be included in the next payroll for ${approveTarget.agencyName}.` : ""} confirmText="Approve expense" cancelText="Cancel" confirmButtonClassName="flex-1 bg-[#0EAF52] hover:bg-[#0c9644] text-white" />
    <DeleteConfirmationModal isOpen={Boolean(deleteTarget)} onClose={() => !busy && setDeleteTarget(null)} onConfirm={() => void remove()} isDeleting={busy?.action === "delete"} title={deleteTarget ? `Delete expense for ${deleteTarget.employeeName}?` : "Delete expense?"} message={deleteTarget ? `This permanently removes ${formatCurrency(deleteTarget.amount)} from ${deleteTarget.agencyName}.` : ""} confirmText="Delete expense" cancelText="Cancel" />
    {declineTarget ? <Suspense fallback={null}><RejectExpenseModal open expense={declineTarget} saving={busy?.action === "reject"} onClose={() => !busy && setDeclineTarget(null)} onConfirm={(notes) => void reject(notes)} noun="staff member" /></Suspense> : null}
  </section>;
}
