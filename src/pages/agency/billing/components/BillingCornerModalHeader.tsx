import { X } from "lucide-react";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  BILLING_MODAL_DESCRIPTION_CLASS,
  BILLING_MODAL_DIVIDER_CLASS,
  BILLING_MODAL_TITLE_CLASS,
} from "./billingModalStyles";

type BillingCornerModalHeaderProps = {
  title: string;
  description: string;
  onClose?: () => void;
  closeDisabled?: boolean;
};

export default function BillingCornerModalHeader({
  title,
  description,
  onClose,
  closeDisabled = false,
}: BillingCornerModalHeaderProps) {
  return (
    <DialogHeader className="shrink-0 space-y-0">
      <div className="flex items-start justify-between gap-4 px-6 py-6">
        <div>
          <DialogTitle className={BILLING_MODAL_TITLE_CLASS}>{title}</DialogTitle>
          <p className={BILLING_MODAL_DESCRIPTION_CLASS}>{description}</p>
        </div>
        {onClose ? (
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            disabled={closeDisabled}
            className="inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full text-[#808081] transition-colors hover:bg-[#eef4f5] hover:text-[#10141a] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <X className="h-5 w-5" />
          </button>
        ) : null}
      </div>
      <div className={BILLING_MODAL_DIVIDER_CLASS} />
    </DialogHeader>
  );
}
