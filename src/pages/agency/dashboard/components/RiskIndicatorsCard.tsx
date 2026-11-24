import { TriangleAlert } from "lucide-react";
import { AgencyPanel } from "@/components/agency/AgencyShell";
import { allocateRoundedPercentages } from "@/components/compliance/ComplianceBreakdownChart";
import type { AnalyticsFilters, AnalyticsSummaryData } from "@/lib/api/reports";
import { INDICATORS_HELPER } from "../../analytics/analyticsScope";
import AiInsightsButton from "./AiInsightsButton";
import { CHART, RISK_COLORS } from "./chartColors";

const SIZE = 156;
const STROKE = 22;
const RADIUS = (SIZE - STROKE) / 2;

function Donut({ segments }: { segments: { key: string; color: string; share: number }[] }) {
    let offset = 0;
    return (
        <svg aria-hidden="true" width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="shrink-0 -rotate-90">
            <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke={CHART.track} strokeWidth={STROKE} className="dark:stroke-white/10" />
            {segments.map((segment) => {
                const dash = -offset;
                offset += segment.share;
                return segment.share > 0 ? (
                    <circle key={segment.key} cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" pathLength={100}
                        stroke={segment.color} strokeWidth={STROKE}
                        strokeDasharray={`${segment.share} ${100 - segment.share}`} strokeDashoffset={dash} />
                ) : null;
            })}
        </svg>
    );
}

/** Donut of the selected risk indicators for the period, with counts and shares. */
export default function RiskIndicatorsCard({ summary, isLoading, scope, mode }: {
    summary?: AnalyticsSummaryData;
    isLoading?: boolean;
    scope: AnalyticsFilters;
    mode?: string;
}) {
    const availability = summary?.complianceAvailability.indicators;
    if (!isLoading && availability === "restricted") return null;
    const insights = summary?.complianceInsights;
    const ready = !isLoading && availability === "available" && !!insights && Number.isFinite(insights.total);

    // Unsigned Form 485 is an HHA form; the DDD view leaves it out, as the analytics page does.
    const items = (insights?.breakdown ?? []).filter((item) => mode !== "ddd" || (item.key !== "unsignedForm485" && item.label !== "Unsigned Form 485"));
    const sum = items.reduce((total, item) => total + Math.max(0, Number(item.value) || 0), 0);
    const exact = items.map((item) => (sum > 0 ? (Math.max(0, Number(item.value) || 0) / sum) * 100 : 0));
    const rounded = allocateRoundedPercentages(exact);
    const segments = items.map((item, index) => ({
        key: item.key ?? item.label,
        label: item.label,
        value: item.value,
        color: (item.key && RISK_COLORS[item.key]) || item.color,
        share: exact[index],
        percent: rounded[index],
    }));
    const total = insights?.total ?? sum;

    return (
        <AgencyPanel
            icon={TriangleAlert}
            title="Selected risk indicators"
            busy={isLoading}
            action={ready && <AiInsightsButton section="compliance" scope={scope} limitedCoverage />}
        >
            {isLoading ? (
                <div aria-hidden="true" className="flex animate-pulse items-center gap-8 py-2">
                    <div className="h-[156px] w-[156px] shrink-0 rounded-full bg-[#eef0f2] dark:bg-white/10" />
                    <div className="flex-1 space-y-3">{[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-4 rounded bg-[#eef0f2] dark:bg-white/10" />)}</div>
                </div>
            ) : !ready ? (
                <p role="status" className="py-8 text-center text-[13px] text-[#4b535b] dark:text-[#9aa4a8]">Risk indicators are unavailable for this period.</p>
            ) : (
                <div className="flex flex-col items-center gap-6 py-1 sm:flex-row sm:items-start">
                    <Donut segments={segments} />
                    <div className="w-full min-w-0 flex-1">
                        <p className="text-[22px] font-medium text-[#10141a] dark:text-[#f4f6f7]">
                            {total === 0 ? "No indicator findings" : `${total} indicator finding${total === 1 ? "" : "s"}`}
                        </p>
                        <ul className="mt-3 space-y-2">
                            {segments.map((segment) => (
                                <li key={segment.key} className="flex items-center justify-between gap-3 text-[13px] text-[#2a3138] dark:text-[#c9d1d4]">
                                    <span className="flex min-w-0 items-center gap-2">
                                        <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: segment.color }} />
                                        <span className="truncate">{segment.label}</span>
                                    </span>
                                    <span className="shrink-0 tabular-nums text-[#10141a] dark:text-[#f4f6f7]">{segment.value} ({segment.percent}%)</span>
                                </li>
                            ))}
                        </ul>
                        <p className="mt-4 text-[12px] leading-[18px] text-[#5b636b] dark:text-[#9aa4a8]" title={INDICATORS_HELPER}>
                            Categories use different units and can concern the same person.
                        </p>
                    </div>
                </div>
            )}
        </AgencyPanel>
    );
}
