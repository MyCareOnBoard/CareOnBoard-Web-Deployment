import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { AgencyMode } from "@/store/redux/agencyModeSlice";

/**
 * Building blocks of the new agency layout (Figma "Agency" frames): the program switch in the
 * sidebar, the date line in the top bar, and the page header and stat tiles that ported pages use.
 */

const programNames: Record<AgencyMode, { full: string; short: string }> = {
    ddd: { full: "DDD program", short: "DDD" },
    hha: { full: "HHA program", short: "HHA" },
    sc: { full: "SC program", short: "SC" },
};

/** DDD / HHA (/ SC) switch under the logo. Shows short labels when the sidebar is collapsed. */
export function AgencyProgramSwitch({ mode, modes, onSelect, collapsed = false }: {
    mode: AgencyMode;
    modes: AgencyMode[];
    onSelect: (mode: AgencyMode) => void;
    collapsed?: boolean;
}) {
    return (
        <div role="group" aria-label="Agency program" className={cn("flex gap-1 rounded-[10px] bg-[#0b4c4d] p-1", collapsed && "flex-col")}>
            {modes.map((value) => (
                <button
                    key={value}
                    type="button"
                    aria-pressed={mode === value}
                    title={collapsed ? programNames[value].full : undefined}
                    onClick={() => onSelect(value)}
                    className={cn(
                        "flex-1 cursor-pointer whitespace-nowrap rounded-[7px] px-2 py-1.5 text-[13px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white",
                        mode === value ? "bg-[#13706f] font-semibold text-white" : "font-medium text-white/75 hover:bg-white/10 hover:text-white",
                    )}
                >
                    {collapsed ? programNames[value].short : programNames[value].full}
                </button>
            ))}
        </div>
    );
}

function formatTopBarDate(now: Date) {
    const day = new Intl.DateTimeFormat(undefined, { weekday: "long", day: "numeric", month: "long" }).format(now);
    const time = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", hour12: false, timeZoneName: "short" }).format(now);
    return `${day} · ${time}`;
}

/** "SUNDAY, 22 NOVEMBER · 10:58 GMT" at the left of the top bar, refreshed every minute. */
export function AgencyTopBarDate({ className }: { className?: string }) {
    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        let interval: ReturnType<typeof setInterval> | undefined;
        // Line the ticks up with the minute so the clock never lags by up to a minute.
        const timeout = setTimeout(() => {
            setNow(new Date());
            interval = setInterval(() => setNow(new Date()), 60_000);
        }, 60_000 - (Date.now() % 60_000));
        return () => {
            clearTimeout(timeout);
            if (interval) clearInterval(interval);
        };
    }, []);
    return (
        <p className={cn("hidden truncate text-[12px] font-medium uppercase tracking-[0.06em] text-[#4b535b] sm:block dark:text-[#9aa4a8]", className)}>
            <time dateTime={now.toISOString()}>{formatTopBarDate(now)}</time>
        </p>
    );
}

/** Page title block: icon in a circle, title, one-line description and the page's actions on the right. */
export function AgencyPageHeader({ icon: Icon, title, description, actions, className }: {
    icon?: ComponentType<{ className?: string }>;
    title: ReactNode;
    description?: ReactNode;
    actions?: ReactNode;
    className?: string;
}) {
    return (
        <div className={cn("flex flex-col gap-4 border-b border-[#eceef0] pb-6 sm:flex-row sm:items-center sm:justify-between dark:border-white/10", className)}>
            <div className="flex min-w-0 items-center gap-4">
                {Icon && (
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-[#dcdfe2] text-[#0b5c5d] dark:border-white/15 dark:text-[#7fd3d3]">
                        <Icon aria-hidden="true" className="h-[22px] w-[22px]" />
                    </span>
                )}
                <div className="min-w-0">
                    <h1 className="text-[28px] font-medium leading-tight text-[#10141a] dark:text-[#f4f6f7]">{title}</h1>
                    {description && <p className="mt-0.5 text-sm text-[#5b636b] dark:text-[#9aa4a8]">{description}</p>}
                </div>
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
        </div>
    );
}

/** Stat tile: grey inner panel with label, big value and an optional extra (badge or bar), then a footnote. */
export function AgencyStatCard({ icon: Icon, label, value, extra, footnote, className }: {
    icon?: ComponentType<{ className?: string }>;
    label: ReactNode;
    value: ReactNode;
    extra?: ReactNode;
    footnote?: ReactNode;
    className?: string;
}) {
    return (
        <div className={cn("rounded-[14px] border border-[#e4e7ea] bg-white p-2 dark:border-white/10 dark:bg-[#1b232b]", className)}>
            <div className="rounded-[10px] bg-[#f4f5f6] px-3.5 pb-3 pt-3.5 dark:bg-white/5">
                <p className="flex items-center gap-2 text-sm text-[#2a3138] dark:text-[#c9d1d4]">
                    {Icon && <Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-[#0b5c5d] dark:text-[#7fd3d3]" />}
                    {label}
                </p>
                <div className="mt-2.5 flex items-center gap-2 text-[30px] leading-none text-[#10141a] dark:text-[#f4f6f7]">{value}{extra}</div>
            </div>
            {footnote && <p className="px-1.5 pb-0.5 pt-2.5 text-xs text-[#5b636b] dark:text-[#9aa4a8]">{footnote}</p>}
        </div>
    );
}
