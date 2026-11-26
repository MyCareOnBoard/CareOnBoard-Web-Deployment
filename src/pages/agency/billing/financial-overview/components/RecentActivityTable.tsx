import { memo, useMemo, useState } from "react";
import type { RecentActivity } from "../../shared/types";
import { AgencyListCard, AgencyPill, AgencySearchField, agencyOutlineButton, type AgencyTone } from "@/components/agency/AgencyListKit";
import { getClaimStatusLabel } from "../../claims/utils/savedClaimUtils";
import {
  ACTIVITY_TABLE_HEADER_CLASS,
  ACTIVITY_TABLE_MIN_WIDTH,
  ACTIVITY_TABLE_ROW_CLASS,
} from "./activityTableColumns";

type NetworkAgencyActivity = RecentActivity & {
  agencyId: string;
  agencyName: string;
};

function assertNetworkActivityRows(
  activity: readonly RecentActivity[],
): asserts activity is readonly NetworkAgencyActivity[] {
  if (
    activity.some(
      (row) =>
        typeof (row as Partial<NetworkAgencyActivity>).agencyId !== "string" ||
        !(row as Partial<NetworkAgencyActivity>).agencyId ||
        typeof (row as Partial<NetworkAgencyActivity>).agencyName !==
          "string" ||
        !(row as Partial<NetworkAgencyActivity>).agencyName,
    )
  ) {
    throw new Error("Network activity rows require agencyId and agencyName");
  }
}

const NETWORK_ACTIVITY_TABLE_MIN_WIDTH = "min-w-[940px]";
const NETWORK_ACTIVITY_TABLE_GRID =
  "grid grid-cols-[minmax(140px,1fr)_minmax(220px,2fr)_minmax(90px,0.8fr)_minmax(110px,0.9fr)_minmax(120px,1fr)_minmax(130px,1fr)] items-center gap-3 px-4";
const NETWORK_ACTIVITY_TABLE_HEADER_CLASS = `${NETWORK_ACTIVITY_TABLE_GRID} py-2.5 text-[13px] font-normal text-[#4b535b] border-y border-[#eceef0] bg-[#f8f9fa] dark:border-white/10 dark:bg-white/5 dark:text-[#9aa4a8]`;
const NETWORK_ACTIVITY_TABLE_ROW_CLASS = `${NETWORK_ACTIVITY_TABLE_GRID} py-3.5 border-b border-[#eceef0] last:border-b-0 transition-colors hover:bg-[#f8f9fa] dark:border-white/10 dark:hover:bg-white/5`;

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const PAYROLL_STATUS: Record<RecentActivity["status"], { label: string; tone: AgencyTone }> = {
  paid: { label: "Paid", tone: "green" },
  partially_paid: { label: "Partially paid", tone: "teal" },
  failed: { label: "Failed", tone: "red" },
  rejected: { label: "Failed", tone: "red" },
  pending: { label: "In progress", tone: "amber" },
};

const CLAIM_TONES: Record<"pending" | "paid" | "rejected", AgencyTone> = {
  pending: "slate",
  paid: "green",
  rejected: "red",
};

function ActivityStatusBadge({ activity }: { activity: RecentActivity }) {
  if (activity.module === "Payroll") {
    const meta = PAYROLL_STATUS[activity.status] ?? PAYROLL_STATUS.pending;
    return <AgencyPill tone={meta.tone}>{meta.label}</AgencyPill>;
  }
  const status = activity.status === "paid" || activity.status === "rejected" ? activity.status : "pending";
  return <AgencyPill tone={CLAIM_TONES[status]}>{getClaimStatusLabel(status)}</AgencyPill>;
}

type RecentActivityRowProps = {
  activity: NetworkAgencyActivity | RecentActivity;
  variant: "desktop" | "mobile";
  showAgency: boolean;
};

