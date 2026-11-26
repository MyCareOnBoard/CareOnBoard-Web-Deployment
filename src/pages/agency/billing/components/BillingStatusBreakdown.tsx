import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { DonutSegment } from "../shared/types";

type BillingStatusBreakdownProps = {
  segments: DonutSegment[];
  total: number;
  /** "bar": one stacked bar over the legend. "ring": a donut beside the legend. */
  variant?: "bar" | "ring";
  label: string;
  loading?: boolean;
  emptyMessage?: string;
  footnote?: ReactNode;
  /** Makes each legend row a button (e.g. to filter the table below). */
  onSegmentClick?: (segment: DonutSegment) => void;
};

const RING_SIZE = 140;
const RING_STROKE = 18;

function Ring({ segments, total, label }: { segments: DonutSegment[]; total: number; label: string }) {
  const radius = (RING_SIZE - RING_STROKE) / 2;
  const circumference = 2 * Math.PI * radius;
  const visible = segments.filter((segment) => segment.value > 0);
  // A small gap between arcs, as in the design; none when one status fills the ring.
  const gap = visible.length > 1 ? 3 : 0;
  let offset = 0;
  return (
    <svg role="img" aria-label={label} width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`} className="shrink-0 -rotate-90">
      <circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={radius} fill="none" strokeWidth={RING_STROKE} className="stroke-[#eef0f2] dark:stroke-white/10" />
      {visible.map((segment) => {
        const length = (segment.value / total) * circumference;
        const dash = Math.max(length - gap, 0.5);
        const circle = (
          <circle
            key={segment.label}
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={radius}
            fill="none"
            stroke={segment.color}
            strokeWidth={RING_STROKE}
            strokeDasharray={`${dash} ${circumference - dash}`}
            strokeDashoffset={-offset}
          />
        );
        offset += length;
        return circle;
      })}
    </svg>
  );
}

function Legend({ segments, onSegmentClick }: Pick<BillingStatusBreakdownProps, "segments" | "onSegmentClick">) {
  return (
    <ul className="min-w-0 flex-1 space-y-2.5">
      {segments.map((segment) => {
        const content = (
          <>
            <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: segment.color }} />
            <span className="min-w-0 flex-1 truncate text-left text-[#2a3138] dark:text-[#c9d1d4]">{segment.label}</span>
            <span className="shrink-0 font-semibold tabular-nums text-[#10141a] dark:text-[#f4f6f7]">{segment.value.toLocaleString()}</span>
          </>
        );
        return (
          <li key={segment.label}>
            {onSegmentClick ? (
              <button
                type="button"
                onClick={() => onSegmentClick(segment)}
                className="-mx-1.5 flex w-[calc(100%+12px)] cursor-pointer items-center gap-2 rounded-[6px] px-1.5 py-0.5 text-[13px] transition-colors hover:bg-[#f4f6f7] focus-visible:outline-2 focus-visible:outline-[#007679] dark:hover:bg-white/5"
              >
                {content}
              </button>
            ) : (
              <div className="flex items-center gap-2 py-0.5 text-[13px]">{content}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Status mix of a billing page: a stacked bar or a ring, a legend with counts and a footnote. */
export default function BillingStatusBreakdown({
  segments,
  total,
  variant = "bar",
  label,
  loading = false,
  emptyMessage = "Nothing in this period yet.",
  footnote,
  onSegmentClick,
}: BillingStatusBreakdownProps) {
  if (loading) {
    return (
      <div aria-hidden="true" className={cn("flex animate-pulse gap-5", variant === "bar" ? "flex-col" : "items-center")}>
        {variant === "bar"
          ? <div className="h-3 w-full rounded-full bg-[#eef0f2] dark:bg-white/10" />
          : <div className="h-[140px] w-[140px] shrink-0 rounded-full border-[18px] border-[#eef0f2] dark:border-white/10" />}
        <div className="flex-1 space-y-3">
          {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-3.5 w-full rounded bg-[#eef0f2] dark:bg-white/10" />)}
        </div>
      </div>
    );
  }

  if (total <= 0) {
    return <p className="py-10 text-center text-[14px] text-[#6b737a] dark:text-[#9aa4a8]">{emptyMessage}</p>;
  }

  const visible = segments.filter((segment) => segment.value > 0);
  const summary = segments.map((segment) => `${segment.label} ${segment.value}`).join(", ");

  return (
    <div className={cn("flex gap-5", variant === "bar" ? "flex-col" : "flex-col sm:flex-row sm:items-start")}>
      {variant === "bar" ? (
        <div role="img" aria-label={`${label}: ${summary}`} className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full bg-[#eef0f2] dark:bg-white/10">
          {visible.map((segment) => (
            <span key={segment.label} className="h-full first:rounded-l-full last:rounded-r-full" style={{ width: `${(segment.value / total) * 100}%`, backgroundColor: segment.color }} />
          ))}
        </div>
      ) : (
        <Ring segments={segments} total={total} label={`${label}: ${summary}`} />
      )}
      <div className="min-w-0 flex-1">
        <Legend segments={segments} onSegmentClick={onSegmentClick} />
        {footnote ? <p className="mt-3 text-[12px] text-[#6b737a] dark:text-[#9aa4a8]">{footnote}</p> : null}
      </div>
    </div>
  );
}
