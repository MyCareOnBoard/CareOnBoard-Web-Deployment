import { useMemo, useState } from "react";
import type { AgencyExpenseListItem } from "@/lib/api/billing-expenses";
import ExpenseRow from "./ExpenseRow";
import {
  EXPENSES_TABLE_HEADER_CLASS,
  EXPENSES_TABLE_MIN_WIDTH,
  NETWORK_EXPENSES_TABLE_HEADER_CLASS,
  NETWORK_EXPENSES_TABLE_MIN_WIDTH,
} from "./tableColumns";

const SKELETON_ROW_COUNT = 8;

type AgencyAwareExpense = AgencyExpenseListItem & {
  agencyId?: string;
  agencyName?: string;
};

type PendingExpensesTableProps = {
  expenses: AgencyAwareExpense[];
  loading?: boolean;
  onApprove: (expense: AgencyExpenseListItem) => void;
  onDecline: (expense: AgencyExpenseListItem) => void;
  onDelete: (expense: AgencyExpenseListItem) => void;
  actionsDisabled?: boolean;
  noun?: string;
  showAgency?: boolean;
};

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

export default function PendingExpensesTable({
  expenses,
  loading = false,
  onApprove,
  onDecline,
  onDelete,
  actionsDisabled = false,
  noun = "DSP",
  showAgency = false,
}: PendingExpensesTableProps) {
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

  return (
    <section>
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-[18px] font-semibold text-[#10141a]">
          Awaiting review
        </h2>
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder={"Search by " + noun + " name"}
          className="min-h-[44px] w-full max-w-xs rounded-md border border-[#e5e5e6] bg-white px-3 py-2 text-[13px] text-[#10141a] sm:w-64"
        />
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
              <span className="text-right">Actions</span>
            </div>
            {isInitialLoading ? (
              Array.from({ length: SKELETON_ROW_COUNT }).map((_, index) => (
                <SkeletonRow key={index} showAgency={showAgency} />
              ))
            ) : filteredExpenses.length > 0 ? (
              filteredExpenses.map((expense) => (
                <ExpenseRow
                  key={
                    showAgency
                      ? `${expense.agencyId}:${expense.id}`
                      : expense.id
                  }
                  expense={expense}
                  showActions
                  actionsDisabled={actionsDisabled}
                  showAgency={showAgency}
                  onApprove={onApprove}
                  onDecline={onDecline}
                  onDelete={onDelete}
                />
              ))
            ) : (
              <div className="px-4 py-10 text-center text-[14px] text-[#808081]">
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
              className="h-32 animate-pulse rounded-[16px] border border-[#e5e5e6] bg-white"
            />
          ))
        ) : filteredExpenses.length > 0 ? (
          filteredExpenses.map((expense) => (
            <ExpenseRow
              key={
                showAgency ? `${expense.agencyId}:${expense.id}` : expense.id
              }
              expense={expense}
              variant="mobile"
              showActions
              actionsDisabled={actionsDisabled}
              showAgency={showAgency}
              onApprove={onApprove}
              onDecline={onDecline}
              onDelete={onDelete}
            />
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
