import { DeleteConfirmationModal } from "@/components/modals/DeleteConfirmationModal";
import type { PayrollInvoiceListItem } from "@/lib/api/payroll";

type CancelPayrollInvoiceDialogProps = {
  open: boolean;
  invoice: PayrollInvoiceListItem | null;
  saving?: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
};

export default function CancelPayrollInvoiceDialog({
  open,
  invoice,
  saving = false,
  onClose,
  onConfirm,
}: CancelPayrollInvoiceDialogProps) {
  const staffLabel = invoice?.employeeName ?? "this staff member";

  return (
    <DeleteConfirmationModal
      isOpen={open}
      onClose={() => {
        if (!saving) {
          onClose();
        }
      }}
      onConfirm={() => void onConfirm()}
      isDeleting={saving}
      title="Cancel this payroll invoice?"
      message={
        invoice
          ? `Invoice ${invoice.invoiceNumber} for ${staffLabel} will be deleted and its shifts will become available to invoice again.`
          : "This payroll invoice will be deleted and its shifts will become available to invoice again."
      }
      confirmText="Cancel invoice"
      cancelText="Keep invoice"
    />
  );
}
