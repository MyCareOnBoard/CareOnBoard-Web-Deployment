import { AgencyStatCard } from "@/components/agency/AgencyShell";
import { cn } from "@/lib/utils";
import type { BillingOverviewStat } from "./types";

type BillingOverviewCardsProps = {
  stats: BillingOverviewStat[];
  loading?: boolean;
  /** Tiles to show while loading. Defaults to the number of stats. */
  skeletonCount?: number;
  /** Section name for screen readers. */
  heading?: string;
};

const columns: Record<number, string> = {
  1: "xl:grid-cols-1",
  2: "xl:grid-cols-2",
  3: "xl:grid-cols-3",
  4: "xl:grid-cols-4",
  5: "xl:grid-cols-5",
};

function StatSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col rounded-[16px] border border-[#e4e7ea] bg-white p-2 dark:border-white/10 dark:bg-[#1b232b]">
      <div className="animate-pulse rounded-[12px] bg-[#f4f5f6] px-4 pb-4 pt-3.5 dark:bg-white/5">
        <div className="h-7 w-32 rounded-full bg-white dark:bg-white/10" />
        <div className="mt-3 h-8 w-24 rounded bg-white dark:bg-white/10" />
      </div>
      <div className="mx-2 mb-1 mt-3 h-3 w-28 animate-pulse rounded bg-[#f4f5f6] dark:bg-white/5" />
    </div>
  );
}

/** Row of stat tiles at the top of a billing page. */
export default function BillingOverviewCards({
  stats,
  loading = false,
  skeletonCount,
  heading = "Overview",
}: BillingOverviewCardsProps) {
  const count = loading ? skeletonCount ?? Math.max(stats.length, 4) : stats.length;
  return (
    <section aria-label={heading} aria-busy={loading || undefined}>
      <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2", columns[Math.min(Math.max(count, 1), 5)])}>
        {loading
          ? Array.from({ length: count }).map((_, index) => <StatSkeleton key={index} />)
          : stats.map((stat) => (
              <AgencyStatCard
                key={stat.id}
                icon={stat.icon}
                label={stat.label}
                value={<span className="tabular-nums">{stat.value}</span>}
                extra={stat.extra}
                footnote={stat.footnote}
              />
            ))}
      </div>
    </section>
  );
}
