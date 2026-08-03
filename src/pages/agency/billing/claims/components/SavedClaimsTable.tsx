import { Fragment, useMemo } from "react";
import type { BillingClaimListItem, BillingClaimStatus } from "@/lib/api/claims";
import type { OutOfPocketInvoiceListItem } from "@/lib/api/out-of-pocket";
import ClaimsClientSearch from "./ClaimsClientSearch";
import ClaimsTablePagination from "./ClaimsTablePagination";
import SavedClaimRow from "./SavedClaimRow";
import SavedInvoiceRow from "./SavedInvoiceRow";
import SavedClaimsClientGroupHeader from "./SavedClaimsClientGroupHeader";
import {
  GROUPED_SAVED_CLAIMS_TABLE_HEADER_CLASS,
  NETWORK_GROUPED_SAVED_CLAIMS_TABLE_ROW_CLASS,
  NETWORK_GROUPED_SAVED_CLAIMS_TABLE_HEADER_CLASS,
  SAVED_CLAIMS_TABLE_MIN_WIDTH,
} from "./tableColumns";
import { groupSavedClaimsByClient } from "../utils/groupSavedClaimsByClient";
import { groupInvoicesByClient } from "../utils/groupInvoicesByClient";
import { STATUS_FILTER_OPTIONS } from "../utils/savedClaimUtils";

const SKELETON_ROW_COUNT = 8;

type AgencyIdentity = { agencyId?: string; agencyName?: string };

type SavedClaimsTableProps = {
  claims: Array<BillingClaimListItem & AgencyIdentity>;
  totalCount: number;
  loading?: boolean;
  statusFilter: BillingClaimStatus | "all";
  onStatusFilterChange: (status: BillingClaimStatus | "all") => void;
  onClientSearchChange: (query: string, selectedClientName?: string) => void;
  onViewReport: (claim: BillingClaimListItem) => void;
  onUpdateStatus: (claim: BillingClaimListItem) => void;
  onCancelClaim: (claim: BillingClaimListItem) => void;
  actionsDisabled?: boolean;
  /** Out-of-pocket invoices mixed into this tab, badged and grouped by client. */
  invoices?: Array<OutOfPocketInvoiceListItem & AgencyIdentity>;
  onViewInvoice?: (invoice: OutOfPocketInvoiceListItem) => void;
  onCancelInvoice?: (invoice: OutOfPocketInvoiceListItem) => void;
  /** Enables the super-admin network table identity column and agency-separated grouping. */
  showAgency?: boolean;
  isRefetching?: boolean;
  nextCursor?: string | null;
  onLoadMore?: () => void;
  providerFree?: boolean;
  /** Lets network billing retain status filtering without mounting agency client search. */
  showStatusFilter?: boolean;
  /** Lets network billing provide its own authorized-client control. */
  showClientSearch?: boolean;
  showControls?: boolean;
  loadMoreError?: string | null;
};

