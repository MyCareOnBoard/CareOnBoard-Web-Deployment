import { formatCurrency } from "@/pages/agency/billing-and-approvals/billingUtils";
import type { AgencyExpenseListItem } from "@/lib/api/billing-expenses";
import {
  EXPENSES_TABLE_ROW_CLASS,
  NETWORK_EXPENSES_TABLE_ROW_CLASS,
} from "./tableColumns";
import ExpenseActionsMenu from "./ExpenseActionsMenu";
import { AgencyPerson, AgencyPill, type AgencyTone } from "@/components/agency/AgencyListKit";
import {
  assertNetworkExpenseRows,
  type ExpenseActionCallbacks,
  type NetworkAgencyExpense,
} from "./expenseTableTypes";

type SharedExpenseRowProps<T extends AgencyExpenseListItem> =
  ExpenseActionCallbacks<T> & {
    expense: T;
    showActions?: boolean;
    actionsDisabled?: boolean;
    variant?: "desktop" | "mobile";
  };

type ExpenseRowProps =
  | (SharedExpenseRowProps<AgencyExpenseListItem> & { showAgency?: false })
  | (SharedExpenseRowProps<NetworkAgencyExpense> & { showAgency: true });

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

const STATUS_TONE: Record<AgencyExpenseListItem["status"], AgencyTone> = {
  pending: "amber",
  approved: "green",
  rejected: "red",
};

function openReceipt(expense: AgencyExpenseListItem) {
  if (expense.receiptUrl)
    window.open(expense.receiptUrl, "_blank", "noopener,noreferrer");
}

export default function ExpenseRow(props: ExpenseRowProps) {
  const {
    expense,
    showActions = false,
    actionsDisabled = false,
    variant = "desktop",
  } = props;
  const showAgency = props.showAgency === true;

  if (showAgency) {
    assertNetworkExpenseRows([expense]);
  }

  const agencyName = showAgency
    ? (expense as NetworkAgencyExpense).agencyName
    : undefined;
  const hasMobileMenu = showActions || Boolean(expense.receiptUrl);
  const renderActionsMenu = (menuVariant: "desktop" | "mobile") => {
    if (props.showAgency) {
      return (
        <ExpenseActionsMenu
          showAgency
          expense={props.expense}
          variant={menuVariant}
          disabled={actionsDisabled}
          onViewReceipt={
            props.expense.receiptUrl
              ? (props.onViewReceipt ?? openReceipt)
              : undefined
          }
          onApprove={showActions ? props.onApprove : undefined}
          onDecline={showActions ? props.onDecline : undefined}
          onDelete={showActions ? props.onDelete : undefined}
        />
      );
    }

    return (
      <ExpenseActionsMenu
        expense={props.expense}
        variant={menuVariant}
        disabled={actionsDisabled}
        onViewReceipt={
          props.expense.receiptUrl
            ? (props.onViewReceipt ?? openReceipt)
            : undefined
        }
        onApprove={showActions ? props.onApprove : undefined}
        onDecline={showActions ? props.onDecline : undefined}
        onDelete={showActions ? props.onDelete : undefined}
      />
    );
  };

  if (variant === "mobile") {
    return (
      <article className="relative rounded-[16px] border border-[#e4e7ea] bg-white px-4 py-4 dark:border-white/10 dark:bg-[#1b232b]">
        {hasMobileMenu ? (
          <div className="absolute right-2 top-2">
            {renderActionsMenu("mobile")}
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
            {agencyName}
          </p>
        ) : null}
        <p className="mt-1 text-[13px] text-[#808081]">
          {expense.message || "—"}
        </p>
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-[14px] font-semibold tabular-nums text-[#10141a]">
            {formatCurrency(expense.amount)}
          </p>
          <AgencyPill tone={STATUS_TONE[expense.status]}>{statusLabel(expense.status)}</AgencyPill>
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
          className="truncate text-[14px] font-medium text-[#10141a] dark:text-[#f4f6f7]"
          title={agencyName}
        >
          {agencyName}
        </span>
      ) : null}
      <div className="text-[14px]">
        <AgencyPerson name={expense.employeeName} />
      </div>
      <span className="text-[14px] tabular-nums text-[#10141a] dark:text-[#e6eaec]">
        {formatCurrency(expense.amount)}
      </span>
      <span className="text-[14px] text-[#2a3138] dark:text-[#c9d1d4]">
        {expense.category || "—"}
      </span>
      <span
        className="truncate text-[14px] text-[#4b535b] dark:text-[#9aa4a8]"
        title={expense.message}
      >
        {expense.message || "—"}
      </span>
      <span className="text-[14px] text-[#2a3138] dark:text-[#c9d1d4]">
        {formatExpenseDate(expense.date)}
      </span>
      <div>
        <AgencyPill tone={STATUS_TONE[expense.status]}>{statusLabel(expense.status)}</AgencyPill>
      </div>
      <div className="flex justify-end">{renderActionsMenu("desktop")}</div>
    </div>
  );
}
