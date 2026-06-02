import { ArrowDown, ArrowUp } from "lucide-react";
import type { FinancialOverviewStat } from "../utils/financialOverviewUtils";

type FinancialOverviewCardsProps = {
  stats: FinancialOverviewStat[];
  loading?: boolean;
  trendsLoading?: boolean;
};

function CardSkeleton() {
  return (
    <div className="flex h-[77px] min-w-[199px] flex-[1_1_199px] animate-pulse flex-col justify-center rounded-[8px] border border-[#e5e5e6] bg-white px-4 py-[11px]">
      <div className="h-5 w-24 rounded bg-[#eef4f5]" />
      <div className="mt-2 h-4 w-32 rounded bg-[#eef4f5]" />
    </div>
  );
}

function TrendSkeleton() {
  return <span className="inline-block h-3.5 w-10 animate-pulse rounded bg-[#eef4f5]" />;
}

export default function FinancialOverviewCards({
  stats,
  loading = false,
  trendsLoading = false,
}: FinancialOverviewCardsProps) {
  return (
    <section>
      <h2 className="mb-4 text-[16px] font-semibold text-[#10141a]">Overview</h2>
      <div className="flex flex-wrap gap-6">
        {loading
          ? Array.from({ length: 5 }).map((_, index) => <CardSkeleton key={index} />)
          : stats.map((stat) => (
              <div
                key={stat.id}
                className="flex h-[77px] min-w-[199px] flex-[1_1_199px] flex-col justify-center rounded-[8px] border border-[#e5e5e6] bg-white px-4 py-[11px]"
              >
                <div className="flex items-center gap-2">
                  <p className="text-[20px] font-bold leading-none text-[#10141a] tabular-nums">
                    {stat.value}
                  </p>
                  {stat.id === "claims-at-risk" ? null : trendsLoading && !stat.trend ? (
                    <TrendSkeleton />
                  ) : stat.trend ? (
                    <span
                      className={`inline-flex items-center gap-0.5 text-[12px] font-semibold leading-none ${
                        stat.trend.positive ? "text-[#12B5B0]" : "text-[#E5484D]"
                      }`}
                    >
                      {stat.trend.positive ? (
                        <ArrowUp className="h-3.5 w-3.5" aria-hidden />
                      ) : (
                        <ArrowDown className="h-3.5 w-3.5" aria-hidden />
                      )}
                      {stat.trend.value.toFixed(stat.trend.value >= 100 ? 0 : 1)}%
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 text-[14px] font-medium leading-none text-[#10141a]">
                  {stat.label}
                </p>
              </div>
            ))}
      </div>
    </section>
  );
}
