import { ArrowDown, ArrowUp } from "lucide-react";
import { OVERVIEW_STATS } from "../data/mockFinancialOverviewData";

export default function FinancialOverviewCards() {
  return (
    <section>
      <h2 className="mb-4 text-[16px] font-semibold text-[#10141a]">Overview</h2>
      <div className="flex flex-wrap gap-6">
        {OVERVIEW_STATS.map((stat) => (
          <div
            key={stat.id}
            className="flex h-[77px] min-w-[199px] flex-[1_1_199px] flex-col justify-center rounded-[8px] border border-[#e5e5e6] bg-white px-4 py-[11px]"
          >
            <div className="flex items-center gap-2">
              <p className="text-[20px] font-bold leading-none text-[#10141a] tabular-nums">
                {stat.value}
              </p>
              <span
                className={`inline-flex items-center gap-0.5 text-[12px] font-semibold leading-none ${
                  stat.positive ? "text-[#12B5B0]" : "text-[#E5484D]"
                }`}
              >
                {stat.positive ? (
                  <ArrowUp className="h-3.5 w-3.5" aria-hidden />
                ) : (
                  <ArrowDown className="h-3.5 w-3.5" aria-hidden />
                )}
                {Math.abs(stat.trend)}%
              </span>
            </div>
            <p className="mt-2 text-[14px] font-medium leading-none text-[#10141a]">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
