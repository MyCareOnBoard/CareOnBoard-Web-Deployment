import type {ComponentType} from 'react';
import {Link} from 'react-router';
import {Car, Clock3, NotebookPen, TriangleAlert} from 'lucide-react';
import {Routes} from '@/routes/constants';

interface Action { label: string; to: string; icon: ComponentType<{className?: string}>; }

export default function QuickActions({supportCoordinator = false}: {supportCoordinator?: boolean}) {
    const actions: Action[] = supportCoordinator
        ? [{label: 'Timesheets', to: Routes.userPanel.manualShiftManagement, icon: Clock3}]
        : [{label: 'Clock in', to: Routes.userPanel.shiftManagement, icon: Clock3},
            {label: 'Write a note', to: Routes.userPanel.notes.index, icon: NotebookPen}];
    actions.push({label: 'Log mileage', to: Routes.userPanel.mileage, icon: Car},
        {label: 'Report incident', to: Routes.userPanel.incident, icon: TriangleAlert});
    return <section aria-labelledby="dashboard-quick-actions" className="rounded-[12px] border border-[#e8edef] bg-white p-5 dark:border-white/10 dark:bg-[#1b232b]">
        <h2 id="dashboard-quick-actions" className="mb-3 text-[16px] font-semibold text-[#10141a] dark:text-[#f4f6f7]">Quick actions</h2>
        <div className="grid grid-cols-2 gap-2.5">
            {actions.map(({label, to, icon: Icon}) => <Link key={label} to={to}
                className="group flex min-h-11 flex-col gap-2 rounded-[8px] border border-[#e8edef] bg-[#f7f9f9] p-3.5 text-sm font-semibold text-[#10141a] transition-colors hover:border-[#c9e9ea] hover:bg-[#e3f6f6] focus-visible:outline-2 focus-visible:outline-[#007679] dark:border-white/10 dark:bg-white/5 dark:text-[#f4f6f7] dark:hover:bg-white/10">
                <span className="grid h-7 w-7 place-items-center rounded-[6px] bg-[#e3f6f6] text-[#00a3a7] transition-colors group-hover:bg-white dark:bg-[#00a3a7]/20 dark:group-hover:bg-[#00a3a7]/30 dark:text-[#7fe0e2]"><Icon className="h-4 w-4" aria-hidden="true"/></span>
                {label}
            </Link>)}
        </div>
    </section>;
}
