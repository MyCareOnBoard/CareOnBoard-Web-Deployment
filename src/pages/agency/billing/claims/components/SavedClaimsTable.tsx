import type { BillingClaimListItem, BillingClaimStatus } from "@/lib/api/claims";
import ClaimsClientSearch from "./ClaimsClientSearch";
import SavedClaimRow from "./SavedClaimRow";
import {
  SAVED_CLAIMS_TABLE_HEADER_CLASS,
  SAVED_CLAIMS_TABLE_MIN_WIDTH,
} from "./tableColumns";
import { STATUS_FILTER_OPTIONS } from "../utils/savedClaimUtils";

const SKELETON_ROW_COUNT = 8;

type SavedClaimsTableProps = {
  claims: BillingClaimListItem[];
  totalCount: number;
  loading?: boolean;
  statusFilter: BillingClaimStatus | "all";
  onStatusFilterChange: (status: BillingClaimStatus | "all") => void;
  onClientSearchChange: (query: string, selectedClientName?: string) => void;
  onViewReport: (claim: BillingClaimListItem) => void;
  onUpdateStatus: (claim: BillingClaimListItem) => void;
  onCancelClaim: (claim: BillingClaimListItem) => void;
  actionsDisabled?: boolean;
};

function SavedClaimSkeletonRow() {
  return (
    <div
      className={`${SAVED_CLAIMS_TABLE_HEADER_CLASS.replace("font-semibold", "")} animate-pulse`}
      aria-hidden="true"
    >
      {Array.from({ length: 8 }).map((_, index) => (
        <span key={index} className="h-4 rounded bg-[#eef4f5]" />
      ))}
    </div>
  );
}

function SavedClaimMobileSkeletonCard() {
  return (
    <div
      className="animate-pulse rounded-[16px] border border-[#e5e5e6] bg-white px-4 py-4"
      aria-hidden="true"
    >
      <div className="h-5 w-32 rounded bg-[#eef4f5]" />
      <div className="mt-4 space-y-3">
        <div className="h-4 w-full rounded bg-[#eef4f5]" />
        <div className="h-4 w-2/3 rounded bg-[#eef4f5]" />
      </div>
    </div>
  );
}

export default function SavedClaimsTable({
  claims,
  totalCount,
  loading = false,
  statusFilter,
  onStatusFilterChange,
  onClientSearchChange,
  onViewReport,
  onUpdateStatus,
  onCancelClaim,
  actionsDisabled = false,
}: SavedClaimsTableProps) {
  const emptyMessage = loading
    ? ""
    : totalCount === 0
      ? "No generated claims found for this date range."
      : claims.length === 0
        ? "No claims match your filters."
        : "";

  return (
    <section>
      <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <h2 className="text-[18px] font-semibold text-[#10141a]">Generated Claims</h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="flex items-center gap-2 text-[13px] text-[#10141a]">
            <span className="whitespace-nowrap text-[#808081]">Status</span>
            <select
              value={statusFilter}
              onChange={(event) =>
                onStatusFilterChange(event.target.value as BillingClaimStatus | "all")
              }
              className="rounded-md border border-[#e5e5e6] bg-white px-3 py-2 text-[13px] text-[#10141a]"
            >
              {STATUS_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <ClaimsClientSearch onFilterChange={onClientSearchChange} />
        </div>
      </div>

      <div className="hidden overflow-hidden rounded-[16px] border border-[#e5e5e6] bg-white lg:block">
        <div className="overflow-x-auto">
          <div className={SAVED_CLAIMS_TABLE_MIN_WIDTH}>
            <div className={SAVED_CLAIMS_TABLE_HEADER_CLASS}>
              <span>Claim #</span>
              <span>Client</span>
              <span>Service code</span>
              <span>Service date</span>
              <span>Amount</span>
              <span>Status</span>
              <span>Created</span>
              <span className="text-right">Action</span>
            </div>

            {loading ? (
              Array.from({ length: SKELETON_ROW_COUNT }).map((_, index) => (
                <SavedClaimSkeletonRow key={`saved-skeleton-desktop-${index}`} />
              ))
            ) : claims.length > 0 ? (
              claims.map((claim) => (
                <SavedClaimRow
                  key={claim.id}
                  variant="desktop"
                  claim={claim}
                  onViewReport={onViewReport}
                  onUpdateStatus={onUpdateStatus}
                  onCancelClaim={onCancelClaim}
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

      <div className="space-y-2 lg:hidden">
        {loading ? (
          Array.from({ length: SKELETON_ROW_COUNT }).map((_, index) => (
            <SavedClaimMobileSkeletonCard key={`saved-skeleton-mobile-${index}`} />
          ))
        ) : claims.length > 0 ? (
          claims.map((claim) => (
            <SavedClaimRow
              key={claim.id}
              variant="mobile"
              claim={claim}
              onViewReport={onViewReport}
              onUpdateStatus={onUpdateStatus}
              onCancelClaim={onCancelClaim}
              actionsDisabled={actionsDisabled}
            />
          ))
        ) : (
          <div className="rounded-[16px] border border-[#e5e5e6] bg-white px-4 py-10 text-center">
            <p className="text-[14px] font-medium text-[#808081]">{emptyMessage}</p>
          </div>
        )}
      </div>
    </section>
  );
}
