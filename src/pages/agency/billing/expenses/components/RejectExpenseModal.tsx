import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import BillingCornerModalHeader from "@/pages/agency/billing/components/BillingCornerModalHeader";
import {
  BILLING_CORNER_MODAL_CLASS,
  BILLING_DESTRUCTIVE_BUTTON_CLASS,
  BILLING_FIELD_LABEL_CLASS,
  BILLING_SECONDARY_BUTTON_CLASS,
  BILLING_TEXTAREA_CLASS,
} from "@/pages/agency/billing/components/billingModalStyles";
import { formatCurrency } from "@/pages/agency/billing-and-approvals/billingUtils";
import type { AgencyExpenseListItem } from "@/lib/api/billing-expenses";
import { MIN_REJECTION_REASON_LENGTH } from "../utils/expensesDashboardUtils";

type RejectExpenseModalProps = {
  open: boolean;
  expense: AgencyExpenseListItem | null;
  saving?: boolean;
  onClose: () => void;
  onConfirm: (reviewerNotes: string) => void;
  noun?: string;
};

export default function RejectExpenseModal({
  open,
  expense,
  saving = false,
  onClose,
  onConfirm,
  noun = "DSP",
}: RejectExpenseModalProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setReason("");
      setError(null);
    }
  }, [open]);

  const trimmedLength = reason.trim().length;
  const canDecline = trimmedLength >= MIN_REJECTION_REASON_LENGTH;

  const handleConfirm = () => {
    const trimmed = reason.trim();
    if (trimmed.length < MIN_REJECTION_REASON_LENGTH) {
      setError(
        `Add at least ${MIN_REJECTION_REASON_LENGTH} characters so the ${noun} understands why.`,
      );
      return;
    }
    setError(null);
    onConfirm(trimmed);
  };

  const staffName = expense?.employeeName ?? "this " + noun;

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && !saving && onClose()}>
      <DialogContent showCloseButton={false} className={BILLING_CORNER_MODAL_CLASS}>
        <BillingCornerModalHeader
          title={`Decline expense for ${staffName}?`}
          description={"The " + noun + " will see your reason in their app."}
          onClose={onClose}
          closeDisabled={saving}
        />

        {expense ? (
          <div className="space-y-6 px-6 pb-2 pt-6">
            <div className="rounded-[12px] border border-[#e5e5e6] bg-[#f8fafb] px-4 py-3">
              <p className="text-[12px] font-medium uppercase tracking-wide text-[#808081]">
                Expense summary
              </p>
              <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-[14px] font-medium text-[#10141a]">
                  {expense.category || "Reimbursement"}
                </span>
                <span className="text-[16px] font-semibold tabular-nums text-[#10141a]">
                  {formatCurrency(expense.amount)}
                </span>
              </div>
              {expense.message ? (
                <p className="mt-2 text-[13px] text-[#808081]">{expense.message}</p>
              ) : null}
            </div>

            <div>
              <label htmlFor="expense-decline-reason" className={BILLING_FIELD_LABEL_CLASS}>
                Reason for declining
              </label>
              <textarea
                id="expense-decline-reason"
                value={reason}
                onChange={(event) => {
                  setReason(event.target.value);
                  if (error) {
                    setError(null);
                  }
                }}
                rows={4}
                className={BILLING_TEXTAREA_CLASS}
                placeholder="Example: Receipt is unreadable. Please resubmit with the full amount visible."
                disabled={saving}
              />
              <p className="mt-2 text-[13px] text-[#808081]">
                {trimmedLength < MIN_REJECTION_REASON_LENGTH
                  ? `${MIN_REJECTION_REASON_LENGTH - trimmedLength} more characters needed`
                  : "Ready to send to the " + noun}
              </p>
              {error ? <p className="mt-2 text-[13px] text-[#ef4444]">{error}</p> : null}
            </div>
          </div>
        ) : null}

        <div className="flex flex-col-reverse gap-3 px-6 pb-8 pt-2 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className={`${BILLING_SECONDARY_BUTTON_CLASS} w-full sm:w-auto`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={saving || !canDecline}
            className={`${BILLING_DESTRUCTIVE_BUTTON_CLASS} w-full sm:w-auto`}
          >
            {saving ? "Declining…" : "Decline expense"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
