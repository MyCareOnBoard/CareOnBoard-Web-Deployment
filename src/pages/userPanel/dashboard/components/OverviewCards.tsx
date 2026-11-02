import type {ComponentType} from 'react';
import {CalendarCheck, CircleCheck, Timer, UsersRound} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Skeleton} from '@/components/ui/skeleton';
import type {OverviewStats} from '../overviewStats';

interface Card {
    label: string; value: string; sub: string; tag: string; progress: number;
    icon: ComponentType<{className?: string}>;
    /** Fixed colour of the card's icon and progress track. */
    accent: keyof typeof accents;
    /** Status colour of the tag and progress fill. */
    tone: keyof typeof tones;
}

const accents = {
    green: {icon: 'bg-[#e6f6ed] text-[#20a35c] dark:bg-[#20a35c]/20 dark:text-[#7fd6a3]', track: 'bg-[#e6f6ed] dark:bg-[#20a35c]/15'},
    teal: {icon: 'bg-[#e3f6f6] text-[#00a3a7] dark:bg-[#00a3a7]/20 dark:text-[#7fe0e2]', track: 'bg-[#e3f6f6] dark:bg-[#00a3a7]/15'},
    amber: {icon: 'bg-[#fff4e0] text-[#f29d0c] dark:bg-[#f29d0c]/20 dark:text-[#f7c46b]', track: 'bg-[#fff4e0] dark:bg-[#f29d0c]/15'},
    blue: {icon: 'bg-[#eaf2ff] text-[#2b82ff] dark:bg-[#2b82ff]/20 dark:text-[#9cc0e6]', track: 'bg-[#eaf2ff] dark:bg-[#2b82ff]/15'},
};

const tones = {
    green: {chip: 'bg-[#e6f6ed] text-[#187343] dark:bg-[#187343]/20 dark:text-[#7fd6a3]', bar: 'bg-[#20a35c]'},
    teal: {chip: 'bg-[#e3f6f6] text-[#00666a] dark:bg-[#00a3a7]/20 dark:text-[#7fe0e2]', bar: 'bg-[#00a3a7]'},
    amber: {chip: 'bg-[#fff3d6] text-[#8a5200] dark:bg-[#f29d0c]/20 dark:text-[#f7c46b]', bar: 'bg-[#f29d0c]'},
    blue: {chip: 'bg-[#eaf2ff] text-[#1f63c7] dark:bg-[#2b82ff]/20 dark:text-[#9cc0e6]', bar: 'bg-[#2b82ff]'},
    red: {chip: 'bg-[#fff0eb] text-[#b3371c] dark:bg-[#d53411]/20 dark:text-[#f3a08c]', bar: 'bg-[#d53411]'},
};

const formatHours = (hours: number) => `${Math.round(hours * 10) / 10} hrs`;
const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

export function overviewCards(stats: OverviewStats): Card[] {
    const rate = stats.completionRate;
    return [
        {
            label: 'Shifts completed', value: String(stats.completedThisMonth), sub: 'This month', icon: CalendarCheck, accent: 'green',
            tag: stats.completedChange === null ? 'This month' : `${stats.completedChange >= 0 ? '+' : ''}${stats.completedChange}% vs last month`,
            tone: stats.completedChange !== null && stats.completedChange < 0 ? 'amber' : 'green', progress: stats.completedProgress,
        },
        {
            label: 'Hours worked', value: formatHours(stats.hoursWorked), icon: Timer, accent: 'teal', tag: 'This week', tone: 'teal',
            sub: stats.hoursScheduled ? `Against ${formatHours(stats.hoursScheduled)} scheduled` : 'No hours scheduled this week',
            progress: stats.hoursScheduled ? stats.hoursWorked / stats.hoursScheduled : 0,
        },
        {
            label: 'Shift completion rate', value: rate === null ? '—' : `${Math.round(rate * 100)}%`, icon: CircleCheck, accent: 'amber',
            sub: 'Completed vs. missed shifts this month', progress: rate ?? 0,
            tag: rate === null ? 'No shifts yet' : rate >= 0.9 ? 'On track' : 'Below target',
            tone: rate === null ? 'blue' : rate >= 0.9 ? 'green' : 'red',
        },
        {
            label: 'Active clients', value: String(stats.activeClients), sub: 'Clients on your schedule', icon: UsersRound, accent: 'blue', tone: 'blue',
            tag: `${plural(stats.shiftsToday, 'shift')} today`,
            progress: stats.activeClients ? Math.min(1, stats.shiftsToday / stats.activeClients) : 0,
        },
    ];
}

export default function OverviewCards({stats, loading, error, onRetry}: {stats: OverviewStats; loading: boolean; error: boolean; onRetry: () => void}) {
    return <section aria-labelledby="dashboard-overview" className="flex flex-col gap-3">
        <h2 id="dashboard-overview" className="text-[16px] font-semibold text-[#10141a] dark:text-[#f4f6f7]">Overview</h2>
        {error && <p role="alert" className="text-sm text-[#b3371c] dark:text-[#f3a08c]">We couldn't load your shift stats. <Button type="button" variant="ghost" onClick={onRetry}>Try again</Button></p>}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            {overviewCards(stats).map(card => {
                const tone = tones[card.tone];
                const accent = accents[card.accent];
                const Icon = card.icon;
                return <div key={card.label} className="flex min-w-0 flex-col rounded-[12px] border border-[#e8edef] bg-white p-4 dark:border-white/10 dark:bg-[#1b232b]">
                    <div className="flex items-start justify-between gap-2">
                        <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-[6px] ${accent.icon}`}><Icon className="h-4 w-4" aria-hidden="true"/></span>
                        <span className={`truncate rounded-full px-2 py-0.5 text-[11px] font-semibold sm:text-xs ${tone.chip}`}>{card.tag}</span>
                    </div>
                    {loading ? <Skeleton className="mt-3 h-8 w-20 motion-reduce:animate-none dark:bg-white/10"/>
                        : <p className="mt-3 text-[24px] font-normal leading-8 text-[#10141a] dark:text-[#f4f6f7]">{card.value}</p>}
                    <p className="mt-1 text-[14px] font-medium text-[#10141a] dark:text-[#f4f6f7]">{card.label}</p>
                    <p className="mt-1 hidden text-[12px] text-[#5d6b73] sm:block dark:text-[#9aa4a8]">{card.sub}</p>
                    <div className={`mt-3 h-1.5 overflow-hidden rounded-full ${accent.track}`} aria-hidden="true">
                        <div className={`h-full rounded-full ${tone.bar}`} style={{width: `${Math.round(Math.min(1, Math.max(0, loading ? 0 : card.progress)) * 100)}%`}}/>
                    </div>
                </div>;
            })}
        </div>
    </section>;
}
