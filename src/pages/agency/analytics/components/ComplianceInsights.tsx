import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Sparkles,
  TrendingUp,
} from "lucide-react";

export type ComplianceSegment = {
  label: string;
  value: number;
  color: string;
  description?: string;
};

interface ComplianceInsightsProps {
  total?: number;
  data?: ComplianceSegment[];
}

const FALLBACK_DATA: ComplianceSegment[] = [
  {
    label: "Expired Certification",
    value: 4,
    color: "#f33500",
    description:
      "Staff certifications expired this week",
  },
  {
    label: "Overtime risk",
    value: 2,
    color: "#FF7A00",
    description:
      "Staff exceeding safe overtime thresholds",
  },
  {
    label: "Missing document",
    value: 1,
    color: "#3B82F6",
    description:
      "Required compliance documents missing",
  },
  {
    label: "Other",
    value: 0,
    color: "#BDBDBD",
    description:
      "Additional uncategorized compliance issues",
  },
];

const SIZE = 190;
const STROKE = 26;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function ComplianceInsights({
  total = 6,
  data = FALLBACK_DATA,
}: ComplianceInsightsProps) {
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
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-[22px] font-semibold text-[#111827]">
            Compliance insights
          </h3>

          <p className="mt-2 text-[15px] text-[#6B7280]">
            Issue distribution
          </p>
        </div>

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

            {/* Segments */}
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
                    ? STROKE + 5
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

          {/* Center */}
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

            <span className="mt-1 text-center text-[14px] leading-[18px] text-[#111827]">
              Total issues
            </span>
          </div>

          {/* Tooltip */}
          {activeIndex !== null && (
            <div
              className="
                absolute -right-12 top-0 z-20
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
                  <p className="text-[12px] font-semibold text-[#111827]">
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

                    <span className="text-[14px] font-medium">
                      {
                        segments[activeIndex]
                          .percentage
                      }
                      % of total issues
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Legends */}
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
              <div className="flex items-center gap-2 ">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{
                    backgroundColor: item.color,
                  }}
                />

                <span className="text-[14px] text-[#111827]">
                  {item.label}
                </span>
              </div>

              <span className="text-[14px] font-semibold text-[#111827]">
                {item.value}(
                {item.percentage}%)
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}