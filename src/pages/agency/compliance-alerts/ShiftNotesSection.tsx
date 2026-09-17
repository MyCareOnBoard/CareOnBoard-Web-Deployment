import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { useGetShiftNoteComplianceQuery } from './api';
import { ShiftNoteComplianceArgs, shiftNoteLabels, civilDateLabel } from './apiTypes';
import ShiftNoteStatus from '@/pages/shared/notes/ShiftNoteStatus';

export default function ShiftNotesSection(props: {agencyId: string; mode?: string; viewerId: string}) {
  // Remount on scope changes so pagination, selected details and old results cannot leak.
  return <ShiftNotesView key={`${props.viewerId}:${props.agencyId}:${props.mode}`} {...props} />;
}
function ShiftNotesView({agencyId, mode, viewerId}: {agencyId: string; mode?: string; viewerId: string}) {
  const [searchParams] = useSearchParams();
  const deepLinkedShift = searchParams.get('shiftId');
  const [selected, setSelected] = useState<string | null>(deepLinkedShift);
  useEffect(() => {setSelected(deepLinkedShift);}, [deepLinkedShift]);
  const [filter, setFilter] = useState<ShiftNoteComplianceArgs['stateGroup']>('unresolved');
  const [dates, setDates] = useState<{startDate?: Date; endDate?: Date}>({});
  const [cursors, setCursors] = useState<Array<string | undefined>>([undefined]);
  const {currentData: data, isFetching, isError, refetch} = useGetShiftNoteComplianceQuery({viewerId, agencyId, mode, stateGroup: filter, limit: 25, cursor: cursors[cursors.length - 1], startDate: dates.startDate ? format(dates.startDate, 'yyyy-MM-dd') : undefined, endDate: dates.endDate ? format(dates.endDate, 'yyyy-MM-dd') : undefined}, {skip: !agencyId || !viewerId});
  return <section aria-label="Shift notes" className="mt-6 overflow-hidden rounded-2xl border border-white bg-[#FFFFFF4D] shadow-sm">
    <div className="border-b border-[#e5e7eb] p-4 sm:p-6">
      <h2 className="text-xl font-bold">Shift notes</h2>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <label className="text-sm">Status <select aria-label="Shift note status filter" className="ml-2 rounded-lg border border-[#cccccd] bg-white p-2" value={filter} onChange={event => {setFilter(event.target.value as ShiftNoteComplianceArgs['stateGroup']); setCursors([undefined]);}}>
          <option value="unresolved">Unresolved</option><option value="submitted">Submitted</option><option value="approved">Approved</option><option value="inactive">Inactive</option><option value="all">All</option>
        </select></label>
        {(['startDate', 'endDate'] as const).map(key => <Popover key={key}><PopoverTrigger asChild><Button variant="outline">{key === 'startDate' ? 'From' : 'Through'}: {dates[key] ? format(dates[key]!, 'MMM d, yyyy') : 'Any date'}</Button></PopoverTrigger><PopoverContent className="w-auto bg-white p-0"><Calendar mode="single" selected={dates[key]} onSelect={date => {setDates(previous => ({...previous, [key]: date})); setCursors([undefined]);}} /></PopoverContent></Popover>)}
        <Button variant="outline" disabled={isFetching} onClick={() => void refetch()}>Refresh</Button>
      </div>
    </div>
    <div className="p-4 sm:p-6">
      {isFetching && !data ? <p role="status">Checking shift notes…</p> : null}
      {isError || data?.coverage === 'unavailable' ? <p role="alert">We couldn’t check these notes. Try again. <Button variant="outline" onClick={() => void refetch()}>Retry</Button></p> : null}
      {data?.coverage === 'disabled' ? <p>Shift-note monitoring is not enabled for this agency.</p> : null}
      {data?.coverage === 'checking' ? <p>We’re checking shifts. More notes may appear.</p> : null}
      {data?.coverage === 'paused' ? <p>Shift-note reminders are paused.</p> : null}
      {data && data.coverage !== 'disabled' ? <>
        <div className="divide-y divide-[#e5e5e6]">{data.items.map(item => <div key={item.shiftId} className="grid gap-2 py-4 md:grid-cols-[1fr_1fr_1fr_auto] md:items-center">
          <div><p className="font-semibold">{item.employeeName}</p><p className="text-sm text-[#808081]">{item.clientName}</p></div>
          <p className="text-sm">{civilDateLabel(item.serviceDate)}</p>
          <div><p>{shiftNoteLabels[item.state]}</p><p className="text-xs text-[#808081]">{item.checkedAt ? `Checked ${new Date(item.checkedAt).toLocaleString()}` : 'Not yet checked'}{isError ? ' — last checked result' : ''}</p>{item.syncStatus === 'pending' ? <p className="text-sm">Your change is saved. The list status is updating.</p> : null}{item.syncStatus === 'unavailable' ? <p>Note status unavailable</p> : null}</div>
          <Button variant="outline" className="rounded-full" onClick={() => setSelected(item.shiftId)}>Open shift note</Button>
        </div>)}</div>
        {!data.items.length && !isError ? <p className="py-4">{data.nextCursor ? 'No matching notes on this page.' : data.coverage === 'ready' ? (filter === 'unresolved' ? 'No unresolved shift notes in this view.' : 'No matching notes in this view.') : 'Shift-note checking is not complete.'}</p> : null}
        <div className="mt-3 flex gap-3"><Button variant="outline" disabled={cursors.length === 1 || isFetching} onClick={() => setCursors(previous => previous.slice(0, -1))}>Previous page</Button><Button variant="outline" disabled={!data.nextCursor || isFetching} onClick={() => setCursors(previous => [...previous, data.nextCursor!])}>Next page</Button></div>
      </> : null}
      {selected ? <><Button className="mt-4" variant="outline" onClick={() => setSelected(null)}>Close shift note</Button><ShiftNoteStatus key={selected} shiftId={selected} agencyId={agencyId} mode={mode} viewerId={viewerId} /></> : null}
    </div>
  </section>;
}
