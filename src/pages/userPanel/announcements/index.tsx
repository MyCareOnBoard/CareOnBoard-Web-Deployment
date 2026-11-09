import {useCallback, useEffect, useMemo, useState} from 'react';
import {ChevronDown, ChevronUp, Mic} from 'lucide-react';
import axiosClient from '@/lib/axios';
import {Skeleton} from '@/components/ui/skeleton';
import {cn} from '@/lib/utils';
import {EmptyRecords, SearchBox, StatusPill, type Tone} from '../records/RecordsKit';
import {filterAnnouncements, postedParts, typeOf, type Announcement, type AnnouncementFilter, type AnnouncementType} from './announcementList';

const TYPES: Record<AnnouncementType, {label: string; tone: Tone; bar: string}> = {
    info: {label: 'Info', tone: 'blue', bar: 'bg-[#2b82ff]'},
    warning: {label: 'Warning', tone: 'amber', bar: 'bg-[#eab308]'},
    urgent: {label: 'Urgent', tone: 'red', bar: 'bg-[#e5484d]'},
};

const FILTERS: {key: AnnouncementFilter; label: string}[] = [
    {key: 'all', label: 'All'}, {key: 'info', label: 'Info'}, {key: 'warning', label: 'Warning'}, {key: 'urgent', label: 'Urgent'},
];

/** Bodies longer than this start clamped to three lines with a "Read more" toggle. */
const LONG_BODY = 160;

// Read by the sidebar badge to count announcements posted since the last visit.
const SEEN_AT_KEY = 'employee_ann_seen_at';

function AnnouncementCard({announcement, expanded, onToggle}: {announcement: Announcement; expanded: boolean; onToggle: () => void}) {
    const type = TYPES[typeOf(announcement)];
    const posted = postedParts(announcement.createdAt);
    const isLong = announcement.body.length > LONG_BODY;
    const bodyId = `announcement-body-${announcement.id}`;
    return <li className="flex gap-3 rounded-[8px] border border-[#e8edef] bg-white p-3 dark:border-white/10 dark:bg-[#1b232b]">
        <span className={cn('w-1 shrink-0 self-stretch rounded-full', type.bar)} aria-hidden="true"/>
        <div className="min-w-0 flex-1 py-0.5">
            <div className="flex flex-wrap items-center gap-2">
                <h3 className="break-words text-[14px] font-semibold text-[#10141a] dark:text-[#f4f6f7]">{announcement.title}</h3>
                <StatusPill label={type.label} tone={type.tone}/>
            </div>
            <p id={bodyId} className={cn('mt-2 whitespace-pre-line break-words text-[14px] leading-relaxed text-[#34434c] dark:text-[#c9d3d6]', isLong && !expanded && 'line-clamp-3')}>
                {announcement.body}
            </p>
            {isLong && <button type="button" onClick={onToggle} aria-expanded={expanded} aria-controls={bodyId}
                className="mt-1 inline-flex cursor-pointer items-center gap-0.5 text-[12px] font-semibold text-[#007679] underline-offset-2 hover:underline dark:text-[#7fe0e2]">
                {expanded ? <><ChevronUp className="h-3.5 w-3.5" aria-hidden="true"/> Show less</> : <><ChevronDown className="h-3.5 w-3.5" aria-hidden="true"/> Read more</>}
            </button>}
            {announcement.createdByName && <p className="mt-2 text-[12px] text-[#4a6b7c] dark:text-[#9aa4a8]">
                <span className="sr-only">Posted by </span>{announcement.createdByName}
            </p>}
        </div>
        {posted && <time dateTime={posted.iso} title={posted.full} className="shrink-0 text-right leading-tight">
            <span className="sr-only">{posted.full}</span>
            <span aria-hidden="true" className="block text-[12px] text-[#5d6b73] dark:text-[#9aa4a8]">{posted.month}</span>
            <span aria-hidden="true" className="block text-[20px] font-bold text-[#10141a] dark:text-[#f4f6f7]">{posted.day}</span>
        </time>}
    </li>;
}

