import { RiskTrendsIcon } from "@/components/agency/AgencyIcons";
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AgencyPanel } from "@/components/agency/AgencyShell";
import type { AnalyticsFilters, RiskTrendPoint } from "@/lib/api/reports";
import AiInsightsButton from "./AiInsightsButton";
import { CHART } from "./chartColors";

const SERIES = [
    { key: "expired", label: "Expired certification", color: CHART.teal, area: true },
    { key: "overtime", label: "Overtime risk", color: CHART.dark, area: false },
    { key: "missing", label: "Missing document", color: CHART.amber, area: false },
    { key: "unsignedForm485", label: "Unsigned Form 485", color: CHART.violet, area: false },
] as const;

const TICK = { fill: "#6b747b", fontSize: 11 };

/** Selected risk indicators over the period: expired certifications as a filled area, the rest as dashed lines. */
export default function RiskTrendsCard({ data, isLoading, scope, mode }: {
    data?: RiskTrendPoint[];
    isLoading?: boolean;
    scope: AnalyticsFilters;
    mode?: string;
}) {
    const series = SERIES.filter((item) =>
        data?.some((row) => typeof row[item.key] === "number") && (item.key !== "unsignedForm485" || mode !== "ddd"));
    const ready = !isLoading && !!data && series.length > 0;

    return (
        <AgencyPanel
            icon={RiskTrendsIcon}
            title="Risk trends"
            busy={isLoading}
            action={ready && <AiInsightsButton section="risk" scope={scope} limitedCoverage />}
        >
            {isLoading ? (
                <div aria-hidden="true" className="h-[230px] animate-pulse rounded-[12px] bg-[#f4f5f6] dark:bg-white/5" />
            ) : !ready ? (
                <p role="status" className="py-8 text-center text-[13px] text-[#4b535b] dark:text-[#9aa4a8]">
                    {data ? "No trend data you can view for this period." : "Risk trends are unavailable for this period."}
                </p>
            ) : (
                <>
                    <div className="h-[190px] w-full" role="img" aria-label={`Risk trends: ${series.map((item) => item.label).join(", ")}`}>
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={data} margin={{ top: 6, right: 6, left: -28, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="risk-trend-fill" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={CHART.teal} stopOpacity={0.22} />
                                        <stop offset="100%" stopColor={CHART.teal} stopOpacity={0.08} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid vertical={false} stroke="#eceef0" />
                                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={TICK} interval="preserveStartEnd" />
                                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={TICK} width={40} />
                                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e4e7ea", fontSize: 12 }} />
                                {series.map((item) => item.area ? (
                                    <Area key={item.key} type="linear" dataKey={item.key} name={item.label} stroke={item.color}
                                        strokeWidth={2} fill="url(#risk-trend-fill)" dot={false} activeDot={{ r: 4 }} />
                                ) : (
                                    <Line key={item.key} type="linear" dataKey={item.key} name={item.label} stroke={item.color}
                                        strokeWidth={2} strokeDasharray="6 4" dot={false} activeDot={{ r: 4 }} />
                                ))}
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                    <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
                        {series.map((item) => (
                            <li key={item.key} className="flex items-center gap-2 text-[12px] text-[#2a3138] dark:text-[#c9d1d4]">
                                <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                                {item.label}
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </AgencyPanel>
    );
}
