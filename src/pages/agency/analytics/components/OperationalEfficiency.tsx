import React from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
} from "recharts";

import {
  ArrowDown,
  ArrowUp,
  Clock3,
  Sparkles,
  UserRoundCog,
  WandSparkles,
} from "lucide-react";

type MetricPoint = {
  value: number;
};

export type OperationalMetric = {
  id: string;
  title: string;
  value: string;
  trend: number;
  icon?: React.ElementType;
  chartColor: string;
  data?: MetricPoint[];
};

interface OperationalEfficiencyProps {
  metrics?: OperationalMetric[];
}

const FALLBACK_METRICS: OperationalMetric[] = [
  {
    id: "resolve",
    title: "Avg. time to resolve issues",
    value: "2.3 hrs",
    trend: 10.5,
    icon: Clock3,
    chartColor: "#12B5B0",
    data: [
      { value: 8 },
      { value: 10 },
      { value: 14 },
      { value: 20 },
      { value: 18 },
      { value: 22 },
      { value: 24 },
    ],
  },
  {
    id: "auto",
    title: "Auto resolved issues",
    value: "40%",
    trend: 10.5,
    icon: WandSparkles,
    chartColor: "#12B5B0",
    data: [
      { value: 5 },
      { value: 8 },
      { value: 10 },
      { value: 18 },
      { value: 16 },
      { value: 20 },
      { value: 24 },
    ],
  },
  {
    id: "manual",
    title: "Manual interventions",
    value: "60%",
    trend: -10.5,
    icon: UserRoundCog,
    chartColor: "#E5484D",
    data: [
      { value: 24 },
      { value: 22 },
      { value: 18 },
      { value: 20 },
      { value: 16 },
      { value: 8 },
      { value: 6 },
    ],
  },
];

function Sparkline({
  data = [],
  color,
  id,
}: {
  data?: MetricPoint[];
  color: string;
  id: string;
}) {
  return (
    <div className="h-[56px] w-[120px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient
              id={`gradient-${id}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="0%"
                stopColor={color}
                stopOpacity={0.25}
              />

              <stop
                offset="100%"
                stopColor={color}
                stopOpacity={0}
              />
            </linearGradient>
          </defs>

          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2.5}
            fill={`url(#gradient-${id})`}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function OperationalEfficiency({
  metrics = FALLBACK_METRICS,
}: OperationalEfficiencyProps) {
  return (
    <div
      className="
        rounded-[32px]
        border border-[#E8ECEF]
        bg-[#FFFFFF66]
        p-6
      "
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-[22px] font-semibold text-[#111827]">
          Operational efficiency
        </h3>

        <button
          className="
            inline-flex items-center gap-2
            rounded-full border border-[#EEF2F4]
            bg-white
            px-4 py-3
            text-[15px] font-medium text-[#111827]
          "
        >
          <Sparkles className="h-4 w-4 text-[#12B5B0]" />
          AI insights
        </button>
      </div>

      <div className="space-y-4">
        {metrics.map((metric) => {
          const Icon = metric.icon ?? Clock3;

          const positive = metric.trend >= 0;

          return (
            <div
              key={metric.id}
              className="
                flex items-center justify-between
                rounded-2xl border border-[#EEF2F4]
                bg-white/80
                px-5 py-4
              "
            >
              <div className="flex items-center gap-4">
                <div
                  className="
                    flex h-14 w-14 items-center justify-center
                    rounded-2xl border border-[#EEF2F4]
                    bg-[#FAFBFC]
                  "
                >
                  <Icon className="h-6 w-6 text-[#111827]" />
                </div>

                <div>
                  <p className="text-[17px] text-[#374151]">
                    {metric.title}
                  </p>

                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-[16px] font-semibold text-[#111827]">
                      {metric.value}
                    </span>

                    <span
                      className={`flex items-center gap-1 text-[15px] font-medium ${
                        positive
                          ? "text-[#12B5B0]"
                          : "text-[#E5484D]"
                      }`}
                    >
                      {positive ? (
                        <ArrowUp className="w-4 h-4" />
                      ) : (
                        <ArrowDown className="w-4 h-4" />
                      )}

                      {Math.abs(metric.trend)}%
                    </span>
                  </div>
                </div>
              </div>

              <Sparkline
                id={metric.id}
                data={metric.data ?? []}
                color={metric.chartColor}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}