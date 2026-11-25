import type { ComponentType } from "react";
import { Link } from "react-router";
import {
    ChevronRight, ClipboardCheck, Clock, FileSignature, GraduationCap, MapPin, NotebookPen, ShieldCheck,
} from "lucide-react";
import { AgencyPanel } from "@/components/agency/AgencyShell";
import { ClientsIcon, FlagIcon } from "@/components/agency/AgencyIcons";
import type { AnalyticsSummaryData } from "@/lib/api/reports";
import { Routes } from "@/routes/constants";
import { useAuth } from "@/utils/auth";
import { useGetExpiredDocumentsQuery, useGetShiftNoteComplianceQuery } from "@/pages/agency/compliance-alerts/api";
import {
    complianceHref, getComplianceSources, sourceLabels, sourceSection, type Source,
} from "@/pages/agency/compliance-alerts/workspaceScope";

const SHIFT_NOTE_PAGE = 50;

const ICONS: Partial<Record<Source, ComponentType<{ className?: string }>>> = {
    document_expiry: ShieldCheck,
    training: GraduationCap,
    client_documents: ClientsIcon,
    manual_audits: ClipboardCheck,
    unsigned_form485: FileSignature,
    shift_notes: NotebookPen,
    community_inclusion: MapPin,
};

type Row = { key: string; label: string; to: string; icon: ComponentType<{ className?: string }>; count?: number; more?: boolean };

/**
 * The compliance areas the viewer can review, each linking to its list in Compliance alerts, plus
 * overtime. Counts are shown only where they are known exactly (or as "50+" for a full page), so an
 * area without a count is a link, never a misleading zero.
 */
export default function NeedsAttentionCard({ summary, mode, agencyId, scopeKey, isLoading, showPatterns = false }: {
    summary?: AnalyticsSummaryData;
    mode: "ddd" | "hha" | "sc" | null;
    agencyId: string;
    scopeKey: string;
    isLoading?: boolean;
    /** List the documentation patterns link too (Analytics, which has no patterns panel). */
    showPatterns?: boolean;
}) {
    const { user } = useAuth();
    const viewerId = user?.uid || "";
    // Compliance patterns have their own panel on the dashboard.
    const sources = summary
        ? getComplianceSources(user, mode).filter((source) => (showPatterns || source !== "documentation_patterns") && summary.currentRecordSources?.includes(source))
        : [];
    const programMode = mode === "ddd" || mode === "hha" ? mode : undefined;

    const expired = useGetExpiredDocumentsQuery(
        { agencyId, mode: mode ?? undefined },
        { skip: !agencyId || !sources.includes("document_expiry") },
    );
    const notes = useGetShiftNoteComplianceQuery(
        { scopeKey, viewerId, agencyId, mode: mode ?? undefined, stateGroup: "submitted", limit: SHIFT_NOTE_PAGE },
        { skip: !agencyId || !viewerId || !sources.includes("shift_notes") },
    );

    const overtimeFindings = summary?.complianceInsights?.breakdown.find((item) => item.key === "overtimeRisk");
    const showOvertime = !!overtimeFindings
        && !!summary?.riskTrends.some((row) => typeof row.overtime === "number")
        && (user?.userType === "agency" || !!user?.profile?.accessList?.some((key) => ["Scheduling", "Shift Management"].includes(key)));

    const rows: Row[] = sources.map((source) => {
        const row: Row = {
            key: source,
            label: source === "shift_notes" ? "Shift notes awaiting review" : sourceLabels[source],
            icon: ICONS[source] ?? FlagIcon,
            to: complianceHref({
                section: sourceSection[source],
                source,
                ...(programMode ? { mode: programMode } : {}),
                ...(source === "document_expiry" ? { condition: "expired" } : {}),
                ...(source === "shift_notes" ? { stateGroup: "submitted" } : {}),
            }),
        };
        if (source === "document_expiry" && expired.currentData && !expired.isError) {
            row.count = expired.currentData.count ?? expired.currentData.data.length;
        }
        if (source === "shift_notes" && notes.currentData && !notes.isError) {
            row.count = notes.currentData.items.length;
            row.more = !!notes.currentData.nextCursor;
        }
        return row;
    });
    if (showOvertime) {
        rows.push({ key: "overtime", label: "Overtime: shifts over 40 h", icon: Clock, to: Routes.agency.shifts, count: overtimeFindings!.value });
    }

    const open = rows.reduce((sum, row) => sum + (row.count ?? 0), 0);
    const openMore = rows.some((row) => row.more);

    return (
        <AgencyPanel
            icon={FlagIcon}
            title="Needs attention"
            busy={isLoading}
            // Red border so the card stands out on both the dashboard and Analytics.
            className="border-[#f0a19c] dark:border-[#ff6b5e]/50"
            bodyClassName="px-2 py-2"
            action={open > 0 && (
                <span className="inline-flex h-6 items-center gap-1.5 rounded-[6px] bg-[#fcf5dc] px-2 text-[12px] font-medium text-[#7a5800] dark:bg-[#e0b400]/15 dark:text-[#f0cf6b]">
                    <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#e0b400]" />
                    {open}{openMore ? "+" : ""} open
                </span>
            )}
        >
            {isLoading ? (
                <ul aria-hidden="true" className="space-y-1">
                    {[0, 1, 2, 3, 4].map((i) => <li key={i} className="mx-3 my-3 h-5 animate-pulse rounded bg-[#eef0f2] dark:bg-white/10" />)}
                </ul>
            ) : rows.length === 0 ? (
                <p className="px-3 py-6 text-center text-[13px] text-[#4b535b] dark:text-[#9aa4a8]">Nothing to review for this program right now.</p>
            ) : (
                <ul>
                    {rows.map(({ key, label, to, icon: Icon, count, more }) => (
                        <li key={key}>
                            <Link to={to}
                                aria-label={count !== undefined ? `${label}: ${count}${more ? " or more" : ""}` : label}
                                className="flex h-[39px] items-center gap-3 rounded-[10px] px-3 text-[14px] text-[#10141a] transition-colors hover:bg-[#f4f6f7] focus-visible:outline-2 focus-visible:outline-[#007679] dark:text-[#f4f6f7] dark:hover:bg-white/5">
                                <Icon aria-hidden="true" className="h-[18px] w-[18px] shrink-0 text-[#007679] dark:text-[#7fd3d3]" />
                                <span className="min-w-0 flex-1 truncate">{label}</span>
                                {count !== undefined && (
                                    <span aria-hidden="true" className="grid h-5 min-w-5 place-items-center rounded-full bg-[#eef0f2] px-1.5 text-[11px] font-semibold text-[#2a3138] tabular-nums dark:bg-white/10 dark:text-[#c9d1d4]">
                                        {count}{more ? "+" : ""}
                                    </span>
                                )}
                                <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-[#4b535b] dark:text-[#9aa4a8]" />
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </AgencyPanel>
    );
}
