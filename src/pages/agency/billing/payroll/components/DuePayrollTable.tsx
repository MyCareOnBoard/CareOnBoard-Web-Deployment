import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";
import type { DuePayrollEntry } from "@/lib/api/payroll";
import DuePayrollRow from "./DuePayrollRow";
import PayrollStaffSearch from "./PayrollStaffSearch";
import { TABLE_HEADER_CLASS, TABLE_MIN_WIDTH, TABLE_ROW_CLASS } from "./tableColumns";
import { NETWORK_TABLE_GRID } from "./tableColumns";
import ClaimsTablePagination from "../../claims/components/ClaimsTablePagination";

const SKELETON_ROW_COUNT = 10;

type DuePayrollTableProps = {
  entries: Array<DuePayrollEntry & { agencyId?: string; agencyName?: string }>;
  dueTotal?: number;
  loading?: boolean;
  isRefetching?: boolean;
  showAgency?: boolean;
  nextCursor?: string | null;
  onLoadMore?: () => void;
  onCreateInvoiceClick: (entry: DuePayrollEntry) => void;
  actionsDisabled?: boolean;
};

function DuePayrollSkeletonRow({ showAgency = false }: { showAgency?: boolean }) {
  return (
    <div className={`${showAgency ? `${NETWORK_TABLE_GRID} py-3.5 border-b border-[#e5e5e6] last:border-b-0` : TABLE_ROW_CLASS} animate-pulse`} aria-hidden="true">
      {Array.from({ length: showAgency ? 10 : 9 }).map((_, index) => (
        <span key={index} className="h-4 rounded bg-[#eef4f5]" />
      ))}
    </div>
  );
}

function DuePayrollMobileSkeletonCard() {
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

export default function DuePayrollTable({
  entries,
  dueTotal = 0,
  loading = false,
  isRefetching = false,
  showAgency = false,
  nextCursor,
  onLoadMore,
  onCreateInvoiceClick,
  actionsDisabled = false,
}: DuePayrollTableProps) {
  const [filterQuery, setFilterQuery] = useState("");

  const filteredEntries = useMemo(() => {
    const query = filterQuery.trim().toLowerCase();
    if (!query) {
      return entries;
    }

    return entries.filter((entry) => entry.staffName.toLowerCase().includes(query));
  }, [entries, filterQuery]);

  const groupedEntries = useMemo(() => {
    if (!showAgency) return [["agency", filteredEntries]] as const;
    const groups = new Map<string, typeof filteredEntries>();
    for (const entry of filteredEntries) {
      const key = `${entry.agencyId ?? "unknown"}:${entry.employeeId}`;
      const group = groups.get(key) ?? [];
      group.push(entry);
      groups.set(key, group);
    }
    return Array.from(groups.entries());
  }, [filteredEntries, showAgency]);

  const emptyMessage = useMemo(() => {
    if (loading) return "";
    if (filterQuery.trim() && filteredEntries.length === 0) {
      return "No entries match your search.";
    }
    if (entries.length === 0) {
      return "No staff have unpaid hours in this date range.";
    }
    return "No entries match your search.";
  }, [entries.length, filterQuery, filteredEntries.length, loading]);

  const showTruncationBanner = !loading && dueTotal > entries.length;

  const showRefetchingState = isRefetching && !loading;

  return (
    <section>
      <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <h2 className="text-[18px] font-semibold text-[#10141a]">Staff to pay</h2>
        <PayrollStaffSearch onFilterChange={setFilterQuery} />
      </div>

      {showRefetchingState && (
        <p className="mb-4 text-[13px] text-[#808081]">Updating staff to pay…</p>
      )}

      {showTruncationBanner && (
        <p className="mb-4 rounded-[10px] border border-[#e5e5e6] bg-[#fafafa] px-4 py-3 text-[13px] text-[#808081]">
          Showing first {entries.length} of {dueTotal} staff. Narrow the date range to see more.
        </p>
      )}

      <div
        className={cn(
          "transition-opacity duration-200",
          showRefetchingState && "opacity-60",
        )}
      >
      <div className="hidden overflow-hidden rounded-[16px] border border-[#e5e5e6] bg-white lg:block">
        <div className="overflow-x-auto">
            <div className={TABLE_MIN_WIDTH}>
            <div className={showAgency ? `${NETWORK_TABLE_GRID} py-3 text-[13px] font-semibold text-[#10141a] border-b border-[#e5e5e6]` : TABLE_HEADER_CLASS}>
              {showAgency ? <span>Agency</span> : null}
              <span>Staff name</span>
              <span>Staff ID</span>
              <span>Hours worked</span>
              <span>Date range</span>
              <span>Payment details</span>
              <span>Pay rate</span>
              <span>Reimbursements</span>
              <span>Gross pay</span>
              <span className="text-right">Action</span>
            </div>

            {loading ? (
              Array.from({ length: SKELETON_ROW_COUNT }).map((_, index) => (
                <DuePayrollSkeletonRow key={`due-skeleton-desktop-${index}`} showAgency={showAgency} />
              ))
            ) : filteredEntries.length > 0 ? (
              groupedEntries.map(([groupKey, group]) => (
                <div
                  key={groupKey}
                  className="contents"
                  data-testid={showAgency ? `payroll-staff-group-${groupKey}` : undefined}
                >
                  {group.map((entry) => (
                    <DuePayrollRow
                      key={entry.id}
                      variant="desktop"
                      entry={entry}
                      showAgency={showAgency}
                      onCreateInvoiceClick={onCreateInvoiceClick}
                      actionsDisabled={actionsDisabled}
                    />
                  ))}
                </div>
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
            <DuePayrollMobileSkeletonCard key={`due-skeleton-mobile-${index}`} />
          ))
        ) : filteredEntries.length > 0 ? (
          groupedEntries.flatMap(([, group]) => group).map((entry) => (
            <DuePayrollRow
              key={entry.id}
              variant="mobile"
              entry={entry}
              showAgency={showAgency}
              onCreateInvoiceClick={onCreateInvoiceClick}
              actionsDisabled={actionsDisabled}
            />
          ))
        ) : (
          <div className="rounded-[16px] border border-[#e5e5e6] bg-white px-4 py-10 text-center">
            <p className="text-[14px] font-medium text-[#808081]">{emptyMessage}</p>
          </div>
        )}
      </div>
      <ClaimsTablePagination
        isRefetching={isRefetching}
        nextCursor={nextCursor}
        onLoadMore={onLoadMore}
        loadMoreLabel="Load more payroll staff"
        terminalLabel="All payroll staff loaded"
      />
      </div>
    </section>
  );
}
