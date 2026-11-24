import { useState } from "react";
import { ChevronDown, Download, House, Link2, RefreshCw, Share2, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { useAssignmentReviewScope } from "@/hooks/useAssignmentReview";
import { useEffectiveAgencyMode } from "@/hooks/useEffectiveAgencyMode";
import { AgencyPageHeader, agencyProgramName } from "@/components/agency/AgencyShell";
import { ClientsIcon, WorkforceIcon } from "@/components/agency/AgencyIcons";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useGetAnalyticsSummaryQuery } from "@/lib/api/reports";
import { staffLabels } from "@/lib/roleLabel";
import { Routes } from "@/routes/constants";
import { useAuth } from "@/utils/auth";
import { useGetDocumentComplianceQuery } from "@/pages/agency/compliance-alerts/api";
import { getComplianceSources } from "@/pages/agency/compliance-alerts/workspaceScope";
import { useGetClientStatsQuery, useGetDSPStatsQuery } from "@/pages/agency/dashboard/api";
import { matchesReportScope, printParams } from "../analytics/analyticsScope";
import AnalyticsDateRangeModal from "../analytics/components/AnalyticsDateRangeModal";
import ShareReportModal from "../analytics/components/ShareReportModal";
import DocumentationPatternsCard from "./DocumentationPatternsCard";
import BillingSummaryCard from "./components/BillingSummaryCard";
import DashboardKpis from "./components/DashboardKpis";
import NeedsAttentionCard from "./components/NeedsAttentionCard";
import OperationalEfficiencyCard from "./components/OperationalEfficiencyCard";
import PeopleSummaryCard from "./components/PeopleSummaryCard";
import RiskIndicatorsCard from "./components/RiskIndicatorsCard";
import RiskTrendsCard from "./components/RiskTrendsCard";

const EXPIRING_PAGE = 25;

/** Field-staff names per program, singular and plural. */
const STAFF_NOUNS = { ddd: ["DSP", "DSPs"], hha: ["caregiver", "caregivers"], sc: ["coordinator", "coordinators"] } as const;

/** "23 Oct – 22 Nov 2026" from two YYYY-MM-DD dates (local calendar days). */
function formatPeriod(start?: string, end?: string) {
    const parse = (value?: string) => {
        const match = value && /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
        return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : undefined;
    };
    const from = parse(start), to = parse(end);
    if (!from || !to) return undefined;
    const day = (date: Date, withYear: boolean) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", ...(withYear ? { year: "numeric" } : {}) }).format(date);
    return `${day(from, from.getFullYear() !== to.getFullYear())} – ${day(to, true)}`;
}

const outlineButton = "inline-flex h-10 cursor-pointer items-center gap-2 rounded-[10px] border border-[#dcdfe2] bg-white px-3.5 text-[14px] font-semibold text-[#10141a] transition-colors hover:bg-[#f4f6f7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007679] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/15 dark:bg-transparent dark:text-[#f4f6f7] dark:hover:bg-white/5";
const menuItem = "cursor-pointer gap-2.5 rounded-[8px] px-3 py-2 text-[14px] text-[#10141a] focus:bg-[#f2f7f7] dark:text-[#f4f6f7] dark:focus:bg-white/5";

