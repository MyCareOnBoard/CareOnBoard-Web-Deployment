import { Link } from "react-router";
import { AgencyPanel } from "@/components/agency/AgencyShell";
import { BillingIcon } from "@/components/agency/AgencyIcons";
import { allocateRoundedPercentages } from "@/components/compliance/ComplianceBreakdownChart";
import type { AnalyticsFilters, AnalyticsSummaryData } from "@/lib/api/reports";
import { Routes } from "@/routes/constants";
import AiInsightsButton from "./AiInsightsButton";
import { BILLING_COLORS, CHART } from "./chartColors";

const count = new Intl.NumberFormat("en-US");

/** Billable shifts for the period as one stacked bar: billed, pending and not billable. */
export default function BillingSummaryCard({ data, isLoading, scope }: {
    data?: AnalyticsSummaryData["billingSummary"];
    isLoading?: boolean;
    scope: AnalyticsFilters;
}) {
    const items = data?.breakdown ?? [];
    const sum = items.reduce((total, item) => total + Math.max(0, item.value), 0);
    const exact = items.map((item) => (sum > 0 ? (Math.max(0, item.value) / sum) * 100 : 0));
    const rounded = allocateRoundedPercentages(exact);
    const segments = items.map((item, index) => ({
        ...item,
        color: BILLING_COLORS[index] ?? CHART.grey,
        share: exact[index],
        percent: rounded[index],
    }));
    const total = data?.total ?? sum;

    return (
        <AgencyPanel
            icon={BillingIcon}
            title="Billing summary"
            busy={isLoading}
            action={!isLoading && data && <AiInsightsButton section="billing" scope={scope} />}
        >
            {isLoading ? (
                <div aria-hidden="true" className="animate-pulse space-y-4 py-2">
                    <div className="h-8 w-48 rounded bg-[#eef0f2] dark:bg-white/10" />
                    <div className="h-3 rounded-full bg-[#eef0f2] dark:bg-white/10" />
                    {[0, 1, 2].map((i) => <div key={i} className="h-4 rounded bg-[#eef0f2] dark:bg-white/10" />)}
                </div>
            ) : !data ? (
                <p role="status" className="py-8 text-center text-[13px] text-[#4b535b] dark:text-[#9aa4a8]">Billing is unavailable for this period.</p>
            ) : (
                <div className="py-1">
                    <p className="flex items-baseline gap-2.5 text-[#10141a] dark:text-[#f4f6f7]">
                        <span className="text-[32px] font-medium leading-none">{count.format(total)}</span>
                        <span className="text-[14px] text-[#4b535b] dark:text-[#9aa4a8]">billable shift{total === 1 ? "" : "s"} this period</span>
                    </p>
                    <div aria-hidden="true" className="mt-5 flex h-3 w-full gap-[3px] overflow-hidden rounded-full bg-[#eef1f3] dark:bg-white/10">
                        {segments.map((segment) => segment.share > 0 && (
                            <span key={segment.label} className="h-full first:rounded-l-full last:rounded-r-full" style={{ width: `${segment.share}%`, backgroundColor: segment.color }} />
                        ))}
                    </div>
                    <ul className="mt-4 space-y-0.5">
                        {segments.map((segment) => (
                            <li key={segment.label}>
                                <Link to={Routes.agency.billing.financialOverview}
                                    className="-mx-2 flex items-center justify-between gap-3 rounded-[8px] px-2 py-1.5 text-[13px] text-[#2a3138] transition-colors hover:bg-[#f4f6f7] focus-visible:outline-2 focus-visible:outline-[#007679] dark:text-[#c9d1d4] dark:hover:bg-white/5">
                                    <span className="flex items-center gap-2">
                                        <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ backgroundColor: segment.color }} />
                                        {segment.label}
                                    </span>
                                    <span className="tabular-nums text-[#10141a] dark:text-[#f4f6f7]">{count.format(segment.value)} ({segment.percent}%)</span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </AgencyPanel>
    );
}
