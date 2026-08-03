import { formatCurrency } from "@/pages/agency/billing-and-approvals/billingUtils";
import type { PayrollInvoiceListItem } from "@/lib/api/payroll";
import BillingStatusBadge from "../../components/BillingStatusBadge";
import { cn } from "@/lib/utils";
import { formatPayrollDateRangeLabel } from "../utils/payrollDashboardUtils";
import {
  SAVED_PAYROLL_HEADER_CLASS,
  SAVED_PAYROLL_ROW_CLASS,
  SAVED_PAYROLL_TABLE_MIN_WIDTH,
  NETWORK_SAVED_PAYROLL_TABLE_GRID,
} from "./tableColumns";
import ClaimsTablePagination from "../../claims/components/ClaimsTablePagination";

const SKELETON_ROW_COUNT = 8;

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
  invoices: Array<PayrollInvoiceListItem & { agencyId?: string; agencyName?: string }>;
  loading?: boolean;
  isRefetching?: boolean;
  showAgency?: boolean;
  nextCursor?: string | null;
  onLoadMore?: () => void;
  onViewInvoice: (invoice: PayrollInvoiceListItem) => void;
  onMarkPaid?: (invoice: PayrollInvoiceListItem) => void;
  onCancel?: (invoice: PayrollInvoiceListItem) => void;
  actionsDisabled?: boolean;
};

function SavedPayrollSkeletonRow({ showAgency = false }: { showAgency?: boolean }) {
  return (
    <div className={`${showAgency ? `${NETWORK_SAVED_PAYROLL_TABLE_GRID} py-3.5 border-b border-[#e5e5e6] last:border-b-0` : SAVED_PAYROLL_ROW_CLASS} animate-pulse`} aria-hidden="true">
      {Array.from({ length: showAgency ? 8 : 7 }).map((_, index) => (
        <span key={index} className="h-4 rounded bg-[#eef4f5]" />
      ))}
    </div>
  );
}

type SavedPayrollRowProps = {
  invoice: PayrollInvoiceListItem & { agencyId?: string; agencyName?: string };
  showAgency?: boolean;
  onViewInvoice: (invoice: PayrollInvoiceListItem) => void;
  onMarkPaid?: (invoice: PayrollInvoiceListItem) => void;
  onCancel?: (invoice: PayrollInvoiceListItem) => void;
  actionsDisabled?: boolean;
};

function SavedPayrollRow({
  invoice,
  showAgency = false,
  onViewInvoice,
  onMarkPaid,
  onCancel,
  actionsDisabled = false,
}: SavedPayrollRowProps) {
  return (
    <div className={showAgency ? `${NETWORK_SAVED_PAYROLL_TABLE_GRID} py-3.5 border-b border-[#e5e5e6] last:border-b-0` : SAVED_PAYROLL_ROW_CLASS}>
      {showAgency ? <span className="truncate text-[13px] text-[#10141a]">{invoice.agencyName ?? "—"}</span> : null}
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
      <span>
        <BillingStatusBadge domain="payroll" status={invoice.status} />
      </span>
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

function SavedPayrollMobileCard({
  invoice,
  onViewInvoice,
  onMarkPaid,
  onCancel,
  actionsDisabled = false,
}: SavedPayrollRowProps) {
  return (
    <article className="rounded-[16px] border border-[#e5e5e6] bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold text-[#10141a]">{invoice.invoiceNumber}</p>
          <p className="mt-1 truncate text-[13px] text-[#808081]">{invoice.employeeName ?? "Unknown staff"}</p>
        </div>
        <BillingStatusBadge domain="payroll" status={invoice.status} />
      </div>
      <dl className="mt-4 space-y-2 text-[13px]">
        <div className="flex justify-between gap-4"><dt className="text-[#808081]">Agency</dt><dd className="text-right font-medium text-[#10141a]">{invoice.agencyName ?? "—"}</dd></div>
        <div className="flex justify-between gap-4"><dt className="text-[#808081]">Period</dt><dd className="text-right text-[#10141a]">{formatPayrollDateRangeLabel(invoice.periodStart, invoice.periodEnd)}</dd></div>
        <div className="flex justify-between gap-4"><dt className="text-[#808081]">Amount</dt><dd className="font-medium tabular-nums text-[#10141a]">{formatCurrency(invoice.grossAmount)}</dd></div>
      </dl>
      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <button type="button" className={SAVED_PAYROLL_VIEW_BUTTON_CLASS} onClick={() => onViewInvoice(invoice)} disabled={actionsDisabled}>View invoice</button>
        {invoice.status === "pending" && onMarkPaid ? <button type="button" className={SAVED_PAYROLL_MARK_PAID_BUTTON_CLASS} onClick={() => onMarkPaid(invoice)} disabled={actionsDisabled}>Mark as paid</button> : null}
        {invoice.status === "pending" && onCancel ? <button type="button" className={SAVED_PAYROLL_CANCEL_BUTTON_CLASS} onClick={() => onCancel(invoice)} disabled={actionsDisabled}>Cancel</button> : null}
      </div>
    </article>
  );
}

export default function SavedPayrollTable({
  invoices,
  loading = false,
  isRefetching = false,
  showAgency = false,
  nextCursor,
  onLoadMore,
  onViewInvoice,
  onMarkPaid,
  onCancel,
  actionsDisabled = false,
}: SavedPayrollTableProps) {
  const emptyMessage = loading
    ? ""
    : "No payroll invoices yet. Create one from Staff to pay.";

  return (
    <div className={cn("transition-opacity duration-200", isRefetching && !loading && "opacity-60")}>
      {isRefetching && !loading ? <p className="mb-4 text-[13px] text-[#808081]">Updating payroll invoices…</p> : null}
    <div className={cn("overflow-hidden rounded-[16px] border border-[#e5e5e6] bg-white", showAgency && "hidden lg:block")}>
      <div className="overflow-x-auto">
        <div className={SAVED_PAYROLL_TABLE_MIN_WIDTH}>
          <div className={showAgency ? `${NETWORK_SAVED_PAYROLL_TABLE_GRID} bg-[#fafafa] py-3 text-[13px] font-semibold text-[#10141a] border-b border-[#e5e5e6]` : SAVED_PAYROLL_HEADER_CLASS}>
            {showAgency ? <span>Agency</span> : null}
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
              <SavedPayrollSkeletonRow key={`saved-skeleton-${index}`} showAgency={showAgency} />
            ))
          ) : invoices.length > 0 ? (
            invoices.map((invoice) => (
              <SavedPayrollRow
                key={invoice.id}
                invoice={invoice}
                showAgency={showAgency}
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
      {showAgency ? (
        <div className="space-y-2 lg:hidden">
          {loading ? Array.from({ length: SKELETON_ROW_COUNT }).map((_, index) => (
            <div key={`saved-skeleton-mobile-${index}`} className="h-44 animate-pulse rounded-[16px] border border-[#e5e5e6] bg-[#eef4f5]" aria-hidden="true" />
          )) : invoices.map((invoice) => (
            <SavedPayrollMobileCard key={invoice.id} invoice={invoice} onViewInvoice={onViewInvoice} onMarkPaid={onMarkPaid} onCancel={onCancel} actionsDisabled={actionsDisabled} />
          ))}
        </div>
      ) : null}
      <ClaimsTablePagination
        isRefetching={isRefetching}
        nextCursor={nextCursor}
        onLoadMore={onLoadMore}
        loadMoreLabel="Load more payroll invoices"
        terminalLabel="All payroll invoices loaded"
      />
      </div>
    </div>
  );
}
