import {
  Area,
  AreaChart,
  ResponsiveContainer,
} from "recharts";

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
  data: { value: number }[];
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
    data: [{ value: 8 }, { value: 10 }, { value: 16 }, { value: 28 }, { value: 25 }, { value: 24 }, { value: 30 }],
  },
  {
    id: "issues",
    value: "6",
    label: "Total issues",
    trend: 2,
    positive: true,
    color: "#12B5B0",
    data: [{ value: 6 }, { value: 8 }, { value: 12 }, { value: 22 }, { value: 20 }, { value: 19 }, { value: 24 }],
  },
  {
    id: "revenue",
    value: "$2.4K",
    label: "Revenue generated",
    trend: -10.5,
    positive: false,
    color: "#E5484D",
    data: [{ value: 28 }, { value: 24 }, { value: 26 }, { value: 24 }, { value: 14 }, { value: 8 }, { value: 9 }],
  },
  {
    id: "billed",
    value: "28",
    label: "Shifts billed",
    trend: 10.5,
    positive: true,
    color: "#12B5B0",
    data: [{ value: 8 }, { value: 10 }, { value: 16 }, { value: 28 }, { value: 25 }, { value: 24 }, { value: 30 }],
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
    data: metric.sparkline,
  });

  return [
    mkCard("compliance", "Compliance rate", data.complianceRate, (v) => `${v}%`),
    mkCard("issues", "Total issues", data.totalIssues, (v) => `${v}`),
    mkCard("revenue", "Revenue generated", data.revenue, formatRevenue),
    mkCard("billed", "Shifts billed", data.shiftsBilled, (v) => `${v}`),
  ];
}

function MiniGraph({ data, color, id }: { data: { value: number }[]; color: string; id: string }) {
  return (
    <div className="h-[52px] w-[92px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id={`gradient-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.18} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2.2} fill={`url(#gradient-${id})`} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
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
            <MiniGraph id={card.id} color={card.color} data={card.data} />
          }
        />
      ))}
    </div>
  );
}
