import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/utils/auth";
import type { AgencyExpenseListItem, ExpenseStatus } from "@/lib/api/billing-expenses";
import {
  useApproveExpenseMutation,
  useGetAgencyExpensesQuery,
  useGetExpensesDashboardQuery,
  useDeleteExpenseMutation,
  useRejectExpenseMutation,
} from "@/lib/api/billing-expenses";
import { DeleteConfirmationModal } from "@/components/modals/DeleteConfirmationModal";
import { formatCurrency } from "@/pages/agency/billing-and-approvals/billingUtils";
import {
  mapExpenseMutationError,
  mapExpensesLoadError,
} from "@/pages/agency/billing/shared/billingErrorCopy";
import ExpensesDashboardHeader from "./components/ExpensesDashboardHeader";
import ExpensesOverviewCards from "./components/ExpensesOverviewCards";
import ExpensesByStatusChart from "./components/ExpensesByStatusChart";
import ExpensesWorkspaceTabs, { type ExpensesWorkspaceTab } from "./components/ExpensesWorkspaceTabs";
import PendingExpensesTable from "./components/PendingExpensesTable";
import ExpensesHistoryTable from "./components/ExpensesHistoryTable";
import {
  getCurrentWeekDateRange,
  mapDashboardToOverviewStats,
  mapDashboardToStatusChart,
  STATUS_LABEL_TO_FILTER,
} from "./utils/expensesDashboardUtils";

const RejectExpenseModal = lazy(() => import("./components/RejectExpenseModal"));

const LIST_PAGE_SIZE = 25;

