import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import type { ScFollowUp, ScFollowUpDetail, ScFollowUpUpdate, ScFollowUpEventPage } from '@/lib/api/sc-monitoring';
import { useScMonitoringRefresh } from '@/hooks/useScMonitoringRefresh';

const fields = ['action', 'responsiblePerson', 'priority', 'dueDate', 'status', 'outcome'] as const;
const draftOf = (value: ScFollowUp) => ({ action: value.action || '', responsiblePerson: value.responsiblePerson || '', priority: value.priority, dueDate: value.dueDate, status: value.status, outcome: value.outcome || '' });
const label = (value: string) => value.replaceAll('_', ' ');
export default function FollowUpEditor({ detail: initial, canEdit, agency = false, loadLatest, saveUpdate, loadEvents, onUnavailable, onSaved }: {
  detail: ScFollowUpDetail; canEdit: boolean; agency?: boolean; loadLatest: (signal?: AbortSignal) => Promise<ScFollowUpDetail>;
  saveUpdate: (input: ScFollowUpUpdate) => Promise<ScFollowUp & { revisionToken: string }>;
  loadEvents: (cursor: string, signal?: AbortSignal) => Promise<ScFollowUpEventPage>; onUnavailable: () => void; onSaved?: (value: ScFollowUpDetail) => void;
}) {
  const [saved, setSaved] = useState(initial); const [draft, setDraft] = useState(draftOf(initial));
  const [latest, setLatest] = useState<ScFollowUpDetail | null>(null); const [locked, setLocked] = useState(false);
  const [reason, setReason] = useState(''); const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false); const [paging, setPaging] = useState(false); const alive = useRef(true);
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
    if (locked || busy || !changed.length) return;
    if (draft.status === 'completed' && !draft.outcome.trim()) { setError('Add an outcome before completing this follow-up'); return; }
    if (planChanged && !reason.trim()) { setError('Add a reason for changing the follow-up plan.'); return; }
    const input: ScFollowUpUpdate = { revisionToken: saved.revisionToken, ...Object.fromEntries(changed.map(field => [field, draft[field]])), ...(planChanged ? { changeReason: reason.trim() } : {}) };
    setBusy(true); setError(''); setNotice('');
    try { const result = await saveUpdate(input); if (!alive.current) return;
      // A confirmed write immediately replaces the stale token, even if the history refresh fails.
      const current = { ...saved, ...draft, ...result }; adopt(current); setNotice('Follow-up updated.'); onSaved?.(current);
      try { const value = await loadLatest(); if (alive.current) adopt(value); } catch (caught) { if (alive.current) failed(caught, 'Follow-up updated. Latest activity could not load; refresh before another edit.'); }
    } catch (caught) { if (!alive.current) return;
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
  return <div className="mt-5 grid gap-5 text-[#17383b] lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]"><section className="rounded-xl border border-[#dce6e7] bg-white p-5">
    <h2 className="mb-4 text-lg font-semibold">Update follow-up</h2>
    {notice && <p role="status" className="mb-3 text-sm text-[#176853]">{notice}</p>}{error && <p role="alert" className="mb-3 text-sm text-[#ad283b]">{error}</p>}
    {!canEdit || ('canUpdateFollowUps' in saved && saved.canUpdateFollowUps === false) || saved.status === 'completed' ? <p>Status: {label(saved.status)}. Outcome: {saved.outcome || 'No outcome recorded.'}</p> : <form className="space-y-4" onSubmit={event => { event.preventDefault(); void submit(); }}>
      <label className="block text-sm font-semibold">Next action<textarea className="mt-1 min-h-24 w-full rounded-lg border p-3" disabled={busy} value={draft.action} maxLength={2000} required onChange={event => setDraft(value => ({ ...value, action: event.target.value }))} /></label>
      <label className="block text-sm font-semibold">Responsible person<input className="mt-1 h-10 w-full rounded-lg border px-3" disabled={busy} value={draft.responsiblePerson} maxLength={200} onChange={event => setDraft(value => ({ ...value, responsiblePerson: event.target.value }))} /><small className="font-normal">Informational; this does not assign a task.</small></label>
      <label className="block text-sm font-semibold">Due date<input type="date" className="mt-1 h-10 w-full rounded-lg border px-3" required disabled={busy} value={draft.dueDate} onChange={event => setDraft(value => ({ ...value, dueDate: event.target.value }))} /></label>
      <label className="block text-sm font-semibold">Priority<select className="mt-1 h-10 w-full rounded-lg border px-3" disabled={busy} value={draft.priority} onChange={event => setDraft(value => ({ ...value, priority: event.target.value as ScFollowUp['priority'] }))}>{['routine','significant','urgent'].map(value => <option key={value} value={value}>{label(value)}</option>)}</select></label>
      {saved.overdue && draft.dueDate > saved.dueDate && <p className="text-sm text-[#9d6500]">Changing the due date changes its overdue status. The previous date and your reason will remain in history.</p>}
      {draft.priority === 'urgent' && <p className="text-sm text-[#9d3039]">Urgent follow-up. Follow your agency's escalation process now. Saving does not send an immediate alert.</p>}
      {agency ? <label className="block text-sm font-semibold">Status<select className="mt-1 h-10 w-full rounded-lg border px-3" disabled={busy} value={draft.status} onChange={event => setDraft(value => ({ ...value, status: event.target.value as ScFollowUp['status'] }))}><option value="open">Open</option><option value="in_progress">In progress</option><option value="completed">Completed</option></select></label> : <div role="group" aria-label="Follow-up status" className="flex flex-wrap gap-2">{(['open','in_progress','completed'] as const).map(value => <Button key={value} type="button" variant="outline" disabled={busy} aria-pressed={draft.status === value} onClick={() => setDraft(current => ({ ...current, status: value }))}>{value === 'in_progress' ? 'In progress' : value[0].toUpperCase() + value.slice(1)}</Button>)}</div>}
      <label className="block text-sm font-semibold">Outcome note<textarea className="mt-1 min-h-24 w-full rounded-lg border p-3" aria-label="Outcome note" disabled={busy} value={draft.outcome} maxLength={2000} onChange={event => setDraft(value => ({ ...value, outcome: event.target.value }))} /><small className="font-normal">Required when completing. Completion cannot be undone.</small></label>
      {planChanged && <label className="block text-sm font-semibold">Reason for change<textarea className="mt-1 w-full rounded-lg border p-3" required maxLength={2000} disabled={busy} value={reason} onChange={event => setReason(event.target.value)} /></label>}
      <div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" disabled={busy} onClick={() => { setDraft(draftOf(saved)); setReason(''); setError(locked ? 'Load the latest follow-up before saving.' : ''); }}>Cancel</Button><Button type="submit" disabled={busy || locked || !changed.length}>{busy ? 'Saving…' : 'Save update'}</Button></div>
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
