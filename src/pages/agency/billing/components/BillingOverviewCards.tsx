import type { BillingOverviewStat } from "./types";

type BillingOverviewCardsProps = {
  stats: BillingOverviewStat[];
  showCountBadge?: boolean;
};

export default function BillingOverviewCards({
  stats,
  showCountBadge = false,
}: BillingOverviewCardsProps) {
  return (
    <section>
      <h2 className="mb-4 text-[16px] font-semibold text-[#10141a]">Overview</h2>
      <div className="flex flex-wrap gap-6">
        {stats.map((stat) => (
          <div
            key={stat.id}
            className="flex h-[77px] min-w-[199px] flex-[1_1_199px] flex-col justify-center rounded-[8px] border border-[#e5e5e6] bg-white px-4 py-[11px]"
          >
            <p className="text-[20px] font-bold leading-none text-[#10141a] tabular-nums">
              {stat.value}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-[14px] font-medium leading-none text-[#10141a]">
                {stat.label}
              </span>
              {showCountBadge && stat.count != null && (
                <span className="inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-[#e8eaed] px-1.5 text-[12px] font-semibold leading-none text-[#10141a] tabular-nums">
                  {stat.count}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
