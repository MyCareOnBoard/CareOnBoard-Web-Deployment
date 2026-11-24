import type { ComponentType, ReactNode } from "react";
import { Link } from "react-router";
import { ChevronRight } from "lucide-react";
import { AgencyPanel } from "@/components/agency/AgencyShell";

type Stats = { active: number; inactive: number; total: number };

/**
 * Workforce / Clients panel: active, inactive and total tiles, a one-line note under them,
 * and a link to the management page when the viewer can open it.
 */
export default function PeopleSummaryCard({ icon, title, link, labels, stats, isLoading, note }: {
    icon: ComponentType<{ className?: string }>;
    title: string;
    link?: { label: string; to: string };
    /** Tile labels, e.g. ["Active DSPs", "Inactive", "Total"]. */
    labels: [string, string, string];
    stats?: Stats;
    isLoading?: boolean;
    note?: ReactNode;
}) {
    const values = stats ? [stats.active, stats.inactive, stats.total] : [undefined, undefined, undefined];
    return (
        <AgencyPanel
            icon={icon}
            title={title}
            divider={false}
            busy={isLoading}
            bodyClassName="pt-1"
            action={link && (
                <Link to={link.to} className="inline-flex items-center gap-1 rounded text-[14px] font-semibold text-[#007679] underline underline-offset-4 hover:text-[#005c5e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007679] dark:text-[#7fd3d3]">
                    {link.label}
                    <ChevronRight aria-hidden="true" className="h-4 w-4" />
                </Link>
            )}
        >
            <dl className="grid grid-cols-3 gap-3">
                {labels.map((label, index) => (
                    <div key={label} className="rounded-[12px] bg-[#f4f5f6] px-3.5 py-3 dark:bg-white/5">
                        <dt className="truncate text-[12px] font-medium text-[#4b535b] dark:text-[#9aa4a8]">{label}</dt>
                        <dd className="mt-2 text-[28px] font-medium leading-none text-[#10141a] dark:text-[#f4f6f7]">
                            {isLoading ? <span className="block h-7 w-10 animate-pulse rounded bg-[#e6e9eb] dark:bg-white/10" /> : values[index] ?? "—"}
                        </dd>
                    </div>
                ))}
            </dl>
            {note && <p className="mt-4 text-[13px] leading-5 text-[#4b535b] dark:text-[#9aa4a8]">{note}</p>}
        </AgencyPanel>
    );
}
