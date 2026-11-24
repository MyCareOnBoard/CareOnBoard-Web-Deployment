import { useEffect, useRef, useState } from "react";
import { AiInsightsIcon } from "@/components/agency/AgencyIcons";
import type { AnalyticsFilters, AnalyticsInsights } from "@/lib/api/reports";
import AIInsightsCard, { useScopedAnalyticsInsights } from "../../analytics/components/AIInsightsCard";

/**
 * "AI insights" button on a dashboard panel. Fetches the scoped insights on first open and
 * shows the matching section in a popover. Closes on an outside click or when the scope changes.
 */
export default function AiInsightsButton({ section, scope, limitedCoverage }: {
    section: keyof AnalyticsInsights;
    scope: AnalyticsFilters;
    limitedCoverage?: boolean;
}) {
    const { fetchInsights, insightsData, insightsLoading, insightsDisabled } = useScopedAnalyticsInsights(scope);
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const onDown = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
        };
        const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
        document.addEventListener("mousedown", onDown);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("mousedown", onDown);
            document.removeEventListener("keydown", onKey);
        };
    }, [open]);

    useEffect(() => { setOpen(false); }, [scope.startDate, scope.endDate, scope.mode, scope.scopeKey]);

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                disabled={insightsDisabled}
                aria-expanded={open}
                onClick={() => {
                    if (!open) fetchInsights();
                    setOpen((value) => !value);
                }}
                className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-[10px] border border-[#e4e7ea] bg-white px-3 text-[13px] font-medium text-[#007679] transition-colors hover:bg-[#f2f7f7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007679] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-transparent dark:text-[#7fd3d3] dark:hover:bg-white/5"
            >
                <AiInsightsIcon className="h-4 w-4" />
                AI insights
            </button>
            {open && (
                <AIInsightsCard
                    limitedCoverage={limitedCoverage}
                    isLoading={insightsLoading}
                    insight={insightsData?.[section]?.insight ?? ""}
                    recommendation={insightsData?.[section]?.recommendation ?? ""}
                />
            )}
        </div>
    );
}
