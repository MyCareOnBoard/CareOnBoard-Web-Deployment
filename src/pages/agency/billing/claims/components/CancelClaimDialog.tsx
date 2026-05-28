import { DeleteConfirmationModal } from "@/components/modals/DeleteConfirmationModal";
import type { BillingClaimListItem } from "@/lib/api/claims";

type CancelClaimDialogProps = {
  open: boolean;
  claim: BillingClaimListItem | null;
  saving?: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
};

export default function CancelClaimDialog({
  open,
  claim,
  saving = false,
  onClose,
  onConfirm,
}: CancelClaimDialogProps) {
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
      title="Cancel this claim?"
      message={
        claim
          ? `Claim ${claim.claimNumber} will be deleted and its shifts will become available to claim again.`
          : "This claim will be deleted and its shifts will become available to claim again."
      }
      confirmText="Cancel claim"
      cancelText="Keep claim"
    />
  );
}
