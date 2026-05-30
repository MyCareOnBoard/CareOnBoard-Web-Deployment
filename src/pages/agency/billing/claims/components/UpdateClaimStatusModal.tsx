import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import BillingCornerModalHeader from "@/pages/agency/billing/components/BillingCornerModalHeader";
import {
  BILLING_CORNER_MODAL_CLASS,
  BILLING_FIELD_CLASS,
  BILLING_FIELD_LABEL_CLASS,
  BILLING_PRIMARY_BUTTON_CLASS,
  BILLING_SECONDARY_BUTTON_CLASS,
} from "@/pages/agency/billing/components/billingModalStyles";
import type { BillingClaimListItem, BillingClaimStatus } from "@/lib/api/claims";
import {
  getClaimStatusLabel,
  PENDING_CLAIM_STATUS_OPTIONS,
} from "../utils/savedClaimUtils";

type UpdateClaimStatusModalProps = {
  open: boolean;
  claim: BillingClaimListItem | null;
  saving?: boolean;
  onClose: () => void;
  onConfirm: (payload: {
    status: Exclude<BillingClaimStatus, "pending">;
    rejectionReason?: string;
  }) => Promise<void>;
};

const REJECTION_TEXTAREA_CLASS =
  "w-full min-h-[120px] rounded-[10px] border border-[#e5e5e6] bg-white px-4 py-3 text-[14px] text-[#10141a] resize-none focus:border-[#00b4b8] focus:ring-[#00b4b8]";

export default function UpdateClaimStatusModal({
  open,
  claim,
  saving = false,
  onClose,
  onConfirm,
}: UpdateClaimStatusModalProps) {
  const [status, setStatus] = useState<BillingClaimStatus>("pending");
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    if (!open || !claim) {
      return;
    }

    setStatus(claim.status);
    setRejectionReason(claim.rejectionReason ?? "");
  }, [claim, open]);

  const handleSubmit = async () => {
    if (!claim || status === claim.status || status === "pending") {
      return;
    }

    await onConfirm({
      status,
      rejectionReason: status === "rejected" ? rejectionReason.trim() : undefined,
    });
  };

  const hasStatusChange = Boolean(claim && status !== claim.status);
  const canSave =
    hasStatusChange && status !== "pending" && (status !== "rejected" || rejectionReason.trim());

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && !saving && onClose()}>
      <DialogContent showCloseButton={false} className={BILLING_CORNER_MODAL_CLASS}>
        <BillingCornerModalHeader
          title="Update claim status"
          description={
            claim
              ? `Update the status for claim ${claim.claimNumber}.`
              : "Update this claim's status."
          }
          onClose={onClose}
          closeDisabled={saving}
        />

        {claim && (
          <div className="space-y-6 px-6 pb-2 pt-6">
            <div>
              <label className={BILLING_FIELD_LABEL_CLASS}>Status</label>
              <Select
                value={status}
                onValueChange={(value) => setStatus(value as BillingClaimStatus)}
              >
                <SelectTrigger className={`${BILLING_FIELD_CLASS} w-full`}>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {PENDING_CLAIM_STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {getClaimStatusLabel(option)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {status === "rejected" && (
              <div>
                <label htmlFor="claim-rejection-reason" className={BILLING_FIELD_LABEL_CLASS}>
                  Rejection reason
                </label>
                <textarea
                  id="claim-rejection-reason"
                  value={rejectionReason}
                  onChange={(event) => setRejectionReason(event.target.value)}
                  rows={4}
                  className={REJECTION_TEXTAREA_CLASS}
                  placeholder="Describe why this claim was rejected"
                />
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-3 px-6 pb-8 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className={BILLING_SECONDARY_BUTTON_CLASS}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={saving || !canSave}
            className={BILLING_PRIMARY_BUTTON_CLASS}
          >
            {saving ? "Saving…" : "Save status"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
