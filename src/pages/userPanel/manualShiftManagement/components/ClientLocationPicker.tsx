import {useEffect, useId, useMemo, useRef, useState} from 'react';
import {Check, ChevronDown, Home, Loader2, MapPin, PenLine, Search} from 'lucide-react';
import {cn} from '@/lib/utils';
import type {AssignedTimesheetClient, AssignedTimesheetLocation} from '@/lib/api/shifts';
import {shortClientId} from '@/pages/userPanel/dashboard/components/UpcomingTasks';

/** The id of the "another address" option every client gets. */
export const OTHER_LOCATION_ID = 'other';

export interface ClientLocationValue {
    clientId: string;
    locationId: string;
}

export const assignedClientLabel = (clientId: string) => shortClientId(clientId) ?? '';

export const locationKindLabel = (location: Pick<AssignedTimesheetLocation, 'kind' | 'serviceName'>) =>
    location.kind === 'primary' ? 'Primary location' : location.serviceName ? `Service location · ${location.serviceName}` : 'Service location';

const serviceNames = (client: AssignedTimesheetClient) =>
    client.services.map(service => service.name || service.code).filter((name): name is string => Boolean(name));

/** Clients (and their locations) matching a search on short id, address or service. A client match keeps all its locations. */
export function filterAssignedClients(clients: AssignedTimesheetClient[], query: string): AssignedTimesheetClient[] {
    const needle = query.trim().toLowerCase();
    if (!needle) return clients;
    return clients.flatMap(client => {
        const clientText = [assignedClientLabel(client.id), ...serviceNames(client)].join(' ').toLowerCase();
        if (clientText.includes(needle)) return [client];
        const locations = client.locations.filter(location =>
            `${location.display} ${locationKindLabel(location)}`.toLowerCase().includes(needle));
        return locations.length > 0 ? [{...client, locations}] : [];
    });
}

interface Props {
    clients: AssignedTimesheetClient[];
    loading: boolean;
    error: boolean;
    value: ClientLocationValue | null;
    /** `location` is null for the "another address" option. */
    onChange: (client: AssignedTimesheetClient, location: AssignedTimesheetLocation | null) => void;
    onRetry: () => void;
}

const optionClass = 'flex w-full cursor-pointer items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-left hover:bg-[#f2fafa] focus-visible:bg-[#f2fafa] focus-visible:outline-none dark:hover:bg-white/5 dark:focus-visible:bg-white/5';

/**
 * One field for both client and location: clients the staff member is assigned to,
 * each grouped with its primary and service locations. Shows short client ids only.
 */
