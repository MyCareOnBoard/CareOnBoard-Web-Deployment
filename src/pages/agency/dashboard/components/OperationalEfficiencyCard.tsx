import { useId } from "react";
import { Link } from "react-router";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { AgencyPanel, AgencyTrendBadge } from "@/components/agency/AgencyShell";
import { EfficiencyIcon } from "@/components/agency/AgencyIcons";
import type { AnalyticsFilters, AnalyticsSummaryData, SparklinePoint } from "@/lib/api/reports";
import { Routes } from "@/routes/constants";
import AiInsightsButton from "./AiInsightsButton";
import { CHART } from "./chartColors";

const BAD = "#e5484d";

function Sparkline({ data, color }: { data: SparklinePoint[]; color: string }) {
    const id = useId().replace(/:/g, "");
    return (
        <div aria-hidden="true" className="h-[44px] w-[112px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 2, right: 2, bottom: 0, left: 2 }}>
                    <defs>
                        <linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={color} stopOpacity={0.28} />
                            <stop offset="100%" stopColor={color} stopOpacity={0.06} />
                        </linearGradient>
                    </defs>
                    <Area type="linear" dataKey="value" stroke={color} strokeWidth={1.75} fill={`url(#spark-${id})`} dot={false} isAnimationActive={false} />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}

/** Shift completion, on-time starts and manual interventions, each with its trend and sparkline. */
export default function OperationalEfficiencyCard({ data, isLoading, scope }: {
    data?: AnalyticsSummaryData["operationalEfficiency"];
    isLoading?: boolean;
    scope: AnalyticsFilters;
}) {
    const metrics = data ? [
        { id: "completion", label: "Shift completion rate", metric: data.completionRate, goodWhen: "up" as const },
        { id: "ontime", label: "On-time start rate", metric: data.onTimeRate, goodWhen: "up" as const },
        { id: "manual", label: "Manual interventions", metric: data.manualRate, goodWhen: "down" as const },
    ] : [];

    return (
        <AgencyPanel
            icon={EfficiencyIcon}
            title="Operational efficiency"
            busy={isLoading}
            bodyClassName="px-2 py-2"
            action={!isLoading && data && <AiInsightsButton section="efficiency" scope={scope} />}
        >
            {isLoading ? (
                <div aria-hidden="true" className="space-y-3 p-3">
                    {[0, 1, 2].map((i) => <div key={i} className="h-14 animate-pulse rounded-[10px] bg-[#f4f5f6] dark:bg-white/5" />)}
                </div>
            ) : !data ? (
                <p role="status" className="py-8 text-center text-[13px] text-[#4b535b] dark:text-[#9aa4a8]">Operational metrics are unavailable for this period.</p>
            ) : (
                <ul>
                    {metrics.map(({ id, label, metric, goodWhen }) => {
                        const bad = Number.isFinite(metric.trend) && metric.trend !== 0 && (metric.trend > 0) !== (goodWhen === "up");
                        return (
                            <li key={id}>
                                <Link to={Routes.agency.shifts}
                                    className="flex items-center justify-between gap-3 rounded-[10px] px-3 py-2.5 transition-colors hover:bg-[#f4f6f7] focus-visible:outline-2 focus-visible:outline-[#007679] dark:hover:bg-white/5">
                                    <span className="min-w-0">
                                        <span className="block text-[13px] text-[#4b535b] dark:text-[#9aa4a8]">{label}</span>
                                        <span className="mt-1.5 flex flex-wrap items-center gap-2.5">
                                            <span className="text-[24px] font-medium leading-none text-[#10141a] dark:text-[#f4f6f7]">{metric.value}</span>
                                            <AgencyTrendBadge value={metric.trend} goodWhen={goodWhen} />
                                        </span>
                                    </span>
                                    <Sparkline data={metric.sparkline ?? []} color={bad ? BAD : CHART.teal} />
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            )}
        </AgencyPanel>
    );
}
