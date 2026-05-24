import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Sparkles,
  TrendingUp,
} from "lucide-react";

export type BillingSegment = {
  label: string;
  value: number;
  color: string;
  description?: string;
};

interface BillingSummaryProps {
  total?: number;
  data?: BillingSegment[];
  isLoading?: boolean;
}

const FALLBACK_DATA: BillingSegment[] = [
  {
    label: "Successfully billed",
    value: 27,
    color: "#12B84F",
    description:
      "Invoices successfully generated and paid",
  },
  {
    label: "Pending bill",
    value: 9,
    color: "#FF7A00",
    description:
      "Waiting for approval or payment processing",
  },
  {
    label: "Not liable",
    value: 4,
    color: "#3B82F6",
    description:
      "Excluded from billing workflow",
  },
];

const SIZE = 190;
const STROKE = 26;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function BillingSummary({
  total = 40,
  data = FALLBACK_DATA,
  isLoading,
}: BillingSummaryProps) {
  if (isLoading) {
    return (
      <div className="rounded-[32px] border border-[#E6EAEC] bg-[#FFFFFF66] p-6 animate-pulse">
        <div className="flex items-center justify-between mb-6">
          <div className="h-6 w-40 rounded bg-gray-100" />
          <div className="h-10 w-28 rounded-full bg-gray-100" />
        </div>
        <div className="flex flex-col items-center gap-6">
          <div className="h-[190px] w-[190px] rounded-full bg-gray-100" />
          <div className="w-full space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="h-4 w-40 rounded bg-gray-100" />
                <div className="h-4 w-10 rounded bg-gray-100" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  const [activeIndex, setActiveIndex] = useState<number | null>(
    null
  );

  const [animatedProgress, setAnimatedProgress] =
    useState(0);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setAnimatedProgress(1);
    }, 150);

    return () => clearTimeout(timeout);
  }, []);

  const segments = useMemo(() => {
    let accumulatedLength = 0;

    return data.map((item) => {
      const percentage =
        total > 0 ? item.value / total : 0;

      const segmentLength =
        percentage *
        CIRCUMFERENCE *
        animatedProgress;

      const dashOffset =
        CIRCUMFERENCE - accumulatedLength;

      accumulatedLength +=
        percentage * CIRCUMFERENCE;

      return {
        ...item,
        percentage: Math.round(percentage * 100),
        segmentLength,
        dashOffset,
      };
    });
  }, [data, total, animatedProgress]);

  return (
    <div
      className="
        rounded-[32px]
        border border-[#E8ECEF]
        bg-[#FFFFFF66]
        p-6
      "
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-[22px] font-semibold text-[#111827]">
          Billing summary
        </h3>

        <button
          className="
            inline-flex items-center gap-2
            rounded-full border border-white
            bg-[#FFFFFF66]
            px-4 py-3
            text-[15px] font-medium text-[#111827]
          "
        >
          <Sparkles className="h-4 w-4 text-[#12B5B0]" />
          AI insights
        </button>
      </div>

      <div className="flex flex-col items-center justify-between gap-10 xl:flex-row">
        {/* Interactive donut */}
        <div className="relative flex items-center justify-center">
          <svg
            width={SIZE}
            height={SIZE}
            className="-rotate-90"
          >
            {/* Track */}
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              stroke="#EEF2F5"
              strokeWidth={STROKE}
              fill="none"
            />

            {/* Progress segments */}
            {segments.map((segment, index) => (
              <circle
                key={segment.label}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                fill="none"
                stroke={segment.color}
                strokeWidth={
                  activeIndex === index
                    ? STROKE + 6
                    : STROKE
                }
                strokeLinecap="round"
                strokeDasharray={`${segment.segmentLength} ${CIRCUMFERENCE}`}
                strokeDashoffset={segment.dashOffset}
                className="transition-all duration-500 cursor-pointer "
                onMouseEnter={() =>
                  setActiveIndex(index)
                }
                onMouseLeave={() =>
                  setActiveIndex(null)
                }
              />
            ))}
          </svg>

          {/* Center content */}
          <div
            className="
              absolute flex h-[120px] w-[120px]
              flex-col items-center justify-center
              rounded-full bg-white
              shadow-sm
            "
          >
            <span className="text-[42px] font-semibold leading-none text-[#111827]">
              {total}
            </span>

            <span className="mt-2 max-w-[140px] text-center text-[12px] leading-[18px] text-[#111827]">
              Total billable shifts
            </span>
          </div>

          {/* Tooltip */}
          {activeIndex !== null && (
            <div
              className="
                absolute -right-10 top-0 z-20
                w-[220px]
                rounded-2xl border border-[#E8ECEF]
                bg-white p-4
                shadow-[0_10px_40px_rgba(0,0,0,0.08)]
              "
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-3 h-3 mt-1 rounded-full"
                  style={{
                    backgroundColor:
                      segments[activeIndex].color,
                  }}
                />

                <div>
                  <p className="text-[14px] font-semibold text-[#111827]">
                    {segments[activeIndex].label}
                  </p>

                  <p className="mt-1 text-[12px] leading-[20px] text-[#6B7280]">
                    {
                      segments[activeIndex]
                        .description
                    }
                  </p>

                  <div className="mt-3 flex items-center gap-2 text-[#12B5B0]">
                    <TrendingUp className="w-4 h-4" />

                    <span className="text-[12px] font-medium">
                      {
                        segments[activeIndex]
                          .percentage
                      }
                      % of total billing
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="w-full max-w-[320px] space-y-5">
          {segments.map((item, index) => (
            <button
              key={item.label}
              type="button"
              onMouseEnter={() =>
                setActiveIndex(index)
              }
              onMouseLeave={() =>
                setActiveIndex(null)
              }
              className={`
                flex w-full items-center justify-between
                rounded-2xl border
                px-4 py-4
                text-left
                transition-all duration-300
                ${
                  activeIndex === index
                    ? "border-[#D8E1E5] bg-[#F8FAFB]"
                    : "border-transparent bg-transparent"
                }
              `}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{
                    backgroundColor: item.color,
                  }}
                />

                <span className="text-[13px] text-[#111827]">
                  {item.label}
                </span>
              </div>

              <span className="text-[13px] font-semibold text-[#111827]">
                {item.value} ({item.percentage}%)
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}