export default function ExpensesDashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState(getCurrentWeekDateRange);
  const [activeTab, setActiveTab] = useState<ExpensesWorkspaceTab>("pending");
  const [statusFilter, setStatusFilter] = useState<ExpenseStatus | "all">("all");
  const [listPage, setListPage] = useState(1);
  const [declineTarget, setDeclineTarget] = useState<AgencyExpenseListItem | null>(null);
  const [approveTarget, setApproveTarget] = useState<AgencyExpenseListItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AgencyExpenseListItem | null>(null);
  const lastDashboardErrorRef = useRef<string | null>(null);
  const lastListErrorRef = useRef<string | null>(null);

  const hasAgency = Boolean(user?.agencyId);
  const hasDateRange = Boolean(dateRange.startDate && dateRange.endDate);

  const {
    data: dashboardData,
    isLoading: dashboardLoading,
    isError: dashboardError,
    error: dashboardErrorPayload,
  } = useGetExpensesDashboardQuery(
    { startDate: dateRange.startDate, endDate: dateRange.endDate },
    { skip: !hasDateRange },
  );

  const pendingQuery = useGetAgencyExpensesQuery(
    {
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      status: "pending",
      page: 1,
      limit: 50,
    },
    { skip: !hasDateRange || activeTab !== "pending" },
  );

  const allQuery = useGetAgencyExpensesQuery(
    {
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      status: statusFilter,
      page: listPage,
      limit: LIST_PAGE_SIZE,
    },
    { skip: !hasDateRange || activeTab !== "all" },
  );

  const [approveExpense, { isLoading: isApproving }] = useApproveExpenseMutation();
  const [rejectExpense, { isLoading: isDeclining }] = useRejectExpenseMutation();
  const [deleteExpense, { isLoading: isDeleting }] = useDeleteExpenseMutation();

  const overviewStats = useMemo(
    () => mapDashboardToOverviewStats(dashboardData),
    [dashboardData],
  );
  const statusChart = useMemo(() => mapDashboardToStatusChart(dashboardData), [dashboardData]);

  const handleApprove = useCallback(
    async (expense: AgencyExpenseListItem) => {
      if (!hasAgency) {
        toast({
          title: "Sign in required",
          description: "Your account isn't linked to an agency.",
          variant: "destructive",
        });
        return;
      }

      try {
        await approveExpense({ expenseId: expense.id }).unwrap();
        setApproveTarget(null);
        toast({
          title: "Expense approved",
          description:
            "Included in this DSP's next payroll for the expense date.",
        });
      } catch (error) {
        toast({
          title: "Couldn't update expense",
          description: mapExpenseMutationError(error),
          variant: "destructive",
        });
      }
    },
    [approveExpense, hasAgency, toast],
  );

  const handleRequestApprove = useCallback((expense: AgencyExpenseListItem) => {
    window.requestAnimationFrame(() => {
      setApproveTarget(expense);
    });
  }, []);

  const handleConfirmApprove = useCallback(() => {
    if (!approveTarget) return;
    void handleApprove(approveTarget);
  }, [approveTarget, handleApprove]);

  const handleDelete = useCallback(
    async (expense: AgencyExpenseListItem) => {
      if (!hasAgency) {
        toast({
          title: "Sign in required",
          description: "Your account isn't linked to an agency.",
          variant: "destructive",
        });
        return;
      }

      try {
        await deleteExpense({ expenseId: expense.id }).unwrap();
        setDeleteTarget(null);
        toast({
          title: "Expense deleted",
          description: "The pending expense was removed.",
        });
      } catch (error) {
        toast({
          title: "Couldn't delete expense",
          description: mapExpenseMutationError(error),
          variant: "destructive",
        });
      }
    },
    [deleteExpense, hasAgency, toast],
  );

  const handleRequestDelete = useCallback((expense: AgencyExpenseListItem) => {
    window.requestAnimationFrame(() => {
      setDeleteTarget(expense);
    });
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (!deleteTarget) return;
    void handleDelete(deleteTarget);
  }, [deleteTarget, handleDelete]);

  const handleConfirmDecline = useCallback(
    async (reviewerNotes: string) => {
      if (!declineTarget) return;

      if (!hasAgency) {
        toast({
          title: "Sign in required",
          description: "Your account isn't linked to an agency.",
          variant: "destructive",
        });
        return;
      }

      try {
        await rejectExpense({
          expenseId: declineTarget.id,
          reviewerNotes,
        }).unwrap();
        setDeclineTarget(null);
        toast({
          title: "Expense declined",
          description: "The DSP will see your reason in their app.",
        });
      } catch (error) {
        toast({
          title: "Couldn't update expense",
          description: mapExpenseMutationError(error),
          variant: "destructive",
        });
      }
    },
    [declineTarget, hasAgency, rejectExpense, toast],
  );

  const handleStatusSegmentClick = useCallback((segmentLabel: string) => {
    const nextFilter = STATUS_LABEL_TO_FILTER[segmentLabel];
    if (!nextFilter) return;
    setActiveTab("all");
    setStatusFilter(nextFilter);
    setListPage(1);
  }, []);

  const handleTabChange = useCallback((tab: ExpensesWorkspaceTab) => {
    setActiveTab(tab);
    if (tab === "all") {
      setListPage(1);
    }
  }, []);

  const handleDateRangeChange = useCallback(
    (values: typeof dateRange) => {
      setDateRange(values);
      setListPage(1);
    },
    [],
  );

  useEffect(() => {
    if (!dashboardError) {
      lastDashboardErrorRef.current = null;
      return;
    }

    const fingerprint = JSON.stringify(dashboardErrorPayload);
    if (lastDashboardErrorRef.current === fingerprint) {
      return;
    }
    lastDashboardErrorRef.current = fingerprint;

    toast({
      title: "Couldn't load expenses",
      description: mapExpensesLoadError(dashboardErrorPayload),
      variant: "destructive",
    });
  }, [dashboardError, dashboardErrorPayload, toast]);

  useEffect(() => {
    if (!allQuery.isError || activeTab !== "all") {
      lastListErrorRef.current = null;
      return;
    }

    const fingerprint = JSON.stringify(allQuery.error);
    if (lastListErrorRef.current === fingerprint) {
      return;
    }
    lastListErrorRef.current = fingerprint;

    toast({
      title: "Couldn't load expenses",
      description: mapExpensesLoadError(allQuery.error),
      variant: "destructive",
    });
  }, [activeTab, allQuery.error, allQuery.isError, toast]);

  const actionsDisabled = isApproving || isDeclining || isDeleting;

  return (
    <div className="min-h-[calc(100vh-200px)] space-y-8 pb-8">
      <ExpensesDashboardHeader dateRange={dateRange} onDateRangeChange={handleDateRangeChange} />
      <ExpensesOverviewCards stats={overviewStats} loading={dashboardLoading} />
      <ExpensesByStatusChart
        chart={statusChart}
        loading={dashboardLoading}
        onStatusSegmentClick={handleStatusSegmentClick}
      />

      <ExpensesWorkspaceTabs activeTab={activeTab} onTabChange={handleTabChange} />

      {activeTab === "pending" ? (
        <PendingExpensesTable
          expenses={pendingQuery.data?.expenses ?? []}
          loading={pendingQuery.isLoading || pendingQuery.isFetching}
          onApprove={handleRequestApprove}
          onDecline={setDeclineTarget}
          onDelete={handleRequestDelete}
          actionsDisabled={actionsDisabled}
        />
      ) : (
        <ExpensesHistoryTable
          expenses={allQuery.data?.expenses ?? []}
          totalCount={allQuery.data?.total ?? 0}
          hasMore={allQuery.data?.hasMore ?? false}
          page={listPage}
          loading={allQuery.isLoading || allQuery.isFetching}
          statusFilter={statusFilter}
          onStatusFilterChange={(status) => {
            setStatusFilter(status);
            setListPage(1);
          }}
          onLoadMore={() => setListPage((page) => page + 1)}
        />
      )}

      <DeleteConfirmationModal
        isOpen={Boolean(approveTarget)}
        onClose={() => {
          if (!isApproving) {
            setApproveTarget(null);
          }
        }}
        onConfirm={handleConfirmApprove}
        isDeleting={isApproving}
        title={
          approveTarget
            ? `Approve expense for ${approveTarget.employeeName}?`
            : "Approve expense?"
        }
        message={
          approveTarget
            ? `${formatCurrency(approveTarget.amount)} will be included in this DSP's next payroll for the expense date.`
            : "This expense will be included in payroll."
        }
        confirmText="Approve expense"
        cancelText="Cancel"
        confirmButtonClassName="flex-1 bg-[#0EAF52] hover:bg-[#0c9644] text-white"
      />

      <DeleteConfirmationModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => {
          if (!isDeleting) {
            setDeleteTarget(null);
          }
        }}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
        title={
          deleteTarget
            ? `Delete expense for ${deleteTarget.employeeName}?`
            : "Delete expense?"
        }
        message={
          deleteTarget
            ? `This will permanently remove the ${formatCurrency(deleteTarget.amount)} pending expense. The DSP can submit a new one if needed.`
            : "This will permanently remove the pending expense."
        }
        confirmText="Delete expense"
        cancelText="Cancel"
      />

      {declineTarget ? (
        <Suspense fallback={null}>
          <RejectExpenseModal
            open
            expense={declineTarget}
            saving={isDeclining}
            onClose={() => !isDeclining && setDeclineTarget(null)}
            onConfirm={(notes) => void handleConfirmDecline(notes)}
          />
        </Suspense>
      ) : null}
    </div>
  );
}
