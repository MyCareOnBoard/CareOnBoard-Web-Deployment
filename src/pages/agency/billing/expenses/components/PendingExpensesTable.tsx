import { useMemo, useState } from "react";
import { formatCurrency } from "@/pages/agency/billing-and-approvals/billingUtils";
import type { AgencyExpenseListItem } from "@/lib/api/billing-expenses";
import ExpenseRow from "./ExpenseRow";
import ExpenseActionsMenu from "./ExpenseActionsMenu";
import {
  EXPENSES_TABLE_HEADER_CLASS,
  EXPENSES_TABLE_MIN_WIDTH,
} from "./tableColumns";

const SKELETON_ROW_COUNT = 8;

type PendingExpensesTableProps = {
  expenses: AgencyExpenseListItem[];
  loading?: boolean;
  onApprove: (expense: AgencyExpenseListItem) => void;
  onDecline: (expense: AgencyExpenseListItem) => void;
  onDelete: (expense: AgencyExpenseListItem) => void;
  actionsDisabled?: boolean;
};

function SkeletonRow() {
  return (
    <div className={`${EXPENSES_TABLE_HEADER_CLASS.replace("font-semibold", "")} animate-pulse`} aria-hidden>
      {Array.from({ length: 7 }).map((_, index) => (
        <span key={index} className="h-4 rounded bg-[#eef4f5]" />
      ))}
    </div>
  );
}

export default function PendingExpensesTable({
  expenses,
  loading = false,
  onApprove,
  onDecline,
  onDelete,
  actionsDisabled = false,
}: PendingExpensesTableProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredExpenses = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return expenses;
    }
    return expenses.filter((expense) => expense.employeeName.toLowerCase().includes(query));
  }, [expenses, searchQuery]);

  const emptyMessage = loading
    ? ""
    : expenses.length === 0
      ? "No expenses awaiting review for this date range."
      : filteredExpenses.length === 0
        ? "No expenses match your search."
        : "";

  return (
    <section>
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-[18px] font-semibold text-[#10141a]">Awaiting review</h2>
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search by DSP name"
          className="w-full max-w-xs rounded-md border border-[#e5e5e6] bg-white px-3 py-2 text-[13px] text-[#10141a] sm:w-64"
        />
      </div>

      <div className="hidden overflow-hidden rounded-[16px] border border-[#e5e5e6] bg-white lg:block">
        <div className="overflow-x-auto">
          <div className={EXPENSES_TABLE_MIN_WIDTH}>
            <div className={EXPENSES_TABLE_HEADER_CLASS}>
              <span>DSP</span>
              <span>Amount</span>
              <span>Category</span>
              <span>Description</span>
              <span>Date</span>
              <span>Status</span>
              <span className="text-right">Actions</span>
            </div>
            {loading ? (
              Array.from({ length: SKELETON_ROW_COUNT }).map((_, index) => (
                <SkeletonRow key={index} />
              ))
            ) : filteredExpenses.length > 0 ? (
              filteredExpenses.map((expense) => (
                <ExpenseRow
                  key={expense.id}
                  expense={expense}
                  showActions
                  actionsDisabled={actionsDisabled}
                  onApprove={onApprove}
                  onDecline={onDecline}
                  onDelete={onDelete}
                />
              ))
            ) : (
              <div className="px-4 py-10 text-center text-[14px] text-[#808081]">{emptyMessage}</div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-3 lg:hidden">
        {loading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-32 animate-pulse rounded-[16px] border border-[#e5e5e6] bg-white" />
          ))
        ) : filteredExpenses.length > 0 ? (
          filteredExpenses.map((expense) => (
            <div key={expense.id} className="relative rounded-[16px] border border-[#e5e5e6] bg-white px-4 py-4">
              <div className="absolute right-2 top-2">
                <ExpenseActionsMenu
                  expense={expense}
                  variant="mobile"
                  disabled={actionsDisabled}
                  onViewReceipt={
                    expense.receiptUrl
                      ? () => window.open(expense.receiptUrl!, "_blank", "noopener,noreferrer")
                      : undefined
                  }
                  onApprove={onApprove}
                  onDecline={onDecline}
                  onDelete={onDelete}
                />
              </div>

              <p className="pr-14 text-[15px] font-semibold text-[#10141a]">{expense.employeeName}</p>
              <p className="mt-1 text-[13px] text-[#808081]">{expense.message}</p>
              <p className="mt-3 text-[14px] font-semibold tabular-nums text-[#10141a]">
                {formatCurrency(expense.amount)}
              </p>
            </div>
          ))
        ) : (
          <div className="rounded-[16px] border border-[#e5e5e6] bg-white px-4 py-10 text-center text-[14px] text-[#808081]">
            {emptyMessage}
          </div>
        )}
      </div>
    </section>
  );
}