export default function AgencyDashboardPage() {
    const { user } = useAuth();
    const agencyId = user?.agencyId || user?.agency?.id || "";
    // Everything is scoped to the active DDD/HHA/SC view, matching the compliance-alerts page.
    const mode = useEffectiveAgencyMode();
    const labels = staffLabels(mode ? [mode] : user?.agency?.supportedClientTypes);
    const [nounSingular, nounPlural] = mode ? STAFF_NOUNS[mode] : [labels.noun, labels.nounPlural];
    const accessList = user?.profile?.accessList ?? [];
    const can = (key: string) => user?.userType === "agency" || accessList.includes(key);

    const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
    const [showDateModal, setShowDateModal] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);

    const { data: dspStats, isLoading: loadingDsp } = useGetDSPStatsQuery(
        { agencyId, type: mode ?? undefined }, { skip: !agencyId });
    const { data: clientStats, isLoading: loadingClients } = useGetClientStatsQuery(
        { agencyId, type: mode ?? undefined }, { skip: !agencyId });

    const scopeKey = JSON.stringify([useAssignmentReviewScope(), agencyId, user?.agency?.status, mode]);
    const {
        currentData: analytics, isLoading: loadingAnalytics, isFetching: fetchingAnalytics, isError: analyticsError, refetch,
    } = useGetAnalyticsSummaryQuery(
        { startDate: dateRange.startDate || undefined, endDate: dateRange.endDate || undefined, mode: mode ?? undefined, scopeKey },
        { refetchOnMountOrArgChange: true },
    );
    const summary = !analyticsError && analytics?.success && matchesReportScope(analytics.data.reportScope, {
        mode: mode ?? undefined, startDate: dateRange.startDate || undefined, endDate: dateRange.endDate || undefined,
    }) ? analytics.data : undefined;
    const analyticsLoading = loadingAnalytics || fetchingAnalytics;
    const reportQuery = printParams(summary?.reportScope);
    const reportDisabled = analyticsLoading || !summary || !reportQuery;
    // Panels re-mount on a new scope so their AI insights popovers never show another period's answer.
    const panelKey = JSON.stringify([scopeKey, dateRange, summary?.reportScope.checkedAt]);
    const insightsScope = {
        startDate: summary?.reportScope.startDate, endDate: summary?.reportScope.endDate, mode: mode ?? undefined, scopeKey,
    };

    // Workforce note: staff with documents coming up for expiry (one page; "25+" beyond that).
    const watchesExpiry = getComplianceSources(user, mode).includes("document_expiry");
    const { currentData: expiring, isError: expiringError } = useGetDocumentComplianceQuery(
        { scopeKey, viewerId: user?.uid || "", agencyId, mode: mode ?? undefined, condition: "expiring", limit: EXPIRING_PAGE },
        { skip: !agencyId || !user?.uid || !watchesExpiry },
    );
    const expiringStaff = expiring && !expiringError && expiring.monitoringState === "active"
        ? new Set(expiring.items.map((item) => item.employeeId)).size : undefined;
    const expiringMore = !!expiring?.nextCursor;
    const workforceNote = expiringStaff === undefined
        ? `${labels.nounPlural} employed by the agency in this program.`
        : expiringStaff === 0
            ? "No staff documents are expiring soon."
            : `${expiringStaff}${expiringMore ? "+" : ""} ${expiringStaff === 1 && !expiringMore ? nounSingular : nounPlural} ${expiringStaff === 1 && !expiringMore ? "has" : "have"} documents expiring soon.`;

    const clients = clientStats?.stats;
    const clientsNote = clients
        ? clients.total === 0 ? "No clients registered for this program yet." : `${clients.active} of ${clients.total} client${clients.total === 1 ? " is" : "s are"} active in this program.`
        : undefined;

    const period = formatPeriod(summary?.reportScope.startDate ?? dateRange.startDate, summary?.reportScope.endDate ?? dateRange.endDate);
    const agencyName = user?.agency?.name || user?.profile?.name;
    const description = [agencyName, agencyProgramName(mode), "what needs attention today."].filter(Boolean).join(" · ");

    const copy = async (url: string, message: string) => {
        try {
            await navigator.clipboard.writeText(url);
            toast.success(message);
        } catch {
            toast.error("Could not copy the link. Copy it from the address bar instead.");
        }
    };
    const copySignupLink = () => copy(
        `${window.location.origin}${Routes.auth.signup}?agencyId=${encodeURIComponent(agencyId)}${mode === "sc" ? "&applicantType=support_coordinator" : ""}`,
        "Sign-up link copied",
    );
    const copyMobileAppLink = () => copy(`${window.location.origin}/app/${encodeURIComponent(agencyId)}`, "Mobile app link copied");
    const downloadReport = () => {
        if (!reportDisabled && reportQuery) window.open(`${Routes.agency.analyticsPrint}?${reportQuery}`, "_blank", "noopener,noreferrer");
    };

    return (
        <div className="pb-4">
            <AgencyPageHeader
                icon={House}
                title="Dashboard"
                description={description}
                actions={<>
                    <button type="button" onClick={() => setShowDateModal(true)} className={outlineButton} aria-label={period ? `Reporting period ${period}. Change period` : "Choose reporting period"}>
                        <span className="text-[#4b535b] dark:text-[#9aa4a8]">Period:</span>
                        <span>{period ?? "Last 30 days"}</span>
                        <ChevronDown aria-hidden="true" className="h-4 w-4 text-[#4b535b] dark:text-[#9aa4a8]" />
                    </button>
                    <button type="button" onClick={copySignupLink} className={outlineButton}>
                        <Link2 aria-hidden="true" className="h-4 w-4" />
                        Copy {nounSingular} sign-up link
                    </button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button type="button" className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-[10px] bg-[#003839] px-4 text-[14px] font-semibold text-white transition-colors hover:bg-[#0b4c4d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007679] dark:bg-[#0f7e7d] dark:hover:bg-[#13908f]">
                                Take action
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" sideOffset={8} className="z-[70] w-[240px] rounded-[12px] border-[#e4e7ea] bg-white p-1.5 dark:border-white/10 dark:bg-[#1b232b]">
                            <DropdownMenuItem className={menuItem} disabled={reportDisabled} onSelect={downloadReport}>
                                <Download aria-hidden="true" className="h-4 w-4 text-[#007679] dark:text-[#7fd3d3]" />Download report
                            </DropdownMenuItem>
                            <DropdownMenuItem className={menuItem} disabled={reportDisabled} onSelect={() => setShowShareModal(true)}>
                                <Share2 aria-hidden="true" className="h-4 w-4 text-[#007679] dark:text-[#7fd3d3]" />Share report
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="my-1 bg-[#eceef0] dark:bg-white/10" />
                            <DropdownMenuItem className={menuItem} onSelect={copyMobileAppLink}>
                                <Smartphone aria-hidden="true" className="h-4 w-4 text-[#007679] dark:text-[#7fd3d3]" />Copy mobile app link
                            </DropdownMenuItem>
                            <DropdownMenuItem className={menuItem} onSelect={() => void refetch()}>
                                <RefreshCw aria-hidden="true" className="h-4 w-4 text-[#007679] dark:text-[#7fd3d3]" />Refresh figures
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </>}
            />

            {analyticsError && (
                <div role="alert" className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-[#f5c2c0] bg-[#fdf2f1] px-4 py-3 text-[14px] text-[#8a1c14] dark:border-[#ff6b5e]/30 dark:bg-[#ff6b5e]/10 dark:text-[#ffb4ad]">
                    <span>This period's report could not be loaded. Your dates have been kept.</span>
                    <button type="button" onClick={() => void refetch()} className="inline-flex cursor-pointer items-center gap-1.5 font-semibold underline underline-offset-4">
                        <RefreshCw aria-hidden="true" className="h-4 w-4" />Try again
                    </button>
                </div>
            )}

            <div className="mt-6 space-y-5">
                <DashboardKpis summary={summary} isLoading={analyticsLoading} />

                <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
                    <PeopleSummaryCard
                        icon={WorkforceIcon}
                        title="Workforce"
                        link={can("DSP Management") ? { label: `Open ${labels.title} management`, to: Routes.agency.dspManagement } : undefined}
                        labels={[`Active ${nounPlural}`, "Inactive", "Total"]}
                        stats={dspStats?.stats}
                        isLoading={loadingDsp}
                        note={!loadingDsp && workforceNote}
                    />
                    <PeopleSummaryCard
                        icon={ClientsIcon}
                        title="Clients"
                        link={can("Client Management") ? { label: "Open client management", to: Routes.agency.clients } : undefined}
                        labels={["Active clients", "Inactive", "Total"]}
                        stats={clients}
                        isLoading={loadingClients}
                        note={clientsNote}
                    />
                    <NeedsAttentionCard summary={summary} mode={mode} agencyId={agencyId} scopeKey={scopeKey} isLoading={analyticsLoading} />
                </div>

                <div className="grid gap-5 xl:grid-cols-2">
                    <RiskIndicatorsCard key={`${panelKey}:indicators`} summary={summary} isLoading={analyticsLoading} scope={insightsScope} mode={mode ?? undefined} />
                    <RiskTrendsCard key={`${panelKey}:trends`} data={summary?.riskTrends} isLoading={analyticsLoading} scope={insightsScope} mode={mode ?? undefined} />
                </div>

                <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
                    {mode !== "sc" && (
                        <OperationalEfficiencyCard key={`${panelKey}:efficiency`} data={summary?.operationalEfficiency} isLoading={analyticsLoading} scope={insightsScope} />
                    )}
                    <BillingSummaryCard key={`${panelKey}:billing`} data={summary?.billingSummary} isLoading={analyticsLoading} scope={insightsScope} />
                    <DocumentationPatternsCard agencyId={agencyId} mode={mode} staffNoun={nounSingular} />
                </div>
            </div>

            <AnalyticsDateRangeModal
                open={showDateModal}
                onClose={() => setShowDateModal(false)}
                values={dateRange}
                onChange={setDateRange}
                onApply={setDateRange}
            />
            <ShareReportModal open={showShareModal} onClose={() => setShowShareModal(false)} />
        </div>
    );
}
