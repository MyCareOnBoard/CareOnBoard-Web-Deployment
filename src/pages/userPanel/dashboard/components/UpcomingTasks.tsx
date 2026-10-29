import {Link} from 'react-router';
import {CalendarClock} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Skeleton} from '@/components/ui/skeleton';
import {ShiftStatus, type Shift} from '@/lib/api/shifts';
import {toDateKey} from '../overviewStats';

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** Clients are shown by a short id only; names aren't loaded on the dashboard. */
export const shortClientId = (clientId?: string) => clientId ? clientId.slice(0, 6).toUpperCase() : undefined;

function tagFor(shift: Shift, today: string) {
    if (shift.status === ShiftStatus.ONGOING) return {label: 'In progress', className: 'bg-[#e6f6ed] text-[#187343] dark:bg-[#187343]/20 dark:text-[#7fd6a3]'};
    if (shift.date === today) return {label: 'Today', className: 'bg-[#fff3d6] text-[#8a5200] dark:bg-[#f29d0c]/20 dark:text-[#f7c46b]'};
    return {label: 'Upcoming', className: 'bg-[#edf3fa] text-[#375f84] dark:bg-[#4a7fb5]/20 dark:text-[#9cc0e6]'};
}

interface Props {
    shifts: Shift[];
    loading: boolean;
    error: boolean;
    onRetry: () => void;
    viewAllPath: string;
    limit?: number;
}

export default function UpcomingTasks({shifts, loading, error, onRetry, viewAllPath, limit = 4}: Props) {
    const today = toDateKey(new Date());
    const visible = shifts.slice(0, limit);
    return <section aria-labelledby="dashboard-upcoming" className="rounded-[20px] bg-white p-5 shadow-[0_1px_2px_rgba(16,40,44,0.06)] dark:bg-[#1b232b]">
        <div className="flex items-center justify-between gap-3">
            <h2 id="dashboard-upcoming" className="text-lg font-bold text-[#10141a] dark:text-[#f4f6f7]">Upcoming tasks</h2>
            <Link to={viewAllPath} className="text-sm font-semibold text-[#007679] hover:underline dark:text-[#7fe0e2]">View all</Link>
        </div>
        <p className="mt-1 text-[13px] text-[#5d6b73] dark:text-[#9aa4a8]">Your next scheduled shifts</p>
        {loading ? <div role="status" aria-label="Loading upcoming tasks" className="mt-3 space-y-3">
            {[0, 1, 2].map(row => <div key={row} className="flex gap-3"><Skeleton className="h-12 w-12 rounded-xl motion-reduce:animate-none"/><div className="flex-1 space-y-2"><Skeleton className="h-4 w-2/3 motion-reduce:animate-none"/><Skeleton className="h-3 w-1/2 motion-reduce:animate-none"/></div></div>)}
        </div> : error ? <p role="alert" className="mt-3 text-sm text-[#b3371c] dark:text-[#f3a08c]">Unable to load your shifts. <Button type="button" variant="ghost" onClick={onRetry}>Try again</Button></p>
        : visible.length === 0 ? <div className="flex flex-col items-center gap-2 py-8 text-center">
            <CalendarClock className="h-8 w-8 text-[#8a99a3]" aria-hidden="true"/>
            <p className="text-sm font-semibold text-[#10141a] dark:text-[#f4f6f7]">You're all caught up</p>
            <p className="text-[13px] text-[#5d6b73] dark:text-[#9aa4a8]">New shifts will show here when they're assigned to you.</p>
        </div> : <ul className="mt-2">
            {visible.map(shift => {
                const [, month, day] = shift.date.split('-');
                const tag = tagFor(shift, today);
                const client = shortClientId(shift.clientId);
                return <li key={shift.id} className="flex gap-3 border-t border-[#edf2f3] py-3 first:border-t-0 dark:border-white/10">
                    <div className="w-12 shrink-0 rounded-xl bg-[#e3f6f6] py-1.5 text-center text-[#00666a] dark:bg-[#00a3a7]/15 dark:text-[#7fe0e2]">
                        <div className="text-[10px] font-extrabold">{MONTHS[Number(month) - 1] ?? ''}</div>
                        <div className="text-lg font-extrabold leading-tight">{Number(day) || ''}</div>
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                            <p className="text-[15px] font-bold text-[#10141a] dark:text-[#f4f6f7]">{shift.startTime}{shift.endTime ? ` – ${shift.endTime}` : ''}</p>
                            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${tag.className}`}>{tag.label}</span>
                        </div>
                        <p className="mt-0.5 text-[13px] text-[#5d6b73] dark:text-[#9aa4a8]">
                            {client ? <>Client <span className="font-mono">#{client}</span></> : 'No client assigned'}
                            {shift.serviceCode ? ` · ${shift.serviceCode}` : ''}
                        </p>
                    </div>
                </li>;
            })}
        </ul>}
    </section>;
}
