import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerField } from '@/pages/shared/client-management/components/forms/formControls';
import { format, parseISO } from 'date-fns';
import { Loader2 } from 'lucide-react';
import VoiceEnabledTextarea from '@/components/VoiceEnabledTextarea';
import VoiceInputButton from '@/components/VoiceInputButton';
import { VoiceRecordingProvider, useVoiceRecording } from '@/contexts/VoiceRecordingContext';
import { useToast } from '@/hooks/use-toast';
import type { ScFollowUp, ScFollowUpDetail, ScFollowUpUpdate, ScFollowUpEventPage } from '@/lib/api/sc-monitoring';
import { useScMonitoringRefresh } from '@/hooks/useScMonitoringRefresh';

const fields = ['action', 'responsiblePerson', 'priority', 'dueDate', 'status', 'outcome'] as const;
const draftOf = (value: ScFollowUp) => ({ action: value.action || '', responsiblePerson: value.responsiblePerson || '', priority: value.priority, dueDate: value.dueDate, status: value.status, outcome: value.outcome || '' });
const label = (value: string) => value.replaceAll('_', ' ');
type FollowUpEditorProps = {
  detail: ScFollowUpDetail; canEdit: boolean; agency?: boolean; loadLatest: (signal?: AbortSignal) => Promise<ScFollowUpDetail>;
  saveUpdate: (input: ScFollowUpUpdate) => Promise<ScFollowUp & { revisionToken: string }>;
  loadEvents: (cursor: string, signal?: AbortSignal) => Promise<ScFollowUpEventPage>; onUnavailable: () => void; onSaved?: (value: ScFollowUpDetail) => void;
};
export default function FollowUpEditor(props: FollowUpEditorProps) {
  return <VoiceRecordingProvider pageTitle="SC monitoring follow-up"><Editor {...props} /><VoiceInputButton /></VoiceRecordingProvider>;
}
function Editor({ detail: initial, canEdit, agency = false, loadLatest, saveUpdate, loadEvents, onUnavailable, onSaved }: FollowUpEditorProps) {
  const { toast } = useToast();
  const { stopRecording } = useVoiceRecording();
  const [saved, setSaved] = useState(initial); const [draft, setDraft] = useState(draftOf(initial));
  const [latest, setLatest] = useState<ScFollowUpDetail | null>(null); const [locked, setLocked] = useState(false);
  const [reason, setReason] = useState(''); const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false); const [paging, setPaging] = useState(false); const alive = useRef(true);
  const readOnly = !canEdit || ('canUpdateFollowUps' in saved && saved.canUpdateFollowUps === false) || saved.status === 'completed';
  useEffect(() => { if (busy || locked || readOnly) stopRecording(); }, [busy, locked, readOnly, stopRecording]);
  const eventsController = useRef<AbortController | null>(null);
  useEffect(() => { alive.current = true; return () => { alive.current = false; eventsController.current?.abort(); }; }, []);
  const changed = fields.filter(field => draft[field] !== draftOf(saved)[field]);
  const currentState = useRef({dirty: false, locked: false}); currentState.current = {dirty: changed.length > 0, locked};
  const planChanged = changed.some(field => ['action', 'responsiblePerson', 'priority', 'dueDate'].includes(field));
  const adopt = (value: ScFollowUpDetail) => { setSaved(value); setDraft(draftOf(value)); setLatest(null); setLocked(false); setReason(''); setError(''); };
  const failed = (caught: unknown, text: string) => { if (axios.isAxiosError(caught) && [401,403,404].includes(caught.response?.status || 0)) onUnavailable(); else setError(text); };
  const refresh = async (signal?: AbortSignal) => {
    try { const value = await loadLatest(signal); if (signal?.aborted || !alive.current) return;
      if (currentState.current.dirty || currentState.current.locked) { setLatest(value); if (value.revisionToken !== saved.revisionToken) { setLocked(true); setError('This follow-up changed while you were viewing it. Review the latest details and try again.'); } }
      else adopt(value);
    } catch (caught) { if (!signal?.aborted && alive.current) failed(caught, 'Could not load this follow-up. Your draft is still here.'); }
  };
  useScMonitoringRefresh({ scopeKey: initial.followUpId, refresh, enabled: !busy });
  const submit = async () => {
    if (locked || busy || readOnly || !changed.length) return;
    if (!draft.action.trim() || !draft.dueDate) { setError('Add a next action and due date before saving.'); return; }
    if (draft.status === 'completed' && !draft.outcome.trim()) { setError('Add an outcome before completing this follow-up'); return; }
    if (planChanged && !reason.trim()) { setError('Add a reason for changing the follow-up plan.'); return; }
    const input: ScFollowUpUpdate = { revisionToken: saved.revisionToken, ...Object.fromEntries(changed.map(field => [field, draft[field]])), ...(planChanged ? { changeReason: reason.trim() } : {}) };
    stopRecording(); setBusy(true); setError(''); setNotice('');
    try { const result = await saveUpdate(input); if (!alive.current) return;
      // A confirmed write immediately replaces the stale token, even if the history refresh fails.
      const current = { ...saved, ...draft, ...result }; adopt(current); setNotice('Follow-up updated.');
      toast({ title: 'Follow-up saved', description: draft.status === 'completed' ? 'The outcome has been recorded and the follow-up is complete.' : 'Your follow-up changes have been saved.', variant: 'success' });
      try { onSaved?.(current); } catch { toast({ title: 'Follow-up saved; refresh needed', description: 'Refresh monitoring to see the latest details.', variant: 'warning' }); }
      try { const value = await loadLatest(); if (alive.current) adopt(value); } catch (caught) { if (alive.current) { failed(caught, 'Follow-up updated. Latest activity could not load; refresh before another edit.'); toast({ title: 'Follow-up saved; refresh needed', description: 'Latest activity could not load. Refresh before another edit.', variant: 'warning' }); } }
    } catch (caught) { if (!alive.current) return;
      const unavailable = axios.isAxiosError(caught) && [401,403,404].includes(caught.response?.status || 0);
      const conflict = axios.isAxiosError(caught) && caught.response?.status === 409;
      const unknownResult = !axios.isAxiosError(caught) || !caught.response || caught.response.status >= 500;
      toast({ title: unknownResult ? 'Check whether the follow-up was saved' : 'Follow-up could not be saved', description: unavailable ? 'Your access changed. Return to monitoring.' : conflict ? 'This follow-up changed. Review the latest details before reapplying your draft.' : unknownResult ? 'The save result could not be confirmed. Load the latest details before retrying; your draft is retained.' : 'Could not save this update. Your changes are still here.', variant: 'destructive' });
      if (axios.isAxiosError(caught) && caught.response?.status === 409) { setLocked(true); setError('This follow-up changed while you were viewing it. Review the latest details and try again.'); await refresh(); }
      else { if (!axios.isAxiosError(caught) || !caught.response || caught.response.status >= 500) setLocked(true); failed(caught, 'Could not save this update. Your changes are still here. Refresh the latest details before retrying.'); }
    } finally { if (alive.current) setBusy(false); }
  };
  const older = async () => {
    if (!saved.nextEventCursor || paging) return; const controller = new AbortController(); eventsController.current = controller; setPaging(true);
    try { const page = await loadEvents(saved.nextEventCursor, controller.signal); if (!controller.signal.aborted && alive.current) setSaved(value => ({ ...value, events: [...value.events, ...page.items.filter(item => !value.events.some(old => old.eventId === item.eventId))], nextEventCursor: page.nextCursor })); }
    catch (caught) { if (!controller.signal.aborted && alive.current) failed(caught, 'Could not load older activity. Try again.'); }
    finally { if (alive.current) setPaging(false); }
  };
  return <div className="mt-5 grid gap-5 text-[#17383b] lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] [&_input:focus-visible]:border-[#00b4b8] [&_input:focus-visible]:ring-0 [&_textarea:focus-visible]:border-[#00b4b8] [&_textarea:focus-visible]:ring-0 [&_[data-slot=input-group]:focus-within]:border-[#00b4b8] [&_[data-slot=input-group]:focus-within]:ring-0 [&_button:focus-visible]:ring-[#00b4b8]/25 [&_button:focus-visible]:ring-offset-0"><section className="rounded-xl border border-[#dce6e7] bg-white p-5">
    <h2 className="mb-4 text-lg font-semibold">Update follow-up</h2>
    {notice && <p role="status" className="mb-3 text-sm text-[#176853]">{notice}</p>}{error && <p role="alert" className="mb-3 text-sm text-[#ad283b]">{error}</p>}
    {readOnly ? <p>Status: {label(saved.status)}. Outcome: {saved.outcome || 'No outcome recorded.'}</p> : <form className="space-y-4" onSubmit={event => { event.preventDefault(); void submit(); }}>
      <div className="space-y-1"><Label htmlFor={`follow-up-action-${initial.followUpId}`}>Next action</Label><VoiceEnabledTextarea id={`follow-up-action-${initial.followUpId}`} fieldName="Follow-up next action" className="min-h-24" disabled={busy || locked} value={draft.action} maxLength={2000} required onChange={action => setDraft(value => ({ ...value, action: action.slice(0, 2000) }))} /></div>
      <label className="block text-sm font-semibold">Responsible person<Input className="mt-1" disabled={busy || locked} value={draft.responsiblePerson} maxLength={200} onChange={event => setDraft(value => ({ ...value, responsiblePerson: event.target.value }))} /><small className="font-normal">Informational; this does not assign a task.</small></label>
      <fieldset disabled={busy || locked}><DatePickerField id={`follow-up-date-${initial.followUpId}`} label="Due date" required value={draft.dueDate ? parseISO(draft.dueDate) : undefined} onChange={date => setDraft(value => ({ ...value, dueDate: date ? format(date, 'yyyy-MM-dd') : '' }))} /></fieldset>
      <div className="space-y-1"><Label htmlFor={`follow-up-priority-${initial.followUpId}`}>Priority</Label><Select disabled={busy || locked} value={draft.priority} onValueChange={priority => setDraft(value => ({ ...value, priority: priority as ScFollowUp['priority'] }))}><SelectTrigger id={`follow-up-priority-${initial.followUpId}`} className="w-full"><SelectValue /></SelectTrigger><SelectContent>{['routine','significant','urgent'].map(value => <SelectItem key={value} value={value}>{label(value)}</SelectItem>)}</SelectContent></Select></div>
      {saved.overdue && draft.dueDate > saved.dueDate && <p className="text-sm text-[#9d6500]">Changing the due date changes its overdue status. The previous date and your reason will remain in history.</p>}
      {draft.priority === 'urgent' && <p className="text-sm text-[#9d3039]">Urgent follow-up. Follow your agency's escalation process now. Saving does not send an immediate alert.</p>}
      {agency ? <div className="space-y-1"><Label htmlFor={`follow-up-status-${initial.followUpId}`}>Status</Label><Select disabled={busy || locked} value={draft.status} onValueChange={status => setDraft(value => ({ ...value, status: status as ScFollowUp['status'] }))}><SelectTrigger id={`follow-up-status-${initial.followUpId}`} className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="open">Open</SelectItem><SelectItem value="in_progress">In progress</SelectItem><SelectItem value="completed">Completed</SelectItem></SelectContent></Select></div> : <div role="group" aria-label="Follow-up status" className="flex flex-wrap gap-2">{(['open','in_progress','completed'] as const).map(value => <Button key={value} type="button" variant="outline" disabled={busy || locked} aria-pressed={draft.status === value} onClick={() => setDraft(current => ({ ...current, status: value }))}>{value === 'in_progress' ? 'In progress' : value[0].toUpperCase() + value.slice(1)}</Button>)}</div>}
      <div className="space-y-1"><Label htmlFor={`follow-up-outcome-${initial.followUpId}`}>Outcome note</Label><VoiceEnabledTextarea id={`follow-up-outcome-${initial.followUpId}`} fieldName="Follow-up outcome note" className="min-h-24" disabled={busy || locked} value={draft.outcome} maxLength={2000} onChange={outcome => setDraft(value => ({ ...value, outcome: outcome.slice(0, 2000) }))} /><small>Required when completing. Completion cannot be undone.</small></div>
      {planChanged && <div className="space-y-1"><Label htmlFor={`follow-up-reason-${initial.followUpId}`}>Reason for change</Label><VoiceEnabledTextarea id={`follow-up-reason-${initial.followUpId}`} fieldName="Follow-up reason for change" required maxLength={2000} disabled={busy || locked} value={reason} onChange={value => setReason(value.slice(0, 2000))} /></div>}
      <div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" disabled={busy} onClick={() => { setDraft(draftOf(saved)); setReason(''); setError(locked ? 'Load the latest follow-up before saving.' : ''); }}>Cancel</Button><Button type="submit" disabled={busy || locked || !changed.length} aria-busy={busy}>{busy ? <><Loader2 className="size-4 motion-safe:animate-spin" aria-hidden="true" />Saving…</> : 'Save update'}</Button></div>
    </form>}
    {(locked || error) && <Button className="mt-3" variant="outline" onClick={() => void refresh()}>Load latest follow-up</Button>}
    {latest && locked && <div className="mt-4 space-y-3 rounded-lg border p-3"><h3 className="font-semibold">Latest details</h3>{fields.map(field => <p key={field} className="whitespace-pre-wrap text-sm">{label(field)}: {String(latest[field] || '—')}</p>)}<Button variant="outline" onClick={() => adopt(latest)}>Use latest details</Button>{latest.status !== 'completed' && <Button variant="outline" onClick={() => { setSaved(latest); setLatest(null); setLocked(false); setError('Review your draft against the latest details, then save.'); }}>Reapply my draft</Button>}</div>}
  </section><section className="rounded-xl border border-[#dce6e7] bg-white p-5"><h2 className="mb-4 text-lg font-semibold">Activity</h2><FollowUpActivity detail={saved} />{saved.nextEventCursor && <Button className="mt-4" variant="outline" disabled={paging} onClick={() => void older()}>{paging ? 'Loading…' : 'Load older activity'}</Button>}<p className="mt-4 text-sm">Follow-up dates are separate from the next monitoring contact.</p></section></div>;
}
export function FollowUpActivity({ detail }: { detail: ScFollowUpDetail }) {
  return <ol className="space-y-4">{detail.events.length ? detail.events.map(event => <li className="border-l-2 border-[#a8d8d8] pl-3 text-sm" key={event.eventId}>
    {event.changedFields?.length ? event.changedFields.map(field => <p key={field} className="whitespace-pre-wrap">{label(field)}: {String(event.previousValues?.[field as keyof ScFollowUp] ?? '—')} → {String(event.nextValues?.[field as keyof ScFollowUp] ?? '—')}</p>) : <><strong>{label(event.previousStatus)} → {label(event.status)}</strong><p>{event.previousOutcome ? `Previous: ${event.previousOutcome}. ` : ''}{event.outcome || 'No outcome note'}</p></>}
    {event.changeReason && <p className="mt-1 whitespace-pre-wrap">Reason: {event.changeReason}</p>}<p className="mt-2 text-xs text-[#647b7e]">{event.authorName} · {event.authorRole && label(event.authorRole)} · {new Date(event.createdAt).toLocaleString()}</p>
  </li>) : <li>Follow-up created · {detail.authorName} · {new Date(detail.createdAt).toLocaleString()}</li>}</ol>;
}