function ListSkeleton() {
    return <div role="status" aria-label="Loading announcements" className="flex flex-col gap-2">
        {[0, 1, 2].map(row => <div key={row} className="flex gap-3 rounded-[8px] border border-[#e8edef] p-3 dark:border-white/10">
            <Skeleton className="w-1 self-stretch rounded-full motion-reduce:animate-none dark:bg-white/10"/>
            <div className="flex-1 space-y-2.5 py-0.5">
                <Skeleton className="h-4 w-1/3 motion-reduce:animate-none dark:bg-white/10"/>
                <Skeleton className="h-4 w-2/3 motion-reduce:animate-none dark:bg-white/10"/>
                <Skeleton className="h-3 w-16 motion-reduce:animate-none dark:bg-white/10"/>
            </div>
            <Skeleton className="h-9 w-8 rounded-[4px] motion-reduce:animate-none dark:bg-white/10"/>
        </div>)}
    </div>;
}

export default function EmployeeAnnouncementsPage() {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [filter, setFilter] = useState<AnnouncementFilter>('all');
    const [search, setSearch] = useState('');
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

    const load = useCallback(() => {
        let cancelled = false;
        setLoading(true);
        setError(false);
        axiosClient.get<{success: boolean; data: Announcement[]}>('/employeePortal/announcements')
            .then(response => {
                if (cancelled) return;
                setAnnouncements(response.data.data || []);
                try { localStorage.setItem(SEEN_AT_KEY, Date.now().toString()); } catch { /* storage blocked: the badge just stays */ }
            })
            .catch(() => { if (!cancelled) setError(true); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, []);
    useEffect(() => load(), [load]);

    const shown = useMemo(() => filterAnnouncements(announcements, filter, search), [announcements, filter, search]);
    const toggle = (id: string) => setExpandedIds(previous => {
        const next = new Set(previous);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
    });
    const empty = !loading && !error && announcements.length === 0;
    const filterLabel = FILTERS.find(option => option.key === filter)?.label.toLowerCase();

    return <div className="flex min-h-[calc(100vh-200px)] flex-col">
        <h1 className="sr-only">Announcements</h1>
        <section aria-labelledby="announcements-heading" className="flex flex-1 flex-col gap-4 rounded-[20px] bg-white p-4 shadow-[0_1px_2px_rgba(16,40,44,0.06)] sm:p-6 dark:bg-[#1b232b]">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 id="announcements-heading" className="text-lg font-semibold text-[#10141a] dark:text-[#f4f6f7]">Announcements</h2>
                {!empty && !error && <SearchBox value={search} onChange={setSearch} placeholder="Search announcement here" label="Search announcements" className="sm:w-[240px]"/>}
            </div>

            {empty ? <EmptyRecords icon={Mic} title="No announcements yet"
                body="Important updates and announcements from your agency will appear here. Check back later for new information."/>
                : <>
                    {!error && <div role="group" aria-label="Filter by type" className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-[8px] bg-[#f1f6f7] p-1 dark:bg-white/5">
                        {FILTERS.map(option => <button key={option.key} type="button" onClick={() => setFilter(option.key)} aria-pressed={filter === option.key}
                            className={cn('h-9 shrink-0 cursor-pointer rounded-[6px] px-4 text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-[#007679]',
                                filter === option.key ? 'bg-white font-semibold text-[#10141a] shadow-[0_1px_3px_rgba(16,20,26,0.12)] dark:bg-[#26313a] dark:text-white'
                                    : 'text-[#5d6b73] hover:text-[#10141a] dark:text-[#9aa4a8] dark:hover:text-white')}>
                            {option.label}
                        </button>)}
                    </div>}

                    {loading ? <ListSkeleton/>
                        : error ? <p role="alert" className="py-16 text-center text-sm text-[#b3371c] dark:text-[#f3a08c]">
                            We couldn&apos;t load announcements.{' '}
                            <button type="button" onClick={load} className="cursor-pointer font-semibold underline">Try again</button>
                        </p>
                        : shown.length ? <ul aria-label="Announcements" className="flex flex-col gap-2">
                            {shown.map(announcement => <AnnouncementCard key={announcement.id} announcement={announcement}
                                expanded={expandedIds.has(announcement.id)} onToggle={() => toggle(announcement.id)}/>)}
                        </ul>
                        : <p role="status" className="py-12 text-center text-sm text-[#5d6b73] dark:text-[#9aa4a8]">
                            {search.trim() ? `No ${filter === 'all' ? '' : `${filterLabel} `}announcements match "${search.trim()}".` : `No ${filterLabel} announcements.`}
                        </p>}
                </>}
        </section>
    </div>;
}
