import { memo } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DotGridIcon, menuItemClassName } from "@/components/ui/dot-grid-menu";
import { formatCurrency } from "@/pages/agency/billing-and-approvals/billingUtils";
import type { BillingClaimListItem } from "@/lib/api/claims";
import { cn } from "@/lib/utils";
import BillingStatusBadge from "../../components/BillingStatusBadge";
import ClientNameLink from "./ClientNameLink";
import { GROUPED_SAVED_CLAIMS_TABLE_ROW_CLASS, SAVED_CLAIMS_TABLE_ROW_CLASS } from "./tableColumns";

type SavedClaimRowProps = {
  claim: BillingClaimListItem;
  variant: "desktop" | "mobile";
  showClient?: boolean;
  onViewReport: (claim: BillingClaimListItem) => void;
  onUpdateStatus: (claim: BillingClaimListItem) => void;
  onCancelClaim: (claim: BillingClaimListItem) => void;
  actionsDisabled?: boolean;
};

function formatCreatedDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function StatusBadge({ status }: { status: BillingClaimListItem["status"] }) {
  return <BillingStatusBadge domain="claim" status={status} />;
}

function SavedClaimActions({
  claim,
  onViewReport,
  onUpdateStatus,
  onCancelClaim,
  actionsDisabled = false,
}: Omit<SavedClaimRowProps, "variant">) {
  const canUpdateStatus = claim.status === "pending";
  const canCancel = claim.status === "pending" || claim.status === "rejected";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={actionsDisabled}
          className={cn(
            "inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md bg-white transition-colors hover:bg-[#e5e5e6] active:bg-[#e5e5e6]",
            actionsDisabled && "cursor-not-allowed opacity-50",
          )}
          aria-label={`Actions for claim ${claim.claimNumber}`}
        >
          <DotGridIcon />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="z-[100] min-w-[160px] rounded-xl border-0 bg-white p-0 shadow-lg"
      >
        <DropdownMenuItem className={menuItemClassName} onClick={() => onViewReport(claim)}>
          View report
        </DropdownMenuItem>
        <DropdownMenuItem
          className={menuItemClassName}
          disabled={!canUpdateStatus}
          onClick={() => onUpdateStatus(claim)}
        >
          Update status
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!canCancel}
          className={`${menuItemClassName} text-[#ef4444] hover:bg-[#fef2f2] focus:bg-[#fef2f2] focus:text-[#ef4444]`}
          onClick={() => onCancelClaim(claim)}
        >
          Cancel claim
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SavedClaimRow({
  claim,
  variant,
  showClient = true,
  onViewReport,
  onUpdateStatus,
  onCancelClaim,
  actionsDisabled = false,
}: SavedClaimRowProps) {
  const clientDisplayName = claim.clientName ?? "Unknown client";

  if (variant === "mobile") {
    return (
      <div className="rounded-[16px] border border-[#e5e5e6] bg-white px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[15px] font-semibold text-[#10141a]">{claim.claimNumber}</p>
            {showClient ? (
              <ClientNameLink
                name={clientDisplayName}
                clientId={claim.clientId}
                className="mt-1 block text-[13px] text-[#808081]"
              />
            ) : null}
          </div>
          <SavedClaimActions
            claim={claim}
            onViewReport={onViewReport}
            onUpdateStatus={onUpdateStatus}
            onCancelClaim={onCancelClaim}
            actionsDisabled={actionsDisabled}
          />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 text-[13px]">
          <div>
            <p className="text-[#808081]">Service code</p>
            <p className="mt-1 font-medium text-[#10141a]">{claim.serviceCode}</p>
          </div>
          <div>
            <p className="text-[#808081]">Service date</p>
            <p className="mt-1 font-medium text-[#10141a]">{claim.serviceDate ?? "—"}</p>
          </div>
          <div>
            <p className="text-[#808081]">Amount</p>
            <p className="mt-1 font-medium text-[#10141a]">{formatCurrency(claim.amount)}</p>
          </div>
          <div>
            <p className="text-[#808081]">Created</p>
            <p className="mt-1 font-medium text-[#10141a]">{formatCreatedDate(claim.createdAt)}</p>
          </div>
        </div>

        <div className="mt-4">
          <StatusBadge status={claim.status} />
        </div>
      </div>
    );
  }

  return (
    <div className={showClient ? SAVED_CLAIMS_TABLE_ROW_CLASS : GROUPED_SAVED_CLAIMS_TABLE_ROW_CLASS}>
      <span className="text-[13px] font-medium text-[#10141a]">{claim.claimNumber}</span>
      {showClient ? (
        <ClientNameLink
          name={clientDisplayName}
          clientId={claim.clientId}
          className="text-[13px] text-[#10141a]"
        />
      ) : null}
      <span className="text-[13px] text-[#10141a]">{claim.serviceCode}</span>
      <span className="text-[13px] text-[#10141a]">{claim.serviceDate ?? "—"}</span>
      <span className="text-[13px] font-medium tabular-nums text-[#10141a]">
        {formatCurrency(claim.amount)}
      </span>
      <span>
        <StatusBadge status={claim.status} />
      </span>
      <span className="text-[13px] text-[#10141a]">{formatCreatedDate(claim.createdAt)}</span>
      <span className="flex justify-end">
        <SavedClaimActions
          claim={claim}
          onViewReport={onViewReport}
          onUpdateStatus={onUpdateStatus}
          onCancelClaim={onCancelClaim}
          actionsDisabled={actionsDisabled}
        />
      </span>
    </div>
  );
}

export default memo(SavedClaimRow);
