import { useMemo, useState } from "react";
import { TrendingUp } from "lucide-react";

export type ComplianceBreakdownItem = {
  key?: string;
  label: string;
  value: number;
  color: string;
  description?: string;
};

type ComplianceBreakdownChartProps = {
  total: number;
  data: ComplianceBreakdownItem[];
  mode?: string;
  onSegmentClick?: (item: ComplianceBreakdownItem) => void;
};

const SIZE = 190;
const STROKE = 26;
const RADIUS = (SIZE - STROKE) / 2;

function segmentKey(item: ComplianceBreakdownItem) {
  return (
    item.key ||
    item.label
      .trim()
      .replace(/[^a-zA-Z0-9]+(.)/g, (_, character: string) =>
        character.toUpperCase(),
      )
      .replace(/^./, (character) => character.toLowerCase())
  );
}

function allocateRoundedPercentages(exactPercentages: number[]) {
  if (exactPercentages.every((percentage) => percentage === 0)) {
    return exactPercentages.map(() => 0);
  }

  const roundedPercentages = exactPercentages.map(Math.floor);
  const allocatedPoints = roundedPercentages.reduce(
    (sum, percentage) => sum + percentage,
    0,
  );
  const remainderOrder = exactPercentages
    .map((percentage, index) => ({
      index,
      remainder: percentage - roundedPercentages[index],
    }))
    .sort(
      (first, second) =>
        second.remainder - first.remainder || first.index - second.index,
    );

  for (let index = 0; index < 100 - allocatedPoints; index += 1) {
    roundedPercentages[remainderOrder[index].index] += 1;
  }

  return roundedPercentages;
}

export default function ComplianceBreakdownChart({
  total,
  data,
  mode,
  onSegmentClick,
}: ComplianceBreakdownChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const segments = useMemo(() => {
    const visibleData =
      mode === "ddd"
        ? data.filter(
            (item) =>
              item.key !== "unsignedForm485" &&
              item.label !== "Unsigned Form 485",
          )
        : data;
    const visibleTotal = visibleData.reduce(
      (sum, item) => sum + Math.max(0, Number(item.value) || 0),
      0,
    );
    const exactPercentages = visibleData.map((item) =>
      visibleTotal > 0
        ? (Math.max(0, Number(item.value) || 0) / visibleTotal) * 100
        : 0,
    );
    const roundedPercentages = allocateRoundedPercentages(exactPercentages);
    let accumulatedPercentage = 0;

    return visibleData.map((item, index) => {
      const percentageValue = exactPercentages[index];
      const dashOffset = -accumulatedPercentage;
      accumulatedPercentage += percentageValue;

      return {
        source: item,
        ...item,
        key: segmentKey(item),
        percentage: roundedPercentages[index],
        dashLength: percentageValue,
        dashOffset,
      };
    });
  }, [data, mode]);

  return (
    <div className="flex flex-col items-center justify-between gap-8 xl:flex-row">
      <div className="relative flex items-center justify-center">
        <svg
          aria-hidden="true"
          width={SIZE}
          height={SIZE}
          className="-rotate-90"
        >
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            stroke="#EEF2F5"
            strokeWidth={STROKE}
            fill="none"
          />
          {segments.map((segment, index) =>
            segment.dashLength > 0 ? (
              <circle
                key={segment.key}
                data-segment={segment.key}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                pathLength={100}
                fill="none"
                stroke={segment.color}
                strokeWidth={activeIndex === index ? STROKE + 5 : STROKE}
                strokeLinecap="butt"
                strokeDasharray={`${segment.dashLength} ${100 - segment.dashLength}`}
                strokeDashoffset={segment.dashOffset}
                className="transition-[stroke-width] duration-200"
              />
            ) : null,
          )}
        </svg>

        <div className="absolute flex h-[120px] w-[120px] flex-col items-center justify-center rounded-full bg-card shadow-sm">
          <span className="text-[42px] font-semibold leading-none text-foreground">
            {total}
          </span>
          <span className="mt-1 text-center text-sm leading-[18px] text-foreground">
            Total issues
          </span>
        </div>

        {activeIndex !== null && segments[activeIndex]?.description && (
          <div className="absolute -right-12 top-0 z-20 w-[220px] rounded-2xl border border-border bg-card p-4 shadow-lg">
            <div className="flex items-start gap-3">
              <div
                className="mt-1 h-3 w-3 rounded-full"
                style={{ backgroundColor: segments[activeIndex].color }}
              />
              <div>
                <p className="text-xs font-semibold text-foreground">
                  {segments[activeIndex].label}
                </p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {segments[activeIndex].description}
                </p>
                <div className="mt-3 flex items-center gap-2 text-primary">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {segments[activeIndex].percentage}% of total issues
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="w-full max-w-[340px] space-y-2">
        {segments.map((item, index) => {
          const issueLabel = item.value === 1 ? "issue" : "issues";
          return (
            <button
              key={item.key}
              type="button"
              aria-label={`${item.label}: ${item.value} ${issueLabel}, ${item.percentage}% of total`}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
              onFocus={() => setActiveIndex(index)}
              onBlur={() => setActiveIndex(null)}
              onClick={() => onSegmentClick?.(item.source)}
              className="flex w-full items-center justify-between rounded-2xl border border-transparent px-4 py-3 text-left transition-colors hover:border-border hover:bg-accent focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
            >
              <span className="flex items-center gap-2">
                <span
                  className="h-4 w-4 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm text-foreground">{item.label}</span>
              </span>
              <span className="text-sm font-semibold text-foreground">
                {item.value} ({item.percentage}%)
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
