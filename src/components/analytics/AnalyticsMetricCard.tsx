import type { ReactNode } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";

export type TrendSentiment = "improvement" | "regression" | "neutral";

type AnalyticsMetricCardProps = {
  value: string;
  label: string;
  trend: number;
  sentiment: TrendSentiment;
  graph: ReactNode;
  helper?: string;
};

const sentimentClass: Record<TrendSentiment, string> = {
  improvement: "text-[#12B5B0]",
  regression: "text-[#E5484D]",
  neutral: "text-[#808081]",
};

export function AnalyticsMetricCardSkeleton({
  withHelper = false,
}: {
  withHelper?: boolean;
}) {
  return (
    <div
      data-testid="analytics-metric-skeleton"
      className="animate-pulse rounded-2xl border border-[#E6EAEC] bg-white/80 px-5 py-4 shadow-[0_2px_10px_rgba(15,23,42,0.02)]"
    >
      <div className="flex min-h-[72px] items-start justify-between gap-4">
        <div className="flex-1 space-y-3">
          <div className="h-7 w-24 rounded bg-gray-100" />
          <div className="h-4 w-32 rounded bg-gray-100" />
          {withHelper ? (
            <div
              data-testid="analytics-metric-helper-skeleton"
              className="h-3 w-40 rounded bg-gray-100"
            />
          ) : null}
        </div>
        <div
          data-testid="analytics-metric-graph-skeleton"
          className="h-[52px] w-[92px] rounded bg-gray-100"
        />
      </div>
    </div>
  );
}

export default function AnalyticsMetricCard({
  value,
  label,
  trend,
  sentiment,
  graph,
  helper,
}: AnalyticsMetricCardProps) {
  const accessibleTrend =
    sentiment === "neutral"
      ? "No change"
      : `${Math.abs(trend)}% ${sentiment}`;
  const DirectionIcon = trend > 0 ? ArrowUp : trend < 0 ? ArrowDown : null;

  return (
    <div className="rounded-2xl border border-[#E6EAEC] bg-white/80 px-5 py-4 shadow-[0_2px_10px_rgba(15,23,42,0.02)]">
      <div className="flex min-h-[72px] items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[28px] font-semibold leading-none tracking-[-1px] text-[#111827]">
              {value}
            </h3>
            <span
              aria-label={accessibleTrend}
              className={`flex items-center gap-1 text-[14px] font-medium ${sentimentClass[sentiment]}`}
            >
              {DirectionIcon ? (
                <DirectionIcon aria-hidden="true" className="h-3.5 w-3.5" />
              ) : null}
              {Math.abs(trend)}%
            </span>
          </div>
          <p className="mt-3 text-[13px] font-semibold leading-[18px] text-[#111827]">
            {label}
          </p>
          {helper ? (
            <p className="mt-2 text-xs leading-5 text-[#808081]">{helper}</p>
          ) : null}
        </div>
        <div aria-hidden="true" className="shrink-0">
          {graph}
        </div>
      </div>
    </div>
  );
}
