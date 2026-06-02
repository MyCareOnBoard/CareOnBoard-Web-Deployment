import { formatCurrency } from "@/pages/agency/billing-and-approvals/billingUtils";
import type { PayrollInvoiceListItem, PayrollInvoiceStatus } from "@/lib/api/payroll";
import { cn } from "@/lib/utils";
import { formatPayrollDateRangeLabel } from "../utils/payrollDashboardUtils";
import {
  SAVED_PAYROLL_HEADER_CLASS,
  SAVED_PAYROLL_ROW_CLASS,
  SAVED_PAYROLL_TABLE_MIN_WIDTH,
} from "./tableColumns";

const SKELETON_ROW_COUNT = 8;

const STATUS_LABELS: Record<PayrollInvoiceStatus, string> = {
  pending: "Pending",
  paid: "Paid",
};

const SAVED_PAYROLL_ACTION_BUTTON_BASE =
  "cursor-pointer whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-medium transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-60";

const SAVED_PAYROLL_VIEW_BUTTON_CLASS = cn(
  SAVED_PAYROLL_ACTION_BUTTON_BASE,
  "border border-[#e5e5e6] bg-white text-[#10141a] hover:border-[#00b4b8]/40 hover:bg-[#eef4f5] active:scale-[0.98]",
);

const SAVED_PAYROLL_MARK_PAID_BUTTON_CLASS = cn(
  SAVED_PAYROLL_ACTION_BUTTON_BASE,
  "bg-[#00b4b8] text-white hover:bg-[#009da1] active:scale-[0.98] active:bg-[#009199]",
);

const SAVED_PAYROLL_CANCEL_BUTTON_CLASS = cn(
  SAVED_PAYROLL_ACTION_BUTTON_BASE,
  "border border-[#ef4444]/30 text-[#ef4444] hover:border-[#ef4444]/50 hover:bg-[#fef2f2] active:scale-[0.98]",
);

type SavedPayrollTableProps = {
  invoices: PayrollInvoiceListItem[];
  loading?: boolean;
  onViewInvoice: (invoice: PayrollInvoiceListItem) => void;
  onMarkPaid?: (invoice: PayrollInvoiceListItem) => void;
  onCancel?: (invoice: PayrollInvoiceListItem) => void;
  actionsDisabled?: boolean;
};

function SavedPayrollSkeletonRow() {
  return (
    <div className={`${SAVED_PAYROLL_ROW_CLASS} animate-pulse`} aria-hidden="true">
      {Array.from({ length: 7 }).map((_, index) => (
        <span key={index} className="h-4 rounded bg-[#eef4f5]" />
      ))}
    </div>
  );
}

type SavedPayrollRowProps = {
  invoice: PayrollInvoiceListItem;
  onViewInvoice: (invoice: PayrollInvoiceListItem) => void;
  onMarkPaid?: (invoice: PayrollInvoiceListItem) => void;
  onCancel?: (invoice: PayrollInvoiceListItem) => void;
  actionsDisabled?: boolean;
};

function SavedPayrollRow({
  invoice,
  onViewInvoice,
  onMarkPaid,
  onCancel,
  actionsDisabled = false,
}: SavedPayrollRowProps) {
  return (
    <div className={SAVED_PAYROLL_ROW_CLASS}>
      <span className="truncate text-[14px] font-medium text-[#10141a]">{invoice.invoiceNumber}</span>
      <span className="truncate text-[14px] text-[#10141a]">
        {invoice.employeeName ?? "Unknown staff"}
      </span>
      <span
        className="truncate whitespace-nowrap text-[13px] tabular-nums text-[#10141a]"
        title={formatPayrollDateRangeLabel(invoice.periodStart, invoice.periodEnd)}
      >
        {formatPayrollDateRangeLabel(invoice.periodStart, invoice.periodEnd)}
      </span>
      <span className="text-[14px] tabular-nums text-[#10141a]">{invoice.totalHours}</span>
      <span className="text-[14px] tabular-nums text-[#10141a]">
        {formatCurrency(invoice.grossAmount)}
      </span>
      <span className="text-[14px] text-[#10141a]">{STATUS_LABELS[invoice.status]}</span>
      <div className="flex shrink-0 justify-end gap-2">
        <button
          type="button"
          className={SAVED_PAYROLL_VIEW_BUTTON_CLASS}
          onClick={() => onViewInvoice(invoice)}
          disabled={actionsDisabled}
        >
          View invoice
        </button>
        {invoice.status === "pending" && onMarkPaid && (
          <button
            type="button"
            className={SAVED_PAYROLL_MARK_PAID_BUTTON_CLASS}
            onClick={() => onMarkPaid(invoice)}
            disabled={actionsDisabled}
          >
            Mark as paid
          </button>
        )}
        {invoice.status === "pending" && onCancel && (
          <button
            type="button"
            className={SAVED_PAYROLL_CANCEL_BUTTON_CLASS}
            onClick={() => onCancel(invoice)}
            disabled={actionsDisabled}
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

export default function SavedPayrollTable({
  invoices,
  loading = false,
  onViewInvoice,
  onMarkPaid,
  onCancel,
  actionsDisabled = false,
}: SavedPayrollTableProps) {
  const emptyMessage = loading
    ? ""
    : "No payroll invoices yet. Create one from Staff to pay.";

  return (
    <div className="overflow-hidden rounded-[16px] border border-[#e5e5e6] bg-white">
      <div className="overflow-x-auto">
        <div className={SAVED_PAYROLL_TABLE_MIN_WIDTH}>
          <div className={SAVED_PAYROLL_HEADER_CLASS}>
            <span>Invoice</span>
            <span>Staff</span>
            <span>Period</span>
            <span>Hours</span>
            <span>Amount</span>
            <span>Status</span>
            <span className="text-right">Actions</span>
          </div>

          {loading ? (
            Array.from({ length: SKELETON_ROW_COUNT }).map((_, index) => (
              <SavedPayrollSkeletonRow key={`saved-skeleton-${index}`} />
            ))
          ) : invoices.length > 0 ? (
            invoices.map((invoice) => (
              <SavedPayrollRow
                key={invoice.id}
                invoice={invoice}
                onViewInvoice={onViewInvoice}
                onMarkPaid={onMarkPaid}
                onCancel={onCancel}
                actionsDisabled={actionsDisabled}
              />
            ))
          ) : (
            <div className="px-4 py-10 text-center">
              <p className="text-[14px] font-medium text-[#808081]">{emptyMessage}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
