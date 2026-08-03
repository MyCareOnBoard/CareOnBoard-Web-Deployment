import { useMemo, useState } from "react";
import type {
  AgencyExpenseListItem,
  ExpenseStatus,
} from "@/lib/api/billing-expenses";
import ExpenseRow from "./ExpenseRow";
import { STATUS_FILTER_OPTIONS } from "../utils/expensesDashboardUtils";
import {
  EXPENSES_TABLE_HEADER_CLASS,
  EXPENSES_TABLE_MIN_WIDTH,
  NETWORK_EXPENSES_TABLE_HEADER_CLASS,
  NETWORK_EXPENSES_TABLE_MIN_WIDTH,
} from "./tableColumns";
import {
  assertNetworkExpenseRows,
  type NetworkAgencyExpense,
} from "./expenseTableTypes";

const SKELETON_ROW_COUNT = 8;

type SharedExpensesHistoryTableProps<T extends AgencyExpenseListItem> = {
  expenses: T[];
  totalCount: number;
  hasMore: boolean;
  page: number;
  loading?: boolean;
  statusFilter: ExpenseStatus | "all";
  onStatusFilterChange: (status: ExpenseStatus | "all") => void;
  statusFilterOptions?: Array<{ value: ExpenseStatus | "all"; label: string }>;
  onLoadMore?: () => void;
  noun?: string;
  isRefetching?: boolean;
  nextCursor?: string | null;
};

type ExpensesHistoryTableProps =
  | (SharedExpensesHistoryTableProps<AgencyExpenseListItem> & {
      showAgency?: false;
    })
  | (SharedExpensesHistoryTableProps<NetworkAgencyExpense> & {
      showAgency: true;
    });

function SkeletonRow({ showAgency = false }: { showAgency?: boolean }) {
  return (
    <div
      className={`${(showAgency ? NETWORK_EXPENSES_TABLE_HEADER_CLASS : EXPENSES_TABLE_HEADER_CLASS).replace("font-semibold", "")} animate-pulse`}
      aria-hidden
    >
      {Array.from({ length: showAgency ? 8 : 7 }).map((_, index) => (
        <span key={index} className="h-4 rounded bg-[#eef4f5]" />
      ))}
    </div>
  );
}

export default function ExpensesHistoryTable(props: ExpensesHistoryTableProps) {
  const {
    expenses,
    totalCount,
    hasMore,
    page,
    loading = false,
    statusFilter,
    onStatusFilterChange,
    statusFilterOptions = STATUS_FILTER_OPTIONS,
    onLoadMore,
    noun = "DSP",
    isRefetching = false,
    nextCursor,
  } = props;
  const showAgency = props.showAgency === true;

  if (showAgency) {
    assertNetworkExpenseRows(expenses);
  }
  const [searchQuery, setSearchQuery] = useState("");

  const filteredExpenses = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return expenses;
    }
    return expenses.filter((expense) =>
      expense.employeeName.toLowerCase().includes(query),
    );
  }, [expenses, searchQuery]);

  const isInitialLoading = loading && expenses.length === 0;
  const isBusy = loading || isRefetching;
  const emptyMessage = isInitialLoading
    ? ""
    : totalCount === 0
      ? "No expense submissions match your filters."
      : filteredExpenses.length === 0
        ? "No expenses match your search."
        : "";
  const expenseKey = (expense: AgencyExpenseListItem) =>
    props.showAgency
      ? `${(expense as NetworkAgencyExpense).agencyId}:${expense.id}`
      : expense.id;
  const renderExpenseRow = (
    expense: AgencyExpenseListItem,
    variant: "desktop" | "mobile",
  ) =>
    props.showAgency ? (
      <ExpenseRow
        key={expenseKey(expense)}
        expense={expense as NetworkAgencyExpense}
        showAgency
        variant={variant}
      />
    ) : (
      <ExpenseRow
        key={expenseKey(expense)}
        expense={expense}
        variant={variant}
      />
    );

  return (
    <section>
      <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <h2 className="text-[18px] font-semibold text-[#10141a]">
          All submissions
        </h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="flex items-center gap-2 text-[13px] text-[#10141a]">
            <span className="whitespace-nowrap text-[#808081]">Status</span>
            <select
              value={statusFilter}
              onChange={(event) =>
                onStatusFilterChange(
                  event.target.value as ExpenseStatus | "all",
                )
              }
              className="min-h-[44px] rounded-md border border-[#e5e5e6] bg-white px-3 py-2 text-[13px] text-[#10141a]"
            >
              {statusFilterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={"Search by " + noun + " name"}
            className="min-h-[44px] w-full rounded-md border border-[#e5e5e6] bg-white px-3 py-2 text-[13px] text-[#10141a] sm:w-64"
          />
        </div>
      </div>

      <div className="hidden overflow-hidden rounded-[16px] border border-[#e5e5e6] bg-white lg:block">
        <div className="overflow-x-auto">
          <div
            className={
              showAgency
                ? NETWORK_EXPENSES_TABLE_MIN_WIDTH
                : EXPENSES_TABLE_MIN_WIDTH
            }
          >
            <div
              className={
                showAgency
                  ? NETWORK_EXPENSES_TABLE_HEADER_CLASS
                  : EXPENSES_TABLE_HEADER_CLASS
              }
            >
              {showAgency ? <span>Agency</span> : null}
              <span>{noun}</span>
              <span>Amount</span>
              <span>Category</span>
              <span>Description</span>
              <span>Date</span>
              <span>Status</span>
              <span className="text-right">Receipt</span>
            </div>
            {isInitialLoading && page === 1 ? (
              Array.from({ length: SKELETON_ROW_COUNT }).map((_, index) => (
                <SkeletonRow key={index} showAgency={showAgency} />
              ))
            ) : filteredExpenses.length > 0 ? (
              filteredExpenses.map((expense) =>
                renderExpenseRow(expense, "desktop"),
              )
            ) : (
              <div className="px-4 py-10 text-center text-[14px] text-[#808081]">
                {emptyMessage}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-3 lg:hidden">
        {isInitialLoading && page === 1 ? (
          Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-28 animate-pulse rounded-[16px] border border-[#e5e5e6] bg-white"
            />
          ))
        ) : filteredExpenses.length > 0 ? (
          filteredExpenses.map((expense) => renderExpenseRow(expense, "mobile"))
        ) : (
          <div className="rounded-[16px] border border-[#e5e5e6] bg-white px-4 py-10 text-center text-[14px] text-[#808081]">
            {emptyMessage}
          </div>
        )}
      </div>

      {(nextCursor || hasMore) && onLoadMore ? (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={isBusy}
            aria-busy={isBusy}
            aria-label="Load more expenses"
            className="min-h-[44px] w-full rounded-full border border-[#00b4b8] px-5 py-2 text-[13px] font-semibold text-[#00b4b8] hover:bg-[#eef4f5] disabled:opacity-50 sm:w-auto"
          >
            {isBusy ? "Loading…" : "Load more expenses"}
          </button>
        </div>
      ) : null}
    </section>
  );
}
