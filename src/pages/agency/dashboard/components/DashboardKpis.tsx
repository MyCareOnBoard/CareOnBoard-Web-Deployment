import { CircleDollarSign, ShieldCheck, TriangleAlert } from "lucide-react";
import { BillingIcon } from "@/components/agency/AgencyIcons";
import type { ComponentType, ReactNode } from "react";
import { AgencyProgressBar, AgencyStatCard, AgencyTrendBadge } from "@/components/agency/AgencyShell";
import type { AnalyticsSummaryData } from "@/lib/api/reports";
import { cn } from "@/lib/utils";
import { FLAGS_HELPER, RATE_HELPER, rateState } from "../../analytics/analyticsScope";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const count = new Intl.NumberFormat("en-US");

type Kpi = {
    key: string;
    icon: ComponentType<{ className?: string }>;
    label: string;
    value: ReactNode;
    extra?: ReactNode;
    bar?: { value: number; label: string };
    footnote: ReactNode;
    /** The full caveat, as a tooltip on the footnote. */
    caveat?: string;
};

function KpiSkeleton() {
    return (
        <div data-testid="dashboard-kpi-skeleton" className="animate-pulse rounded-[16px] border border-[#e4e7ea] bg-white p-2 dark:border-white/10 dark:bg-[#1b232b]">
            <div className="space-y-3 rounded-[12px] bg-[#f4f5f6] px-4 pb-4 pt-3.5 dark:bg-white/5">
                <div className="h-7 w-40 rounded bg-[#e6e9eb] dark:bg-white/10" />
                <div className="h-8 w-24 rounded bg-[#e6e9eb] dark:bg-white/10" />
            </div>
            <div className="mx-2 mb-1 mt-3 h-3 w-44 rounded bg-[#eef0f2] dark:bg-white/10" />
        </div>
    );
}

/** The four headline tiles: compliance rate, flags, revenue and shifts billed for the period. */
export default function DashboardKpis({ summary, isLoading }: { summary?: AnalyticsSummaryData; isLoading: boolean }) {
    if (isLoading) {
        return (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[0, 1, 2, 3].map((i) => <KpiSkeleton key={i} />)}
            </div>
        );
    }

    const overview = summary?.overview;
    const availability = summary?.complianceAvailability;
    const kpis: Kpi[] = [];

    const rate = summary ? rateState(summary) : "unavailable";
    if (rate !== "restricted") {
        const value = overview?.complianceRate?.value;
        kpis.push({
            key: "rate",
            icon: ShieldCheck,
            label: "No expiry or signature flags",
            value: rate === "available" ? `${value}%` : "—",
            extra: rate === "available" ? <AgencyTrendBadge value={overview?.complianceRate?.trend} /> : null,
            bar: rate === "available" && typeof value === "number" ? { value, label: "Records without expiry or signature flags" } : undefined,
            footnote: rate === "empty" ? "No records to assess yet." : rate === "available" ? "Expired staff documents and unsigned HHA Form 485s only." : "Unavailable for this period.",
            caveat: RATE_HELPER,
        });
    }

    if (availability?.flags !== "restricted") {
        const flags = overview?.totalIssues;
        const ok = availability?.flags === "available" && Number.isFinite(flags?.value);
        kpis.push({
            key: "flags",
            icon: TriangleAlert,
            label: "Document and incident flags",
            value: ok ? count.format(flags!.value) : "—",
            extra: ok ? <AgencyTrendBadge value={flags?.trend} goodWhen="down" /> : null,
            footnote: ok ? "Expired documents, incidents and unsigned forms." : "Unavailable for this period.",
            caveat: FLAGS_HELPER,
        });
    }

    const revenue = overview?.revenue;
    const billed = overview?.shiftsBilled;
    kpis.push({
        key: "revenue",
        icon: CircleDollarSign,
        label: "Revenue generated",
        value: revenue ? money.format(revenue.value) : "—",
        extra: revenue ? <AgencyTrendBadge value={revenue.trend} suffix="" /> : null,
        footnote: billed ? `From ${count.format(billed.value)} billed shift${billed.value === 1 ? "" : "s"} this period.` : "Unavailable for this period.",
    });

    const billable = summary?.billingSummary?.total;
    const share = billed && billable ? Math.round((billed.value / billable) * 100) : undefined;
    kpis.push({
        key: "billed",
        icon: BillingIcon,
        label: "Shifts billed",
        value: billed ? count.format(billed.value) : "—",
        bar: share !== undefined ? { value: share, label: "Billable shifts billed" } : undefined,
        footnote: !billed ? "Unavailable for this period."
            : billable ? `Of ${count.format(billable)} billable shift${billable === 1 ? "" : "s"} (${share}%).`
                : "No billable shifts this period.",
    });

    return (
        <div className={cn("grid gap-4 sm:grid-cols-2", kpis.length === 4 ? "xl:grid-cols-4" : kpis.length === 3 ? "xl:grid-cols-3" : "")}>
            {kpis.map((kpi) => (
                <AgencyStatCard
                    key={kpi.key}
                    icon={kpi.icon}
                    label={kpi.label}
                    value={kpi.value}
                    extra={kpi.extra}
                    footnote={<span title={kpi.caveat}>{kpi.footnote}</span>}
                >
                    {kpi.bar && <AgencyProgressBar value={kpi.bar.value} label={kpi.bar.label} />}
                </AgencyStatCard>
            ))}
        </div>
    );
}
