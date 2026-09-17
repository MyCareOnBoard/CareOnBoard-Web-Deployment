import AnalyticsMetricCard, {
  AnalyticsMetricCardSkeleton,
} from "@/components/analytics/AnalyticsMetricCard";
import type {
  AnalyticsSummaryData,
  AnalyticsKpiMetric,
} from "@/lib/api/reports";
import { rateState, RATE_HELPER, FLAGS_HELPER } from "../analyticsScope";
interface OverviewCardsProps {
  data?: AnalyticsSummaryData["overview"];
  availability?: AnalyticsSummaryData["complianceAvailability"];
  populationTotal?: number;
  isLoading?: boolean;
}
export default function OverviewCards({
  data,
  availability,
  populationTotal,
  isLoading,
}: OverviewCardsProps) {
  if (isLoading)
    return (
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        {[1, 2, 3, 4].map((id) => (
          <AnalyticsMetricCardSkeleton key={id} />
        ))}
      </div>
    );
  const state =
    data && availability
      ? rateState({
          overview: data,
          complianceAvailability: availability,
          populationTotal,
        })
      : "unavailable";
  const cards: {
    label: string;
    metric?: AnalyticsKpiMetric;
    value: string;
    helper?: string;
  }[] = [];
  if (state !== "restricted")
    cards.push({
      label: "No expiry/signature flags",
      metric: state === "available" ? data?.complianceRate : undefined,
      value:
        state === "empty"
          ? "No records to assess"
          : state === "available"
            ? data!.complianceRate!.value + "%"
            : "Unavailable",
      helper: RATE_HELPER,
    });
  if (availability?.flags !== "restricted")
    cards.push({
      label: "Document & incident flags",
      metric:
        availability?.flags === "available" &&
        Number.isFinite(data?.totalIssues?.value)
          ? data?.totalIssues
          : undefined,
      value:
        availability?.flags === "available" &&
        Number.isFinite(data?.totalIssues?.value)
          ? String(data!.totalIssues!.value)
          : "Unavailable",
      helper: FLAGS_HELPER,
    });
  const revenue = data?.revenue.value;
  cards.push(
    {
      label: "Revenue generated",
      metric: data?.revenue,
      value:
        revenue === undefined
          ? "Unavailable"
          : revenue >= 1e6
            ? "$" + (revenue / 1e6).toFixed(1) + "M"
            : revenue >= 1000
              ? "$" + (revenue / 1000).toFixed(1) + "K"
              : "$" + revenue,
    },
    {
      label: "Shifts billed",
      metric: data?.shiftsBilled,
      value: data ? String(data.shiftsBilled.value) : "Unavailable",
    },
  );
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
      {cards.map((card) => (
        <AnalyticsMetricCard
          key={card.label}
          label={card.label}
          value={card.value}
          helper={card.helper}
          trend={card.metric?.trend}
          sentiment={
            (card.metric?.trend ?? 0) >= 0 ? "improvement" : "regression"
          }
          graph={
            card.metric ? (
              <div
                data-testid="overview-metric-color-block"
                className="h-[52px] w-[92px] opacity-80"
                style={{
                  backgroundColor:
                    (card.metric.trend ?? 0) >= 0 ? "#12B5B0" : "#E5484D",
                }}
              />
            ) : null
          }
        />
      ))}
    </div>
  );
}
