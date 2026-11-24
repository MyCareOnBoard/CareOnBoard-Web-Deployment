import { useEffect, useId, useState, type ComponentType, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { AgencyMode } from "@/store/redux/agencyModeSlice";
import LogoNameIcon from "@/assets/icons/green-green-logo.svg?react";
import LogoMarkIcon from "@/assets/icons/logo.svg?react";

/** Agency sidebar logo: smaller than the user panel's, as in the design. The mark alone when collapsed. */
export const agencySidebarLogo = (collapsed: boolean) => collapsed
    ? <LogoMarkIcon aria-label="Care on Board" role="img" className="h-9 w-auto" />
    : <LogoNameIcon aria-label="Care on Board" role="img" className="h-auto w-[164px]" />;

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
        <div role="group" aria-label="Agency program" className={cn("flex gap-1 rounded-[10px] border border-white/10 bg-[#0b4647] p-1", collapsed && "flex-col")}>
            {modes.map((value) => (
                <button
                    key={value}
                    type="button"
                    aria-pressed={mode === value}
                    title={collapsed ? programNames[value].full : undefined}
                    onClick={() => onSelect(value)}
                    className={cn(
                        "flex-1 cursor-pointer whitespace-nowrap rounded-[7px] px-2 py-1.5 text-[13px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white",
                        mode === value ? "bg-[#0f7e7d] font-semibold text-white shadow-sm" : "font-medium text-white/80 hover:bg-white/10 hover:text-white",
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
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-[#dcdfe2] text-[#007679] dark:border-white/15 dark:text-[#7fd3d3]">
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
export function AgencyStatCard({ icon: Icon, label, value, extra, footnote, children, className }: {
    icon?: ComponentType<{ className?: string }>;
    label: ReactNode;
    value: ReactNode;
    extra?: ReactNode;
    footnote?: ReactNode;
    /** Shown under the value inside the grey panel (e.g. an AgencyProgressBar). */
    children?: ReactNode;
    className?: string;
}) {
    return (
        <div className={cn("flex flex-col rounded-[16px] border border-[#e4e7ea] bg-white p-2 dark:border-white/10 dark:bg-[#1b232b]", className)}>
            <div className="rounded-[12px] bg-[#f4f5f6] px-4 pb-4 pt-3.5 dark:bg-white/5">
                <p className="flex items-center gap-2.5 text-sm font-medium text-[#2a3138] dark:text-[#c9d1d4]">
                    {Icon && (
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white dark:bg-white/10">
                            <Icon aria-hidden="true" className="h-4 w-4 text-[#007679] dark:text-[#7fd3d3]" />
                        </span>
                    )}
                    {label}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[32px] font-medium leading-none tracking-[-0.01em] text-[#10141a] dark:text-[#f4f6f7]">{value}{extra}</div>
                {children && <div className="mt-3.5">{children}</div>}
            </div>
            {footnote && <p className="px-2 pb-1 pt-3 text-xs leading-[18px] text-[#5b636b] dark:text-[#9aa4a8]">{footnote}</p>}
        </div>
    );
}

/** Thin teal bar for a share of a whole (compliance rate, shifts billed). */
export function AgencyProgressBar({ value, label, className }: { value: number; label: string; className?: string }) {
    const clamped = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
    return (
        <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(clamped)}
            className={cn("h-1.5 w-full overflow-hidden rounded-full bg-[#e2e5e8] dark:bg-white/10", className)}>
            <div className="h-full rounded-full bg-[#12b5b0] transition-[width] duration-500" style={{ width: `${clamped}%` }} />
        </div>
    );
}

/**
 * "+2% vs last period" pill. Green when the change is good, red when it is bad: pass
 * goodWhen="down" for counts where a rise is bad (flags, manual interventions).
 */
export function AgencyTrendBadge({ value, unit = "%", goodWhen = "up", suffix = "vs last period", className }: {
    value?: number | null;
    unit?: string;
    goodWhen?: "up" | "down";
    suffix?: string;
    className?: string;
}) {
    if (typeof value !== "number" || !Number.isFinite(value)) return null;
    const tone = value === 0 ? "neutral" : (value > 0) === (goodWhen === "up") ? "good" : "bad";
    const sign = value > 0 ? "+" : value < 0 ? "−" : "";
    return (
        <span className={cn(
            "inline-flex h-6 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[6px] px-2 text-[12px] font-medium leading-none tracking-normal",
            tone === "good" && "bg-[#e5f6ec] text-[#0a6b38] dark:bg-[#3ecb7a]/15 dark:text-[#7fe0a8]",
            tone === "bad" && "bg-[#fde9ea] text-[#b4232b] dark:bg-[#ff6b5e]/15 dark:text-[#ff9d94]",
            tone === "neutral" && "bg-[#eef0f2] text-[#4b535b] dark:bg-white/10 dark:text-[#c9d1d4]",
            className,
        )}>
            <span aria-hidden="true" className={cn("h-1.5 w-1.5 rounded-full", tone === "good" ? "bg-[#12a150]" : tone === "bad" ? "bg-[#e5484d]" : "bg-[#8a949b]")} />
            {sign}{Math.abs(value)}{unit}{suffix ? ` ${suffix}` : ""}
        </span>
    );
}

/** White card with a title row (icon, title, action on the right) and a body. Dashboard panels and similar. */
export function AgencyPanel({ icon: Icon, title, action, children, divider = true, className, bodyClassName, busy }: {
    icon?: ComponentType<{ className?: string }>;
    title: ReactNode;
    action?: ReactNode;
    children?: ReactNode;
    /** A rule under the title row. */
    divider?: boolean;
    className?: string;
    bodyClassName?: string;
    busy?: boolean;
}) {
    const id = useId();
    return (
        <section aria-labelledby={id} aria-busy={busy || undefined} className={cn("flex min-w-0 flex-col rounded-[16px] border border-[#e4e7ea] bg-white dark:border-white/10 dark:bg-[#1b232b]", className)}>
            <div className={cn("flex min-h-[60px] items-center justify-between gap-3 px-5 py-3", divider && "border-b border-[#eceef0] dark:border-white/10")}>
                <h2 id={id} className="flex min-w-0 items-center gap-2.5 text-base font-semibold text-[#10141a] dark:text-[#f4f6f7]">
                    {Icon && <Icon aria-hidden="true" className="h-5 w-5 shrink-0 text-[#007679] dark:text-[#7fd3d3]" />}
                    <span className="truncate">{title}</span>
                </h2>
                {action && <div className="flex shrink-0 items-center">{action}</div>}
            </div>
            <div className={cn("flex-1 px-5 py-4", bodyClassName)}>{children}</div>
        </section>
    );
}

/** "DDD program" for a program mode. */
export const agencyProgramName = (mode: AgencyMode | null | undefined) => mode ? programNames[mode].full : undefined;
