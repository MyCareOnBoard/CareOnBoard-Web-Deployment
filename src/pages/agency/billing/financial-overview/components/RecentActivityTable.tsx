import { memo, useMemo, useState } from "react";
import type { RecentActivity } from "../../shared/types";
import BillingStatusBadge from "../../components/BillingStatusBadge";
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
  "grid grid-cols-[minmax(140px,1fr)_minmax(120px,1fr)_minmax(90px,0.8fr)_minmax(200px,2fr)_minmax(100px,0.9fr)_minmax(88px,max-content)] items-center gap-3 px-4";
const NETWORK_ACTIVITY_TABLE_HEADER_CLASS = `${NETWORK_ACTIVITY_TABLE_GRID} py-3 text-[13px] font-semibold text-[#10141a] border-b border-[#e5e5e6]`;
const NETWORK_ACTIVITY_TABLE_ROW_CLASS = `${NETWORK_ACTIVITY_TABLE_GRID} py-3.5 border-b border-[#e5e5e6] last:border-b-0`;

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

function ActivityStatusBadge({ activity }: { activity: RecentActivity }) {
  if (activity.module === "Payroll") {
    return (
      <BillingStatusBadge
        domain="payroll"
        status={activity.status === "paid" ? "paid" : "pending"}
      />
    );
  }
  return <BillingStatusBadge domain="claim" status={activity.status} />;
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
      <article className="rounded-[16px] border border-[#e5e5e6] bg-white px-4 py-4">
        <p className="text-[14px] font-semibold text-[#10141a]">
          {activity.date}
        </p>
        <dl className="mt-3 space-y-2 text-[13px]">
          {showAgency ? (
            <div className="flex justify-between gap-4">
              <dt className="text-[#808081]">Agency</dt>
              <dd className="font-medium text-[#10141a]">{agencyName}</dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-4">
            <dt className="text-[#808081]">Module</dt>
            <dd className="font-medium text-[#10141a]">{activity.module}</dd>
          </div>
          <div>
            <dt className="text-[#808081]">Description</dt>
            <dd className="mt-0.5 text-[#10141a]">{activity.description}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[#808081]">Amount</dt>
            <dd className="font-semibold tabular-nums text-[#10141a]">
              {formattedAmount}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-[#808081]">Status</dt>
            <dd>
              <ActivityStatusBadge activity={activity} />
            </dd>
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
          className="truncate text-[13px] font-medium text-[#10141a]"
          title={agencyName}
        >
          {agencyName}
        </span>
      ) : null}
      <span className="text-[13px] text-[#10141a]">{activity.date}</span>
      <span className="text-[13px] text-[#10141a]">{activity.module}</span>
      <span className="text-[13px] text-[#10141a]">{activity.description}</span>
      <span className="text-[13px] font-semibold tabular-nums text-[#10141a]">
        {formattedAmount}
      </span>
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
        className="animate-pulse rounded-[16px] border border-[#e5e5e6] bg-white px-4 py-4"
        aria-hidden
      >
        <div className="h-4 w-32 rounded bg-[#eef4f5]" />
        <div className="mt-3 space-y-2">
          <div className="h-3 w-full rounded bg-[#eef4f5]" />
          <div className="h-3 w-3/4 rounded bg-[#eef4f5]" />
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
        <span key={index} className="h-3 rounded bg-[#eef4f5]" />
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
    <section>
      <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <h2 className="text-[18px] font-semibold text-[#10141a]">
          Recent activity
        </h2>
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search activity"
          disabled={isBusy}
          className="h-11 w-full min-h-[44px] rounded-[12px] border border-[#e5e5e6] bg-white px-4 text-[14px] font-medium text-[#10141a] placeholder:text-[#808081] focus:border-[#00b4b8] focus:outline-none focus:ring-1 focus:ring-[#00b4b8] disabled:cursor-not-allowed disabled:opacity-60 lg:max-w-[280px]"
          aria-label="Search recent activity"
        />
      </div>
      <div className="hidden overflow-hidden rounded-[16px] border border-[#e5e5e6] bg-white lg:block">
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
              <span>Date</span>
              <span>Module</span>
              <span>Description</span>
              <span>Amount</span>
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
              <div className="px-4 py-8 text-center text-[14px] text-[#808081]">
                {emptyMessage}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="space-y-3 lg:hidden">
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
          <div className="rounded-[16px] border border-[#e5e5e6] bg-white px-4 py-8 text-center text-[14px] text-[#808081]">
            {emptyMessage}
          </div>
        )}
      </div>
      {nextCursor && onLoadMore ? (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={isBusy}
            aria-busy={isBusy}
            aria-label="Load more recent activity"
            className="min-h-[44px] w-full rounded-full border border-[#00b4b8] px-5 py-2 text-[13px] font-semibold text-[#00b4b8] hover:bg-[#eef4f5] disabled:opacity-50 sm:w-auto"
          >
            {isBusy ? "Loading…" : "Load more recent activity"}
          </button>
        </div>
      ) : null}
    </section>
  );
}
