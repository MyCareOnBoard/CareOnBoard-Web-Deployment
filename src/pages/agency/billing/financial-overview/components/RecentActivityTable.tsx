import { memo, useMemo, useState } from "react";
import type { RecentActivity } from "../../shared/types";
import BillingStatusBadge from "../../components/BillingStatusBadge";
import {
  ACTIVITY_TABLE_HEADER_CLASS,
  ACTIVITY_TABLE_MIN_WIDTH,
  ACTIVITY_TABLE_ROW_CLASS,
} from "./activityTableColumns";

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
  activity: RecentActivity;
  variant: "desktop" | "mobile";
};

const RecentActivityRow = memo(function RecentActivityRow({
  activity,
  variant,
}: RecentActivityRowProps) {
  const formattedAmount = currencyFormatter.format(activity.amount);

  if (variant === "mobile") {
    return (
      <div className="rounded-[16px] border border-[#e5e5e6] bg-white px-4 py-4">
        <p className="text-[14px] font-semibold text-[#10141a]">{activity.date}</p>
        <dl className="mt-3 space-y-2 text-[13px]">
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
            <dd className="font-semibold tabular-nums text-[#10141a]">{formattedAmount}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-[#808081]">Status</dt>
            <dd>
              <ActivityStatusBadge activity={activity} />
            </dd>
          </div>
        </dl>
      </div>
    );
  }

  return (
    <div className={ACTIVITY_TABLE_ROW_CLASS}>
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

function ActivityRowSkeleton({ variant }: { variant: "desktop" | "mobile" }) {
  if (variant === "mobile") {
    return (
      <div className="animate-pulse rounded-[16px] border border-[#e5e5e6] bg-white px-4 py-4">
        <div className="h-4 w-32 rounded bg-[#eef4f5]" />
        <div className="mt-3 space-y-2">
          <div className="h-3 w-full rounded bg-[#eef4f5]" />
          <div className="h-3 w-3/4 rounded bg-[#eef4f5]" />
        </div>
      </div>
    );
  }

  return (
    <div className={`${ACTIVITY_TABLE_ROW_CLASS} animate-pulse`}>
      <span className="h-3 rounded bg-[#eef4f5]" />
      <span className="h-3 rounded bg-[#eef4f5]" />
      <span className="h-3 rounded bg-[#eef4f5]" />
      <span className="h-3 w-16 rounded bg-[#eef4f5]" />
      <span className="h-6 w-[72px] justify-self-start rounded-full bg-[#eef4f5]" />
    </div>
  );
}

type RecentActivityTableProps = {
  activity: RecentActivity[];
  loading?: boolean;
};

export default function RecentActivityTable({
  activity,
  loading = false,
}: RecentActivityTableProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredActivity = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return activity;

    return activity.filter(
      (row) =>
        row.description.toLowerCase().includes(query) ||
        row.module.toLowerCase().includes(query) ||
        row.date.toLowerCase().includes(query) ||
        row.status.toLowerCase().includes(query),
    );
  }, [activity, searchQuery]);

  const emptyMessage = loading
    ? ""
    : activity.length === 0
      ? "No recent activity in this date range."
      : "No activity matches your search.";

  return (
    <section>
      <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <h2 className="text-[18px] font-semibold text-[#10141a]">Recent activity</h2>
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search activity"
          disabled={loading}
          className="h-11 w-full min-h-[44px] rounded-[12px] border border-[#e5e5e6] bg-white px-4 text-[14px] font-medium text-[#10141a] placeholder:text-[#808081] focus:border-[#00b4b8] focus:outline-none focus:ring-1 focus:ring-[#00b4b8] disabled:cursor-not-allowed disabled:opacity-60 lg:max-w-[280px]"
          aria-label="Search recent activity"
        />
      </div>

      <div className="hidden overflow-hidden rounded-[16px] border border-[#e5e5e6] bg-white lg:block">
        <div className="overflow-x-auto">
          <div className={ACTIVITY_TABLE_MIN_WIDTH}>
            <div className={ACTIVITY_TABLE_HEADER_CLASS}>
              <span>Date</span>
              <span>Module</span>
              <span>Description</span>
              <span>Amount</span>
              <span>Status</span>
            </div>

            {loading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <ActivityRowSkeleton key={index} variant="desktop" />
              ))
            ) : filteredActivity.length > 0 ? (
              filteredActivity.map((row) => (
                <RecentActivityRow key={row.id} activity={row} variant="desktop" />
              ))
            ) : (
              <div className="px-4 py-8 text-center text-[14px] text-[#808081]">{emptyMessage}</div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-3 lg:hidden">
        {loading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <ActivityRowSkeleton key={index} variant="mobile" />
          ))
        ) : filteredActivity.length > 0 ? (
          filteredActivity.map((row) => (
            <RecentActivityRow key={row.id} activity={row} variant="mobile" />
          ))
        ) : (
          <div className="rounded-[16px] border border-[#e5e5e6] bg-white px-4 py-8 text-center text-[14px] text-[#808081]">
            {emptyMessage}
          </div>
        )}
      </div>
    </section>
  );
}