function SavedClaimSkeletonRow({
  grouped = false,
  showAgency = false,
}: {
  grouped?: boolean;
  showAgency?: boolean;
}) {
  return (
    <div
      className={`${(showAgency
        ? NETWORK_GROUPED_SAVED_CLAIMS_TABLE_ROW_CLASS
        : GROUPED_SAVED_CLAIMS_TABLE_HEADER_CLASS.replace("font-semibold", ""))} animate-pulse`}
      aria-hidden="true"
    >
      {Array.from({ length: grouped ? showAgency ? 8 : 7 : 8 }).map((_, index) => (
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
  invoices = [],
  onViewInvoice,
  onCancelInvoice,
  showAgency = false,
  isRefetching = false,
  nextCursor,
  onLoadMore,
  providerFree = false,
  showControls = true,
  showStatusFilter = showControls,
  showClientSearch = showControls,
  loadMoreError,
}: SavedClaimsTableProps) {
  const groupedClaims = useMemo(
    () => groupSavedClaimsByClient(claims, { showAgency }),
    [claims, showAgency],
  );
  const groupedInvoices = useMemo(
    () => groupInvoicesByClient(invoices, { showAgency }),
    [invoices, showAgency],
  );

  const isInitialLoading = loading && claims.length === 0 && invoices.length === 0;
  const emptyMessage = isInitialLoading
    ? ""
    : totalCount === 0 && invoices.length === 0
      ? "No generated claims or invoices found for this date range."
      : groupedClaims.length === 0 && groupedInvoices.length === 0
        ? "No claims or invoices match your filters."
        : "";

  return (
    <section>
      <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <h2 className="text-[18px] font-semibold text-[#10141a]">Claims &amp; invoices</h2>
        {showStatusFilter || showClientSearch ? <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {showStatusFilter ? (
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
          ) : null}
          {showClientSearch ? <ClaimsClientSearch onFilterChange={onClientSearchChange} /> : null}
        </div> : null}
      </div>

      <div className="hidden overflow-hidden rounded-[16px] border border-[#e5e5e6] bg-white lg:block">
        <div className="overflow-x-auto">
          <div className={SAVED_CLAIMS_TABLE_MIN_WIDTH}>
            <div className={showAgency ? NETWORK_GROUPED_SAVED_CLAIMS_TABLE_HEADER_CLASS : GROUPED_SAVED_CLAIMS_TABLE_HEADER_CLASS}>
              {showAgency ? <span>Agency</span> : null}
              <span>Claim #</span>
              <span>Service code</span>
              <span>Service date</span>
              <span>Amount</span>
              <span>Status</span>
              <span>Created</span>
              <span className="text-right">Action</span>
            </div>

            {isInitialLoading ? (
              Array.from({ length: SKELETON_ROW_COUNT }).map((_, index) => (
                <SavedClaimSkeletonRow
                  key={`saved-skeleton-desktop-${index}`}
                  grouped
                  showAgency={showAgency}
                />
              ))
            ) : groupedClaims.length > 0 || groupedInvoices.length > 0 ? (
              <>
                {groupedClaims.map((group) => (
                  <Fragment key={`claim-${group.clientKey}`}>
                    <SavedClaimsClientGroupHeader
                      clientName={group.clientName}
                      clientId={group.clientId}
                      count={group.claims.length}
                      variant="desktop"
                      providerFree={providerFree}
                    />
                    {group.claims.map((claim) => (
                      <SavedClaimRow
                        key={claim.id}
                        variant="desktop"
                        showClient={false}
                        claim={claim}
                        onViewReport={onViewReport}
                        onUpdateStatus={onUpdateStatus}
                        onCancelClaim={onCancelClaim}
                        actionsDisabled={actionsDisabled}
                        showAgency={showAgency}
                      />
                    ))}
                  </Fragment>
                ))}
                {groupedInvoices.map((group) => (
                  <Fragment key={`invoice-${group.clientKey}`}>
                    <SavedClaimsClientGroupHeader
                      clientName={group.clientName}
                      clientId={group.clientId}
                      count={group.invoices.length}
                      variant="desktop"
                      providerFree={providerFree}
                      itemNoun="invoice"
                      outOfPocket
                    />
                    {group.invoices.map((invoice) => (
                      <SavedInvoiceRow
                        key={invoice.id}
                        variant="desktop"
                        invoice={invoice}
                        onViewInvoice={onViewInvoice ?? (() => {})}
                        onCancelInvoice={onCancelInvoice ?? (() => {})}
                        actionsDisabled={actionsDisabled}
                        showAgency={showAgency}
                      />
                    ))}
                  </Fragment>
                ))}
              </>
            ) : (
              <div className="px-4 py-10 text-center">
                <p className="text-[14px] font-medium text-[#808081]">{emptyMessage}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-2 lg:hidden">
        {isInitialLoading ? (
          Array.from({ length: SKELETON_ROW_COUNT }).map((_, index) => (
            <SavedClaimMobileSkeletonCard key={`saved-skeleton-mobile-${index}`} />
          ))
        ) : groupedClaims.length > 0 || groupedInvoices.length > 0 ? (
          <>
            {groupedClaims.map((group) => (
              <div key={`claim-${group.clientKey}`} className="space-y-2">
                <SavedClaimsClientGroupHeader
                  clientName={group.clientName}
                  clientId={group.clientId}
                  count={group.claims.length}
                  variant="mobile"
                  agencyName={showAgency ? group.agencyName : undefined}
                  providerFree={providerFree}
                />
                {group.claims.map((claim) => (
                  <SavedClaimRow
                    key={claim.id}
                    variant="mobile"
                    showClient={false}
                    claim={claim}
                    onViewReport={onViewReport}
                    onUpdateStatus={onUpdateStatus}
                    onCancelClaim={onCancelClaim}
                    actionsDisabled={actionsDisabled}
                  />
                ))}
              </div>
            ))}
            {groupedInvoices.map((group) => (
              <div key={`invoice-${group.clientKey}`} className="space-y-2">
                <SavedClaimsClientGroupHeader
                  clientName={group.clientName}
                  clientId={group.clientId}
                  count={group.invoices.length}
                  variant="mobile"
                  itemNoun="invoice"
                  outOfPocket
                  agencyName={showAgency ? group.agencyName : undefined}
                  providerFree={providerFree}
                />
                {group.invoices.map((invoice) => (
                  <SavedInvoiceRow
                    key={invoice.id}
                    variant="mobile"
                    invoice={invoice}
                    onViewInvoice={onViewInvoice ?? (() => {})}
                    onCancelInvoice={onCancelInvoice ?? (() => {})}
                    actionsDisabled={actionsDisabled}
                  />
                ))}
              </div>
            ))}
          </>
        ) : (
          <div className="rounded-[16px] border border-[#e5e5e6] bg-white px-4 py-10 text-center">
            <p className="text-[14px] font-medium text-[#808081]">{emptyMessage}</p>
          </div>
        )}
      </div>
      {!isInitialLoading ? (
        <ClaimsTablePagination
          isRefetching={isRefetching}
          nextCursor={nextCursor}
          onLoadMore={onLoadMore}
          loadMoreLabel="Load more claims and invoices"
          terminalLabel="All claims and invoices loaded"
          loadMoreError={loadMoreError}
        />
      ) : null}
    </section>
  );
}
