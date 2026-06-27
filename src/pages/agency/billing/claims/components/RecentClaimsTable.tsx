import { Fragment, useCallback, useMemo, useState } from "react";
import type { RecentClaim } from "../data/mockClaimsDashboardData";
import {
  groupRecentClaimsByClient,
  type RecentClaimClientGroup,
} from "../utils/groupRecentClaimsByClient";
import ClaimsClientSearch from "./ClaimsClientSearch";
import RecentClaimRow from "./RecentClaimRow";
import RecentClaimsClientGroupHeader from "./RecentClaimsClientGroupHeader";
import {
  GROUPED_TABLE_HEADER_CLASS,
  GROUPED_TABLE_ROW_CLASS,
  TABLE_MIN_WIDTH,
  TABLE_ROW_CLASS,
} from "./tableColumns";
import { useStaffLabels } from "@/hooks/useStaffLabels";

const SKELETON_ROW_COUNT = 10;

type RecentClaimsTableProps = {
  claims: RecentClaim[];
  loading?: boolean;
  truncated?: boolean;
  onGenerateClaim?: (group: RecentClaimClientGroup) => void;
  generateDisabled?: boolean;
};

function RecentClaimSkeletonRow({ grouped = false }: { grouped?: boolean }) {
  return (
    <div
      className={`${grouped ? GROUPED_TABLE_ROW_CLASS : TABLE_ROW_CLASS} animate-pulse`}
      aria-hidden="true"
    >
      {Array.from({ length: grouped ? 7 : 9 }).map((_, index) => (
        <span key={index} className="h-4 rounded bg-[#eef4f5]" />
      ))}
    </div>
  );
}

function RecentClaimMobileSkeletonCard() {
  return (
    <div
      className="animate-pulse rounded-[16px] border border-[#e5e5e6] bg-white px-4 py-4"
      aria-hidden="true"
    >
      <div className="h-5 w-40 rounded bg-[#eef4f5]" />
      <div className="mt-4 space-y-3">
        <div className="h-4 w-full rounded bg-[#eef4f5]" />
        <div className="h-4 w-3/4 rounded bg-[#eef4f5]" />
        <div className="h-4 w-2/3 rounded bg-[#eef4f5]" />
      </div>
    </div>
  );
}

export default function RecentClaimsTable({
  claims,
  loading = false,
  truncated = false,
  onGenerateClaim,
  generateDisabled = false,
}: RecentClaimsTableProps) {
  const [filterQuery, setFilterQuery] = useState("");
  const [selectedClientName, setSelectedClientName] = useState<string | undefined>();
  const [typeFilter, setTypeFilter] = useState<"all" | "claims" | "out-of-pocket">("all");
  const { labels } = useStaffLabels();

  const sortedClaims = useMemo(
    () =>
      [...claims].sort((a, b) =>
        (b.serviceDateSortKey ?? "").localeCompare(a.serviceDateSortKey ?? ""),
      ),
    [claims],
  );

  const filteredClaims = useMemo(() => {
    const byType =
      typeFilter === "all"
        ? sortedClaims
        : sortedClaims.filter((claim) => (claim.billingDirection ?? "claims") === typeFilter);

    if (selectedClientName) {
      return byType.filter(
        (claim) => claim.client.toLowerCase() === selectedClientName.toLowerCase(),
      );
    }

    const query = filterQuery.trim().toLowerCase();
    if (!query) return byType;

    return byType.filter((claim) => claim.client.toLowerCase().includes(query));
  }, [sortedClaims, filterQuery, selectedClientName, typeFilter]);

  const groupedClaims = useMemo(
    () => groupRecentClaimsByClient(filteredClaims),
    [filteredClaims],
  );

  const handleFilterChange = (query: string, clientName?: string) => {
    setFilterQuery(query);
    setSelectedClientName(clientName);
  };

  const handleGenerateClaim = useCallback(
    (group: RecentClaimClientGroup) => {
      if (!onGenerateClaim) return;
      onGenerateClaim(group);
    },
    [onGenerateClaim],
  );

  const emptyMessage = useMemo(() => {
    if (loading) return "";
    if (claims.length === 0) {
      return "No approved shifts or transportation mileage found.";
    }
    return "No items match your filters.";
  }, [claims.length, loading]);

  return (
    <section>
      <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <h2 className="text-[18px] font-semibold text-[#10141a]">Ready to bill</h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="flex items-center gap-2 text-[13px] text-[#10141a]">
            <span className="whitespace-nowrap text-[#808081]">Type</span>
            <select
              value={typeFilter}
              onChange={(event) =>
                setTypeFilter(event.target.value as "all" | "claims" | "out-of-pocket")
              }
              className="rounded-md border border-[#e5e5e6] bg-white px-3 py-2 text-[13px] text-[#10141a]"
            >
              <option value="all">All</option>
              <option value="claims">Claims</option>
              <option value="out-of-pocket">Out of pocket</option>
            </select>
          </label>
          <ClaimsClientSearch onFilterChange={handleFilterChange} />
        </div>
      </div>

      {truncated && !loading ? (
        <p className="mb-3 text-[13px] text-[#808081]">
          Showing the first 100 shifts and rides. Use client search or Generate claim to narrow
          results.
        </p>
      ) : null}

      <div className="hidden overflow-hidden rounded-[16px] border border-[#e5e5e6] bg-white lg:block">
        <div className="overflow-x-auto">
          <div className={TABLE_MIN_WIDTH}>
            <div className={GROUPED_TABLE_HEADER_CLASS}>
              <span>{labels.noun}</span>
              <span>Service code</span>
              <span>PA Number</span>
              <span>Service date</span>
              <span>Duration/Distance</span>
              <span>Total hours/miles</span>
              <span>Rate</span>
            </div>

            {loading ? (
              Array.from({ length: SKELETON_ROW_COUNT }).map((_, index) => (
                <RecentClaimSkeletonRow key={`skeleton-desktop-${index}`} grouped />
              ))
            ) : groupedClaims.length > 0 ? (
              groupedClaims.map((group) => (
                <Fragment key={group.clientKey}>
                  <RecentClaimsClientGroupHeader
                    group={group}
                    variant="desktop"
                    onGenerateClaim={handleGenerateClaim}
                    generateDisabled={generateDisabled}
                  />
                  {group.claims.map((claim) => (
                    <RecentClaimRow
                      key={claim.id}
                      variant="desktop"
                      showClient={false}
                      claim={claim}
                    />
                  ))}
                </Fragment>
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
            <RecentClaimMobileSkeletonCard key={`skeleton-mobile-${index}`} />
          ))
        ) : groupedClaims.length > 0 ? (
          groupedClaims.map((group) => (
            <div key={group.clientKey} className="space-y-2">
              <RecentClaimsClientGroupHeader
                group={group}
                variant="mobile"
                onGenerateClaim={handleGenerateClaim}
                generateDisabled={generateDisabled}
              />
              {group.claims.map((claim) => (
                <RecentClaimRow
                  key={claim.id}
                  variant="mobile"
                  showClient={false}
                  claim={claim}
                />
              ))}
            </div>
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