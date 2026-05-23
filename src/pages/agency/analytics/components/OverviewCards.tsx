import React from "react";

import {
  Area,
  AreaChart,
  ResponsiveContainer,
} from "recharts";

import {
  ArrowDown,
  ArrowUp,
} from "lucide-react";

type OverviewCard = {
  id: string;
  value: string;
  label: string;
  trend: number;
  positive: boolean;
  color: string;
  data: {
    value: number;
  }[];
};

const cards: OverviewCard[] = [
  {
    id: "compliance",
    value: "78%",
    label: "Compliance rate",
    trend: 10.5,
    positive: true,
    color: "#12B5B0",
    data: [
      { value: 8 },
      { value: 10 },
      { value: 16 },
      { value: 28 },
      { value: 25 },
      { value: 24 },
      { value: 30 },
    ],
  },
  {
    id: "issues",
    value: "6",
    label: "Total issues",
    trend: 2,
    positive: true,
    color: "#12B5B0",
    data: [
      { value: 6 },
      { value: 8 },
      { value: 12 },
      { value: 22 },
      { value: 20 },
      { value: 19 },
      { value: 24 },
    ],
  },
  {
    id: "revenue",
    value: "$2.4K",
    label: "Revenue generated",
    trend: -10.5,
    positive: false,
    color: "#E5484D",
    data: [
      { value: 28 },
      { value: 24 },
      { value: 26 },
      { value: 24 },
      { value: 14 },
      { value: 8 },
      { value: 9 },
    ],
  },
  {
    id: "billed",
    value: "28",
    label: "Shifts billed",
    trend: 10.5,
    positive: true,
    color: "#12B5B0",
    data: [
      { value: 8 },
      { value: 10 },
      { value: 16 },
      { value: 28 },
      { value: 25 },
      { value: 24 },
      { value: 30 },
    ],
  },
];

function MiniGraph({
  data,
  color,
  id,
}: {
  data: {
    value: number;
  }[];
  color: string;
  id: string;
}) {
  return (
    <div className="h-[52px] w-[92px]">
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
                stopOpacity={0.18}
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
            strokeWidth={2.2}
            fill={`url(#gradient-${id})`}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function OverviewCards() {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.id}
          className="
            rounded-2xl
            border border-[#E6EAEC]
            bg-white/80
            px-5 py-4
            shadow-[0_2px_10px_rgba(15,23,42,0.02)]
          "
        >
          <div className="flex items-start justify-between gap-4">
            {/* Left */}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3
                  className="
                    text-[28px]
                    font-semibold
                    leading-none
                    tracking-[-1px]
                    text-[#111827]
                  "
                >
                  {card.value}
                </h3>

                <span
                  className={`flex items-center gap-1 rounded-full text-[14px] font-medium ${
                    card.positive
                      ? "text-[#12B5B0]"
                      : "text-[#E5484D]"
                  }`}
                >
                  {card.positive ? (
                    <ArrowUp className="h-3.5 w-3.5" />
                  ) : (
                    <ArrowDown className="h-3.5 w-3.5" />
                  )}

                  {Math.abs(card.trend)}%
                </span>
              </div>

              <p
                className="
                  mt-3
                  text-[13px]
                  font-semibold
                  leading-[18px]
                  text-[#111827]
                "
              >
                {card.label}
              </p>
            </div>

            {/* Graph */}
            <MiniGraph
              id={card.id}
              color={card.color}
              data={card.data}
            />
          </div>
        </div>
      ))}
    </div>
  );
}