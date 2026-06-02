import { DeleteConfirmationModal } from "@/components/modals/DeleteConfirmationModal";

export type MarkPayrollInvoicePaidTarget = {
  id: string;
  invoiceNumber: string;
  employeeName: string | null;
};

type MarkPayrollInvoicePaidDialogProps = {
  open: boolean;
  invoice: MarkPayrollInvoicePaidTarget | null;
  saving?: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
};

export default function MarkPayrollInvoicePaidDialog({
  open,
  invoice,
  saving = false,
  onClose,
  onConfirm,
}: MarkPayrollInvoicePaidDialogProps) {
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
      title="Mark this payroll invoice as paid?"
      message={
        invoice
          ? `Invoice ${invoice.invoiceNumber} for ${staffLabel} will be recorded as paid. This confirms payroll was sent.`
          : "This payroll invoice will be recorded as paid."
      }
      confirmText="Mark as paid"
      cancelText="Keep pending"
    />
  );
}
