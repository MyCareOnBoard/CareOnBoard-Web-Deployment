import { memo, useEffect, useMemo, useState } from "react";
import type { DonutSegment } from "../../shared/types";

const SIZE = 190;
const STROKE = 26;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

type BuiltSegment = DonutSegment & {
  percentage: number;
  segmentLength: number;
  dashOffset: number;
};

type ClaimsDonutChartProps = {
  total: number;
  centerLabel: string;
  data: DonutSegment[];
  showPercentageInLegend?: boolean;
  legendData?: DonutSegment[];
  interactive?: boolean;
  onLegendItemClick?: (segment: DonutSegment) => void;
};

function buildSegments(data: DonutSegment[], progress: number): BuiltSegment[] {
  const segmentTotal = data.reduce((sum, item) => sum + item.value, 0);
  let accumulatedLength = 0;

  return data.map((item) => {
    const percentage = segmentTotal > 0 ? item.value / segmentTotal : 0;
    const segmentLength = percentage * CIRCUMFERENCE * progress;
    const dashOffset = -accumulatedLength;

    accumulatedLength += percentage * CIRCUMFERENCE;

    return {
      ...item,
      percentage: Math.round(percentage * 100),
      segmentLength,
      dashOffset,
    };
  });
}

function DonutCenter({ total, centerLabel, shadow }: { total: number; centerLabel: string; shadow: boolean }) {
  return (
    <div
      className={
        shadow
          ? "absolute flex h-[120px] w-[120px] flex-col items-center justify-center rounded-full bg-white shadow-sm"
          : "absolute flex h-[120px] w-[120px] flex-col items-center justify-center rounded-full bg-white"
      }
    >
      <span className="text-[36px] font-bold leading-none text-[#10141a] tabular-nums">{total}</span>
      <span className="mt-2 max-w-[100px] text-center text-[12px] leading-[18px] text-[#808081]">
        {centerLabel}
      </span>
    </div>
  );
}

function StaticDonutChart({
  total,
  centerLabel,
  data,
  showPercentageInLegend = false,
  legendData,
}: ClaimsDonutChartProps) {
  const segments = buildSegments(data, 1);
  const legendItems = legendData ?? data;

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative flex shrink-0 items-center justify-center">
        <svg width={SIZE} height={SIZE} className="-rotate-90" aria-hidden="true">
          {segments.map((segment) => (
            <circle
              key={segment.label}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke={segment.color}
              strokeWidth={STROKE}
              strokeLinecap="butt"
              strokeDasharray={`${segment.segmentLength} ${CIRCUMFERENCE - segment.segmentLength}`}
              strokeDashoffset={segment.dashOffset}
            />
          ))}
        </svg>
        <DonutCenter total={total} centerLabel={centerLabel} shadow={false} />
      </div>

      <div className="min-w-[160px] shrink-0 space-y-4">
        {legendItems.map((item) => {
          const percentage = total > 0 ? Math.round((item.value / total) * 100) : 0;
          const valueLabel = showPercentageInLegend ? `${percentage}%` : item.value;

          return (
            <div key={item.label} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="whitespace-nowrap text-[14px] text-[#10141a]">{item.label}</span>
              </div>
              <span className="text-[14px] font-bold tabular-nums text-[#10141a]">{valueLabel}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function InteractiveDonutChart({
  total,
  centerLabel,
  data,
  showPercentageInLegend = false,
  legendData,
  onLegendItemClick,
}: ClaimsDonutChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [animatedProgress, setAnimatedProgress] = useState(0);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    if (mediaQuery.matches) {
      setAnimatedProgress(1);
      return;
    }

    const timeout = setTimeout(() => setAnimatedProgress(1), 150);
    return () => clearTimeout(timeout);
  }, []);

  const segments = useMemo(() => buildSegments(data, animatedProgress), [animatedProgress, data]);
  const legendItems = legendData ?? data;

  return (
    <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-center lg:justify-between">
      <div className="relative flex shrink-0 items-center justify-center">
        <svg width={SIZE} height={SIZE} className="-rotate-90" aria-hidden="true">
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            stroke="#eef4f5"
            strokeWidth={STROKE}
            fill="none"
          />
          {segments.map((segment, index) => (
            <circle
              key={segment.label}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke={segment.color}
              strokeWidth={activeIndex === index ? STROKE + 6 : STROKE}
              strokeLinecap="round"
              strokeDasharray={`${segment.segmentLength} ${CIRCUMFERENCE - segment.segmentLength}`}
              strokeDashoffset={segment.dashOffset}
              className="cursor-pointer transition-all duration-500"
              onMouseEnter={() => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
            />
          ))}
        </svg>
        <DonutCenter total={total} centerLabel={centerLabel} shadow />
      </div>

      <div className="w-full max-w-[280px] space-y-3">
        {legendItems.map((item, index) => {
          const percentage = total > 0 ? Math.round((item.value / total) * 100) : 0;
          const valueLabel = showPercentageInLegend ? `${percentage}%` : item.value;

          return (
            <button
              key={item.label}
              type="button"
              onMouseEnter={() => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
              onClick={() => onLegendItemClick?.(item)}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition-colors ${
                activeIndex === index ? "bg-[#eef4f5]" : "bg-transparent"
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-[13px] text-[#10141a]">{item.label}</span>
              </div>
              <span className="text-[13px] font-semibold tabular-nums text-[#10141a]">{valueLabel}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ClaimsDonutChart(props: ClaimsDonutChartProps) {
  if (props.interactive === false) {
    return <StaticDonutChart {...props} />;
  }

  return <InteractiveDonutChart {...props} />;
}

export default memo(ClaimsDonutChart);
