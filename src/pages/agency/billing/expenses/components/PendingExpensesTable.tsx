import { useMemo, useState } from "react";
import type { AgencyExpenseListItem } from "@/lib/api/billing-expenses";
import ExpenseRow from "./ExpenseRow";
import {
  EXPENSES_TABLE_HEADER_CLASS,
  EXPENSES_TABLE_MIN_WIDTH,
  EXPENSES_TABLE_ROW_CLASS,
  NETWORK_EXPENSES_TABLE_HEADER_CLASS,
  NETWORK_EXPENSES_TABLE_MIN_WIDTH,
  NETWORK_EXPENSES_TABLE_ROW_CLASS,
} from "./tableColumns";
import {
  assertNetworkExpenseRows,
  type ExpenseActionCallbacks,
  type NetworkAgencyExpense,
} from "./expenseTableTypes";

const SKELETON_ROW_COUNT = 8;

type SharedPendingExpensesTableProps<T extends AgencyExpenseListItem> = Omit<
  ExpenseActionCallbacks<T>,
  "onApprove" | "onDecline" | "onDelete"
> & {
  expenses: T[];
  loading?: boolean;
  onApprove: (expense: T) => void;
  onDecline: (expense: T) => void;
  onDelete: (expense: T) => void;
  actionsDisabled?: boolean;
  noun?: string;
};

type PendingExpensesTableProps =
  | (SharedPendingExpensesTableProps<AgencyExpenseListItem> & {
      showAgency?: false;
    })
  | (SharedPendingExpensesTableProps<NetworkAgencyExpense> & {
      showAgency: true;
    });

function SkeletonRow({ showAgency = false }: { showAgency?: boolean }) {
  return (
    <div
      className={`${(showAgency ? NETWORK_EXPENSES_TABLE_ROW_CLASS : EXPENSES_TABLE_ROW_CLASS)} animate-pulse`}
      aria-hidden
    >
      {Array.from({ length: showAgency ? 8 : 7 }).map((_, index) => (
        <span key={index} className="h-4 rounded bg-[#f4f5f6] dark:bg-white/5" />
      ))}
    </div>
  );
}

export default function PendingExpensesTable(props: PendingExpensesTableProps) {
  const {
    expenses,
    loading = false,
    actionsDisabled = false,
    noun = "DSP",
  } = props;
  const showAgency = props.showAgency === true;

  if (showAgency) {
    assertNetworkExpenseRows(expenses);
  }
  const [searchQuery, setSearchQuery] = useState("");
  const isInitialLoading = loading && expenses.length === 0;

  const filteredExpenses = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return expenses;
    }
    return expenses.filter((expense) =>
      expense.employeeName.toLowerCase().includes(query),
    );
  }, [expenses, searchQuery]);

  const emptyMessage = isInitialLoading
    ? ""
    : expenses.length === 0
      ? "No expenses awaiting review for this date range."
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
        showActions
        actionsDisabled={actionsDisabled}
        onView={props.onView}
        onApprove={props.onApprove}
        onDecline={props.onDecline}
        onDelete={props.onDelete}
      />
    ) : (
      <ExpenseRow
        key={expenseKey(expense)}
        expense={expense}
        variant={variant}
        showActions
        actionsDisabled={actionsDisabled}
        onView={props.onView}
        onApprove={props.onApprove}
        onDecline={props.onDecline}
        onDelete={props.onDelete}
      />
    );

  return (
    <section>
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-semibold text-[#10141a] dark:text-[#f4f6f7]">
          Awaiting review
        </h2>
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder={"Search by " + noun + " name"}
          className="w-full max-w-xs sm:w-64 h-10 rounded-[10px] border border-[#dcdfe2] bg-white px-3.5 text-[14px] text-[#10141a] outline-none placeholder:text-[#9aa1a7] focus:border-[#007679] focus:ring-2 focus:ring-[#007679]/15 dark:border-white/15 dark:bg-[#151c22] dark:text-[#f4f6f7]"
        />
      </div>

      <div className="hidden overflow-hidden rounded-[16px] border border-[#e4e7ea] bg-white dark:border-white/10 dark:bg-[#1b232b] lg:block">
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
              <span className="text-right">Actions</span>
            </div>
            {isInitialLoading ? (
              Array.from({ length: SKELETON_ROW_COUNT }).map((_, index) => (
                <SkeletonRow key={index} showAgency={showAgency} />
              ))
            ) : filteredExpenses.length > 0 ? (
              filteredExpenses.map((expense) =>
                renderExpenseRow(expense, "desktop"),
              )
            ) : (
              <div className="px-4 py-10 text-center text-[14px] text-[#6b737a] dark:text-[#9aa4a8]">
                {emptyMessage}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-3 lg:hidden">
        {isInitialLoading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-32 animate-pulse rounded-[16px] border border-[#e4e7ea] bg-white dark:border-white/10 dark:bg-[#1b232b]"
            />
          ))
        ) : filteredExpenses.length > 0 ? (
          filteredExpenses.map((expense) => renderExpenseRow(expense, "mobile"))
        ) : (
          <div className="rounded-[16px] border border-[#e4e7ea] bg-white dark:border-white/10 dark:bg-[#1b232b] px-4 py-10 text-center text-[14px] text-[#6b737a] dark:text-[#9aa4a8]">
            {emptyMessage}
          </div>
        )}
      </div>
    </section>
  );
}
