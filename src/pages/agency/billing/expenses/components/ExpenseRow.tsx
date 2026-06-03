import { formatCurrency } from "@/pages/agency/billing-and-approvals/billingUtils";
import type { AgencyExpenseListItem } from "@/lib/api/billing-expenses";
import { EXPENSES_TABLE_ROW_CLASS } from "./tableColumns";
import ExpenseActionsMenu from "./ExpenseActionsMenu";

type ExpenseRowProps = {
  expense: AgencyExpenseListItem;
  showActions?: boolean;
  actionsDisabled?: boolean;
  onViewReceipt?: (expense: AgencyExpenseListItem) => void;
  onApprove?: (expense: AgencyExpenseListItem) => void;
  onDecline?: (expense: AgencyExpenseListItem) => void;
  onDelete?: (expense: AgencyExpenseListItem) => void;
};

function formatExpenseDate(value: string | null) {
  if (!value) {
    return "—";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleDateString("en-US");
}

function statusLabel(status: AgencyExpenseListItem["status"]) {
  if (status === "pending") return "Awaiting review";
  if (status === "approved") return "Approved";
  return "Declined";
}

function openReceipt(expense: AgencyExpenseListItem) {
  if (!expense.receiptUrl) return;
  window.open(expense.receiptUrl, "_blank", "noopener,noreferrer");
}

export default function ExpenseRow({
  expense,
  showActions = false,
  actionsDisabled = false,
  onViewReceipt,
  onApprove,
  onDecline,
  onDelete,
}: ExpenseRowProps) {
  const handleViewReceipt = onViewReceipt ?? openReceipt;

  return (
    <div className={EXPENSES_TABLE_ROW_CLASS}>
      <span className="text-[13px] font-medium text-[#10141a]">{expense.employeeName}</span>
      <span className="text-[13px] tabular-nums text-[#10141a]">{formatCurrency(expense.amount)}</span>
      <span className="text-[13px] text-[#808081]">{expense.category || "—"}</span>
      <span className="truncate text-[13px] text-[#808081]" title={expense.message}>
        {expense.message || "—"}
      </span>
      <span className="text-[13px] text-[#808081]">{formatExpenseDate(expense.date)}</span>
      <span className="text-[13px] text-[#808081]">{statusLabel(expense.status)}</span>
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
