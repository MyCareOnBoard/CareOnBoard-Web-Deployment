import AnalyticsMetricCard, {
  AnalyticsMetricCardSkeleton,
} from "@/components/analytics/AnalyticsMetricCard";
import type { KpiMetric } from "@/lib/api/reports";

type OverviewCard = {
  id: string;
  value: string;
  label: string;
  trend: number;
  positive: boolean;
  color: string;
};

interface OverviewCardsProps {
  data?: {
    complianceRate: KpiMetric;
    totalIssues: KpiMetric;
    revenue: KpiMetric;
    shiftsBilled: KpiMetric;
  };
  isLoading?: boolean;
}

const FALLBACK_CARDS: OverviewCard[] = [
  {
    id: "compliance",
    value: "78%",
    label: "Compliance rate",
    trend: 10.5,
    positive: true,
    color: "#12B5B0",
  },
  {
    id: "issues",
    value: "6",
    label: "Total issues",
    trend: 2,
    positive: true,
    color: "#12B5B0",
  },
  {
    id: "revenue",
    value: "$2.4K",
    label: "Revenue generated",
    trend: -10.5,
    positive: false,
    color: "#E5484D",
  },
  {
    id: "billed",
    value: "28",
    label: "Shifts billed",
    trend: 10.5,
    positive: true,
    color: "#12B5B0",
  },
];

function formatRevenue(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v}`;
}

function buildCards(data: NonNullable<OverviewCardsProps["data"]>): OverviewCard[] {
  const mkCard = (
    id: string,
    label: string,
    metric: KpiMetric,
    fmt: (v: number) => string
  ): OverviewCard => ({
    id,
    label,
    value: fmt(metric.value),
    trend: metric.trend,
    positive: metric.trend >= 0,
    color: metric.trend >= 0 ? "#12B5B0" : "#E5484D",
  });

  return [
    mkCard("compliance", "Compliance rate", data.complianceRate, (v) => `${v}%`),
    mkCard("issues", "Total issues", data.totalIssues, (v) => `${v}`),
    mkCard("revenue", "Revenue generated", data.revenue, formatRevenue),
    mkCard("billed", "Shifts billed", data.shiftsBilled, (v) => `${v}`),
  ];
}

function MetricColorBlock({ color }: { color: string }) {
  return (
    <div
      data-testid="overview-metric-color-block"
      className="h-[52px] w-[92px] opacity-80"
      style={{ backgroundColor: color }}
    />
  );
}


export default function OverviewCards({ data, isLoading }: OverviewCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        {FALLBACK_CARDS.map((card) => (
          <AnalyticsMetricCardSkeleton key={card.id} />
        ))}
      </div>
    );
  }

  const cards = data ? buildCards(data) : FALLBACK_CARDS;

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
      {cards.map((card) => (
        <AnalyticsMetricCard
          key={card.id}
          value={card.value}
          label={card.label}
          trend={card.trend}
          sentiment={card.positive ? "improvement" : "regression"}
          graph={
            <MetricColorBlock color={card.color} />
          }
        />
      ))}
    </div>
  );
}