export default function ClientLocationPicker({clients, loading, error, value, onChange, onRetry}: Props) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const boxRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const listId = useId();
    const labelId = useId();
    const valueId = useId();

    const selectedClient = value ? clients.find(client => client.id === value.clientId) : undefined;
    const selectedLocation = value && selectedClient
        ? selectedClient.locations.find(location => location.id === value.locationId)
        : undefined;
    const visible = useMemo(() => filterAssignedClients(clients, query), [clients, query]);

    useEffect(() => {
        if (!open) return;
        const onPointerDown = (event: MouseEvent) => {
            if (boxRef.current && !boxRef.current.contains(event.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', onPointerDown);
        searchRef.current?.focus();
        return () => document.removeEventListener('mousedown', onPointerDown);
    }, [open]);

    const close = () => {
        setOpen(false);
        setQuery('');
        triggerRef.current?.focus();
    };

    const pick = (client: AssignedTimesheetClient, location: AssignedTimesheetLocation | null) => {
        onChange(client, location);
        close();
    };

    /** Arrow keys move between options; Escape closes. */
    const onMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'Escape') {
            event.preventDefault();
            close();
            return;
        }
        if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
        event.preventDefault();
        const options = Array.from(boxRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? []);
        if (options.length === 0) return;
        const current = options.indexOf(document.activeElement as HTMLButtonElement);
        const next = event.key === 'ArrowDown'
            ? (current + 1) % options.length
            : current <= 0 ? options.length - 1 : current - 1;
        options[next]?.focus();
    };

    const summary = value && selectedClient
        ? selectedLocation
            ? `${selectedLocation.kind === 'primary' ? 'Primary' : 'Service'} · ${selectedLocation.display}`
            : 'Another address'
        : null;

    return <div ref={boxRef} className="relative md:col-span-2">
        <span id={labelId} className="mb-1.5 block text-[14px] font-semibold text-[#10141a] dark:text-[#f4f6f7]">Client and location</span>
        <button ref={triggerRef} type="button" aria-haspopup="listbox" aria-expanded={open} aria-labelledby={`${labelId} ${valueId}`}
            aria-controls={open ? listId : undefined}
            onClick={() => (open ? close() : setOpen(true))}
            onKeyDown={event => { if (event.key === 'ArrowDown' && !open) { event.preventDefault(); setOpen(true); } }}
            className={cn('flex h-11 w-full cursor-pointer items-center gap-2 rounded-[8px] border bg-white px-3 text-left text-[14px] text-[#10141a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007679]/20 dark:bg-[#141b21] dark:text-[#f4f6f7]',
                open ? 'border-[#007679]' : 'border-[#e3e8ea] dark:border-white/10')}>
            <span id={valueId} className="flex min-w-0 flex-1 items-center gap-2">
            {selectedClient
                ? <>
                    <span className="shrink-0 font-semibold">{assignedClientLabel(selectedClient.id)}</span>
                    {summary && <>
                        <span className="text-[#8a979d]" aria-hidden="true">·</span>
                        <span className="min-w-0 flex-1 truncate text-[#3d4a51] dark:text-[#c9d3d6]">{summary}</span>
                    </>}
                </>
                : <span className="min-w-0 flex-1 truncate text-[#8a979d]">
                    {loading ? 'Loading your clients…' : 'Choose a client and location'}
                </span>}
            </span>
            {loading
                ? <Loader2 className="ml-auto h-4 w-4 shrink-0 animate-spin text-[#5b6870]" aria-hidden="true"/>
                : <ChevronDown className={cn('ml-auto h-4 w-4 shrink-0 text-[#5b6870] transition-transform', open && 'rotate-180')} aria-hidden="true"/>}
        </button>

        {open && <div onKeyDown={onMenuKeyDown}
            className="absolute z-50 mt-1 flex max-h-[360px] w-full flex-col overflow-hidden rounded-[10px] border border-[#e3e8ea] bg-white shadow-[0_12px_32px_rgba(16,20,26,0.14)] dark:border-white/15 dark:bg-[#11191c]">
            <div className="border-b border-[#edf2f3] p-2.5 dark:border-white/10">
                <label className="flex h-9 items-center gap-2 rounded-[8px] bg-[#f4f7f8] px-2.5 dark:bg-white/5">
                    <Search className="h-4 w-4 shrink-0 text-[#6b7880]" aria-hidden="true"/>
                    <span className="sr-only">Search clients</span>
                    <input ref={searchRef} value={query} onChange={event => setQuery(event.target.value)}
                        placeholder="Search by client ID, address or service" autoComplete="off"
                        className="min-w-0 flex-1 bg-transparent text-[13px] text-[#10141a] placeholder:text-[#6b7880] focus:outline-none dark:text-[#f4f6f7]"/>
                </label>
            </div>

            <div id={listId} role="listbox" aria-labelledby={labelId} className="min-h-0 flex-1 overflow-y-auto p-1.5">
                {loading
                    ? <p className="flex items-center gap-2 px-2.5 py-3 text-[13px] text-[#5d6b73] dark:text-[#9aa4a8]"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true"/> Loading your clients…</p>
                    : error
                        ? <div className="flex items-center justify-between gap-3 px-2.5 py-3 text-[13px] text-[#5d6b73] dark:text-[#9aa4a8]">
                            <span>We couldn't load your clients.</span>
                            <button type="button" onClick={onRetry} className="cursor-pointer font-semibold text-[#007679] hover:underline dark:text-[#5fd0d3]">Try again</button>
                        </div>
                        : clients.length === 0
                            ? <p className="px-2.5 py-3 text-[13px] text-[#5d6b73] dark:text-[#9aa4a8]">You aren't assigned to any client services yet. Ask your agency to add you to a client's service.</p>
                            : visible.length === 0
                                ? <p className="px-2.5 py-3 text-[13px] text-[#5d6b73] dark:text-[#9aa4a8]">Nothing matches "{query.trim()}".</p>
                                : visible.map((client, index) => {
                                    const groupLabelId = `${listId}-client-${index}`;
                                    const names = serviceNames(client);
                                    const otherSelected = value?.clientId === client.id && value.locationId === OTHER_LOCATION_ID;
                                    return <div key={client.id} role="group" aria-labelledby={groupLabelId}
                                        className={cn(index > 0 && 'mt-1.5 border-t border-[#edf2f3] pt-1.5 dark:border-white/10')}>
                                        <div className="flex flex-wrap items-center gap-1.5 px-2.5 pb-1 pt-1.5">
                                            <span id={groupLabelId} className="text-[13px] font-semibold text-[#10141a] dark:text-[#f4f6f7]">{assignedClientLabel(client.id)}</span>
                                            {names.map(name => <span key={name} className="rounded-full bg-[#e6f4f4] px-2 py-0.5 text-[11px] font-medium text-[#005a5c] dark:bg-[#00a3a7]/15 dark:text-[#7fe0e2]">{name}</span>)}
                                        </div>
                                        {client.locations.map(location => {
                                            const selected = value?.clientId === client.id && value.locationId === location.id;
                                            const Icon = location.kind === 'primary' ? Home : MapPin;
                                            return <button key={location.id} type="button" role="option" aria-selected={selected}
                                                onClick={() => pick(client, location)}
                                                className={cn(optionClass, selected && 'bg-[#f2fafa] dark:bg-white/5')}>
                                                <Icon className={cn('h-4 w-4 shrink-0', selected ? 'text-[#007679] dark:text-[#5fd0d3]' : 'text-[#5b6870] dark:text-[#9aa4a8]')} aria-hidden="true"/>
                                                <span className="min-w-0 flex-1">
                                                    <span className={cn('block text-[11px] font-semibold', selected ? 'text-[#007679] dark:text-[#5fd0d3]' : 'text-[#5b6870] dark:text-[#9aa4a8]')}>{locationKindLabel(location)}</span>
                                                    <span className="block truncate text-[13px] text-[#10141a] dark:text-[#f4f6f7]">{location.display}</span>
                                                </span>
                                                {selected && <Check className="h-4 w-4 shrink-0 text-[#007679] dark:text-[#5fd0d3]" aria-hidden="true"/>}
                                            </button>;
                                        })}
                                        <button type="button" role="option" aria-selected={otherSelected}
                                            onClick={() => pick(client, null)}
                                            className={cn(optionClass, otherSelected && 'bg-[#f2fafa] dark:bg-white/5')}>
                                            <PenLine className="h-4 w-4 shrink-0 text-[#5b6870] dark:text-[#9aa4a8]" aria-hidden="true"/>
                                            <span className="min-w-0 flex-1 text-[13px] text-[#3d4a51] dark:text-[#c9d3d6]">
                                                {client.locations.length === 0 ? 'No address on file. Enter where you worked' : 'Another address'}
                                            </span>
                                            {otherSelected && <Check className="h-4 w-4 shrink-0 text-[#007679] dark:text-[#5fd0d3]" aria-hidden="true"/>}
                                        </button>
                                    </div>;
                                })}
            </div>
            {!loading && !error && clients.length > 0 && <p className="border-t border-[#edf2f3] px-3.5 py-2 text-[11px] text-[#5d6b73] dark:border-white/10 dark:text-[#9aa4a8]">
                Only clients you're assigned to through their services are listed.
            </p>}
        </div>}
    </div>;
}
