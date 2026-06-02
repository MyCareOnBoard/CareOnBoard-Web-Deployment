import { formatCurrency } from "@/pages/agency/billing-and-approvals/billingUtils";
import type { PayrollInvoiceListItem, PayrollInvoiceStatus } from "@/lib/api/payroll";
import { formatPayrollDateRangeLabel } from "../utils/payrollDashboardUtils";

const SKELETON_ROW_COUNT = 8;

const STATUS_LABELS: Record<PayrollInvoiceStatus, string> = {
  pending: "Pending",
  paid: "Paid",
};

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
    <tr className="animate-pulse border-b border-[#f0f0f1]" aria-hidden="true">
      {Array.from({ length: 7 }).map((_, index) => (
        <td key={index} className="px-4 py-4">
          <div className="h-4 max-w-[120px] rounded bg-[#eef4f5]" />
        </td>
      ))}
    </tr>
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
        <table className="min-w-full text-left text-[14px]">
          <thead className="border-b border-[#e5e5e6] bg-[#fafafa] text-[13px] font-semibold text-[#10141a]">
            <tr>
              <th className="px-4 py-3">Invoice</th>
              <th className="px-4 py-3">Staff</th>
              <th className="px-4 py-3">Period</th>
              <th className="px-4 py-3">Hours</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: SKELETON_ROW_COUNT }).map((_, index) => (
                <SavedPayrollSkeletonRow key={`saved-skeleton-${index}`} />
              ))
            ) : invoices.length > 0 ? (
              invoices.map((invoice) => (
                <tr key={invoice.id} className="border-b border-[#f0f0f1] last:border-b-0">
                  <td className="px-4 py-4 font-medium">{invoice.invoiceNumber}</td>
                  <td className="px-4 py-4">{invoice.employeeName ?? "Unknown staff"}</td>
                  <td className="px-4 py-4">
                    {formatPayrollDateRangeLabel(invoice.periodStart, invoice.periodEnd)}
                  </td>
                  <td className="px-4 py-4">{invoice.totalHours}</td>
                  <td className="px-4 py-4">{formatCurrency(invoice.grossAmount)}</td>
                  <td className="px-4 py-4">{STATUS_LABELS[invoice.status]}</td>
                  <td className="px-4 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        className="rounded-full border border-[#e5e5e6] px-3 py-1.5 text-[13px] font-medium hover:border-[#00b4b8]/40"
                        onClick={() => onViewInvoice(invoice)}
                        disabled={actionsDisabled}
                      >
                        View invoice
                      </button>
                      {invoice.status === "pending" && onMarkPaid && (
                        <button
                          type="button"
                          className="rounded-full bg-[#00b4b8] px-3 py-1.5 text-[13px] font-medium text-white"
                          onClick={() => onMarkPaid(invoice)}
                          disabled={actionsDisabled}
                        >
                          Mark as paid
                        </button>
                      )}
                      {invoice.status === "pending" && onCancel && (
                        <button
                          type="button"
                          className="rounded-full border border-[#ef4444]/30 px-3 py-1.5 text-[13px] font-medium text-[#ef4444]"
                          onClick={() => onCancel(invoice)}
                          disabled={actionsDisabled}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center">
                  <p className="text-[14px] font-medium text-[#808081]">{emptyMessage}</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
