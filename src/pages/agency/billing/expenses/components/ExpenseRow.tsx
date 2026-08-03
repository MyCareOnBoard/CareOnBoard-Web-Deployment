import { formatCurrency } from "@/pages/agency/billing-and-approvals/billingUtils";
import type { AgencyExpenseListItem } from "@/lib/api/billing-expenses";
import {
  EXPENSES_TABLE_ROW_CLASS,
  NETWORK_EXPENSES_TABLE_ROW_CLASS,
} from "./tableColumns";
import ExpenseActionsMenu from "./ExpenseActionsMenu";

type AgencyAwareExpense = AgencyExpenseListItem & {
  agencyId?: string;
  agencyName?: string;
};

type ExpenseRowProps = {
  expense: AgencyAwareExpense;
  showActions?: boolean;
  actionsDisabled?: boolean;
  showAgency?: boolean;
  variant?: "desktop" | "mobile";
  onViewReceipt?: (expense: AgencyExpenseListItem) => void;
  onApprove?: (expense: AgencyExpenseListItem) => void;
  onDecline?: (expense: AgencyExpenseListItem) => void;
  onDelete?: (expense: AgencyExpenseListItem) => void;
};

function formatExpenseDate(value: string | null) {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleDateString("en-US");
}

function statusLabel(status: AgencyExpenseListItem["status"]) {
  if (status === "pending") return "Awaiting review";
  if (status === "approved") return "Approved";
  return "Declined";
}

function openReceipt(expense: AgencyExpenseListItem) {
  if (expense.receiptUrl)
    window.open(expense.receiptUrl, "_blank", "noopener,noreferrer");
}

export default function ExpenseRow({
  expense,
  showActions = false,
  actionsDisabled = false,
  showAgency = false,
  variant = "desktop",
  onViewReceipt,
  onApprove,
  onDecline,
  onDelete,
}: ExpenseRowProps) {
  const handleViewReceipt = onViewReceipt ?? openReceipt;
  const hasMobileMenu = showActions || Boolean(expense.receiptUrl);

  if (variant === "mobile") {
    return (
      <article className="relative rounded-[16px] border border-[#e5e5e6] bg-white px-4 py-4">
        {hasMobileMenu ? (
          <div className="absolute right-2 top-2">
            <ExpenseActionsMenu
              expense={expense}
              variant="mobile"
              disabled={actionsDisabled}
              onViewReceipt={expense.receiptUrl ? handleViewReceipt : undefined}
              onApprove={showActions ? onApprove : undefined}
              onDecline={showActions ? onDecline : undefined}
              onDelete={showActions ? onDelete : undefined}
            />
          </div>
        ) : null}
        <p
          className={
            hasMobileMenu
              ? "pr-14 text-[15px] font-semibold text-[#10141a]"
              : "text-[15px] font-semibold text-[#10141a]"
          }
        >
          {expense.employeeName}
        </p>
        {showAgency ? (
          <p className="mt-1 text-[13px] text-[#808081]">
            <span className="font-medium text-[#10141a]">Agency</span>{" "}
            {expense.agencyName ?? "—"}
          </p>
        ) : null}
        <p className="mt-1 text-[13px] text-[#808081]">
          {expense.message || "—"}
        </p>
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-[14px] font-semibold tabular-nums text-[#10141a]">
            {formatCurrency(expense.amount)}
          </p>
          <p className="text-[13px] text-[#808081]">
            {statusLabel(expense.status)}
          </p>
        </div>
      </article>
    );
  }

  return (
    <div
      className={
        showAgency ? NETWORK_EXPENSES_TABLE_ROW_CLASS : EXPENSES_TABLE_ROW_CLASS
      }
    >
      {showAgency ? (
        <span
          className="truncate text-[13px] font-medium text-[#10141a]"
          title={expense.agencyName}
        >
          {expense.agencyName ?? "—"}
        </span>
      ) : null}
      <span className="text-[13px] font-medium text-[#10141a]">
        {expense.employeeName}
      </span>
      <span className="text-[13px] tabular-nums text-[#10141a]">
        {formatCurrency(expense.amount)}
      </span>
      <span className="text-[13px] text-[#808081]">
        {expense.category || "—"}
      </span>
      <span
        className="truncate text-[13px] text-[#808081]"
        title={expense.message}
      >
        {expense.message || "—"}
      </span>
      <span className="text-[13px] text-[#808081]">
        {formatExpenseDate(expense.date)}
      </span>
      <span className="text-[13px] text-[#808081]">
        {statusLabel(expense.status)}
      </span>
      <div className="flex justify-end">
        <ExpenseActionsMenu
          expense={expense}
          variant="desktop"
          disabled={actionsDisabled}
          onViewReceipt={expense.receiptUrl ? handleViewReceipt : undefined}
          onApprove={showActions ? onApprove : undefined}
          onDecline={showActions ? onDecline : undefined}
          onDelete={showActions ? onDelete : undefined}
        />
      </div>
    </div>
  );
}