const RecentActivityRow = memo(function RecentActivityRow({
  activity,
  variant,
  showAgency,
}: RecentActivityRowProps) {
  const formattedAmount = currencyFormatter.format(activity.amount);
  const agencyName = showAgency
    ? (activity as NetworkAgencyActivity).agencyName
    : undefined;

  if (variant === "mobile") {
    return (
      <article className="border-b border-[#eceef0] px-4 py-4 last:border-b-0 dark:border-white/10">
        <div className="flex items-start justify-between gap-3">
          <p className="min-w-0 text-[14px] font-medium text-[#10141a] dark:text-[#f4f6f7]">
            {activity.description}
          </p>
          <ActivityStatusBadge activity={activity} />
        </div>
        <dl className="mt-3 space-y-2 text-[13px]">
          {showAgency ? (
            <div className="flex justify-between gap-4">
              <dt className="text-[#6b737a]">Agency</dt>
              <dd className="text-[#10141a] dark:text-[#e6eaec]">{agencyName}</dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-4">
            <dt className="text-[#6b737a]">Type</dt>
            <dd className="text-[#10141a] dark:text-[#e6eaec]">{activity.module}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[#6b737a]">Amount</dt>
            <dd className="tabular-nums text-[#10141a] dark:text-[#e6eaec]">
              {formattedAmount}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[#6b737a]">Date</dt>
            <dd className="text-[#10141a] dark:text-[#e6eaec]">{activity.date}</dd>
          </div>
        </dl>
      </article>
    );
  }

  return (
    <div
      className={
        showAgency ? NETWORK_ACTIVITY_TABLE_ROW_CLASS : ACTIVITY_TABLE_ROW_CLASS
      }
    >
      {showAgency ? (
        <span
          className="truncate text-[14px] font-medium text-[#10141a] dark:text-[#f4f6f7]"
          title={agencyName}
        >
          {agencyName}
        </span>
      ) : null}
      <span className="min-w-0 text-[14px] font-medium text-[#10141a] dark:text-[#f4f6f7]">{activity.description}</span>
      <span className="text-[14px] text-[#2a3138] dark:text-[#c9d1d4]">{activity.module}</span>
      <span className="text-[14px] tabular-nums text-[#10141a] dark:text-[#e6eaec]">
        {formattedAmount}
      </span>
      <span className="text-[14px] text-[#2a3138] dark:text-[#c9d1d4]">{activity.date}</span>
      <div className="justify-self-start">
        <ActivityStatusBadge activity={activity} />
      </div>
    </div>
  );
});

function ActivityRowSkeleton({
  variant,
  showAgency,
}: {
  variant: "desktop" | "mobile";
  showAgency: boolean;
}) {
  if (variant === "mobile") {
    return (
      <div
        className="animate-pulse border-b border-[#eceef0] px-4 py-4 last:border-b-0 dark:border-white/10"
        aria-hidden
      >
        <div className="h-4 w-32 rounded bg-[#f4f5f6] dark:bg-white/5" />
        <div className="mt-3 space-y-2">
          <div className="h-3 w-full rounded bg-[#f4f5f6] dark:bg-white/5" />
          <div className="h-3 w-3/4 rounded bg-[#f4f5f6] dark:bg-white/5" />
        </div>
      </div>
    );
  }
  return (
    <div
      className={`${showAgency ? NETWORK_ACTIVITY_TABLE_ROW_CLASS : ACTIVITY_TABLE_ROW_CLASS} animate-pulse`}
      aria-hidden
    >
      {Array.from({ length: showAgency ? 6 : 5 }).map((_, index) => (
        <span key={index} className="h-3 rounded bg-[#f4f5f6] dark:bg-white/5" />
      ))}
    </div>
  );
}

type SharedRecentActivityTableProps<T extends RecentActivity> = {
  activity: T[];
  loading?: boolean;
  isRefetching?: boolean;
  nextCursor?: string | null;
  onLoadMore?: () => void;
};

type RecentActivityTableProps =
  | (SharedRecentActivityTableProps<RecentActivity> & { showAgency?: false })
  | (SharedRecentActivityTableProps<NetworkAgencyActivity> & {
      showAgency: true;
    });

export default function RecentActivityTable(props: RecentActivityTableProps) {
  const {
    activity,
    loading = false,
    isRefetching = false,
    nextCursor,
    onLoadMore,
  } = props;
  const showAgency = props.showAgency === true;

  if (showAgency) {
    assertNetworkActivityRows(activity);
  }
  const [searchQuery, setSearchQuery] = useState("");
  const isInitialLoading = loading && activity.length === 0;
  const isBusy = loading || isRefetching;
  const filteredActivity = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return activity;
    return activity.filter(
      (row) =>
        row.description.toLowerCase().includes(query) ||
        row.module.toLowerCase().includes(query) ||
        row.date.toLowerCase().includes(query) ||
        row.status.toLowerCase().includes(query) ||
        (showAgency &&
          (row as NetworkAgencyActivity).agencyName
            .toLowerCase()
            .includes(query)),
    );
  }, [activity, searchQuery, showAgency]);

  const emptyMessage = isInitialLoading
    ? ""
    : activity.length === 0
      ? "No recent activity in this date range."
      : "No activity matches your search.";
  const activityKey = (row: RecentActivity) =>
    props.showAgency
      ? `${(row as NetworkAgencyActivity).agencyId}:${row.id}`
      : row.id;

  return (
    <AgencyListCard label="Recent activity">
      <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-semibold text-[#10141a] dark:text-[#f4f6f7]">
          Recent activity
        </h2>
        <AgencySearchField
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search activity"
          label="Search recent activity"
          className="w-full sm:max-w-[260px]"
        />
      </div>
      <div className="hidden lg:block">
        <div className="overflow-x-auto">
          <div
            className={
              showAgency
                ? NETWORK_ACTIVITY_TABLE_MIN_WIDTH
                : ACTIVITY_TABLE_MIN_WIDTH
            }
          >
            <div
              className={
                showAgency
                  ? NETWORK_ACTIVITY_TABLE_HEADER_CLASS
                  : ACTIVITY_TABLE_HEADER_CLASS
              }
            >
              {showAgency ? <span>Agency</span> : null}
              <span>Activity</span>
              <span>Type</span>
              <span>Amount</span>
              <span>Date</span>
              <span>Status</span>
            </div>
            {isInitialLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <ActivityRowSkeleton
                  key={index}
                  variant="desktop"
                  showAgency={showAgency}
                />
              ))
            ) : filteredActivity.length > 0 ? (
              filteredActivity.map((row) => (
                <RecentActivityRow
                  key={activityKey(row)}
                  activity={row}
                  variant="desktop"
                  showAgency={showAgency}
                />
              ))
            ) : (
              <div className="px-4 py-10 text-center text-[14px] text-[#6b737a] dark:text-[#9aa4a8]">
                {emptyMessage}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="border-t border-[#eceef0] lg:hidden dark:border-white/10">
        {isInitialLoading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <ActivityRowSkeleton
              key={index}
              variant="mobile"
              showAgency={showAgency}
            />
          ))
        ) : filteredActivity.length > 0 ? (
          filteredActivity.map((row) => (
            <RecentActivityRow
              key={activityKey(row)}
              activity={row}
              variant="mobile"
              showAgency={showAgency}
            />
          ))
        ) : (
          <div className="px-4 py-10 text-center text-[14px] text-[#6b737a] dark:text-[#9aa4a8]">
            {emptyMessage}
          </div>
        )}
      </div>
      {nextCursor && onLoadMore ? (
        <div className="flex justify-center border-t border-[#eceef0] px-4 py-3 dark:border-white/10">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={isBusy}
            aria-busy={isBusy}
            aria-label="Load more recent activity"
            className={agencyOutlineButton}
          >
            {isBusy ? "Loading…" : "Load more recent activity"}
          </button>
        </div>
      ) : null}
    </AgencyListCard>
  );
}
