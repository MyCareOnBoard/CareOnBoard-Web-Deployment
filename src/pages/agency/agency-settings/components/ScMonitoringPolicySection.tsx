import { useScMonitoringRefresh } from '@/hooks/useScMonitoringRefresh';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAssignmentReviewScope } from '@/hooks/useAssignmentReview';
import { useEffectiveAgencyMode } from '@/hooks/useEffectiveAgencyMode';
import { getScMonitoringPolicy, saveScMonitoringPolicy, listScMonitoringPolicyEvents, monitoringMethods, type MonitoringPolicyResponse, type MonitoringPolicyInput, type MonitoringPolicyEventPage } from '@/lib/api/sc-monitoring-policy';
import SettingsSectionCard from './SettingsSectionCard';
const draftOf = ({ policy }: MonitoringPolicyResponse): MonitoringPolicyInput => ({ expectedRevision: policy.revision, enabled: policy.enabled, intervalDays: policy.intervalDays, qualifyingMethods: [...policy.qualifyingMethods], requireDirectContact: policy.requireDirectContact, remindersEnabled: policy.remindersEnabled, changeReason: '' });
const statusOf = (error: unknown) => (error as { response?: { status?: number } })?.response?.status;
const label = (value: string) => value.replaceAll('_', ' ').replace(/^./, first => first.toUpperCase());
export default function ScMonitoringPolicySection({ agencyId }: { agencyId: string }) {
  const scope = useAssignmentReviewScope(); const mode = useEffectiveAgencyMode();
  return mode === 'sc' ? <PolicyEditor key={`${scope}:${agencyId}`} agencyId={agencyId} /> : null;
}
function PolicyEditor({ agencyId }: { agencyId: string }) {
  const [saved, setSaved] = useState<MonitoringPolicyResponse | null>(null);
  const [draft, setDraft] = useState<MonitoringPolicyInput | null>(null);
  const [latest, setLatest] = useState<MonitoringPolicyResponse | null>(null);
  const [conflict, setConflict] = useState(false); const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(''); const [history, setHistory] = useState<MonitoringPolicyEventPage | null>(null);
  const [historyError, setHistoryError] = useState(''); const [historyBusy, setHistoryBusy] = useState(false);
  const alive = useRef(true);
  const denied = (error: unknown) => [401, 403, 404].includes(statusOf(error) || 0);
  function clear() { setSaved(null); setDraft(null); setLatest(null); setHistory(null); setConflict(true); }
  async function load() {
    setBusy(true);
    try { const value = await getScMonitoringPolicy(agencyId); if (alive.current) { setSaved(value); setDraft(draftOf(value)); setMessage(''); setConflict(false); } }
    catch (error) { if (alive.current) { if (denied(error)) clear(); setMessage('Monitoring policy could not be loaded. Retry.'); } }
    finally { if (alive.current) setBusy(false); }
  }
  useEffect(() => { alive.current = true; const controller = new AbortController();
    getScMonitoringPolicy(agencyId, controller.signal).then(value => { if (!controller.signal.aborted) { setSaved(value); setDraft(draftOf(value)); } })
      .catch(error => { if (!controller.signal.aborted) { if (denied(error)) clear(); setMessage('Monitoring policy could not be loaded. Retry.'); } });
    return () => { alive.current = false; controller.abort(); };
  }, [agencyId]);
  const currentState = useRef({saved, draft, conflict}); currentState.current = {saved,draft,conflict};
  useScMonitoringRefresh({scopeKey:agencyId,timezone:saved?.timezone,enabled:Boolean(saved && !busy),refresh:async signal => {
    try { const value = await getScMonitoringPolicy(agencyId,signal); if (signal.aborted || !alive.current) return;
      const current = currentState.current;
      if (current.saved && current.draft && (current.conflict || JSON.stringify(current.draft) !== JSON.stringify(draftOf(current.saved)))) {
        setSaved(old => old && ({...old,timezone:value.timezone,canEditPolicy:value.canEditPolicy}));
        if (!value.canEditPolicy) { setHistory(null); setDraft(draftOf(value)); setSaved(value); setConflict(false); setLatest(null); }
        else if (value.policy.revision !== current.saved.policy.revision) { setConflict(true); setLatest(value); setMessage('Monitoring policy changed. Review the latest rules alongside your retained draft.'); }
      } else { setSaved(value); setDraft(draftOf(value)); setConflict(false); setLatest(null); }
    } catch (error) { if (!signal.aborted && alive.current) { if (denied(error)) clear(); setMessage('Could not refresh monitoring policy. Retry. Your draft is retained.'); } }
  }});
  async function loadLatest() {
    setBusy(true);
    try { const value = await getScMonitoringPolicy(agencyId); if (alive.current) setLatest(value); }
    catch (error) { if (alive.current) { if (denied(error)) clear(); setMessage('Latest policy unavailable. Your draft is retained; Save remains disabled. Retry loading the latest policy.'); } }
    finally { if (alive.current) setBusy(false); }
  }
  async function save() {
    if (!draft || !saved?.canEditPolicy || conflict) return;
    setBusy(true); setMessage('');
    try { const value = await saveScMonitoringPolicy(agencyId, draft); if (alive.current) { setSaved(value); setDraft(draftOf(value)); setHistory(null); setMessage('Monitoring policy saved.'); } }
    catch (error) { if (alive.current) {
      if (denied(error)) { clear(); setMessage('Your access changed. Reload the policy.'); }
      else if (statusOf(error) === 409) { setConflict(true); setLatest(null); setMessage('Monitoring policy changed. Load the latest rules, review your draft, and reapply changes.'); }
      else setMessage('Policy could not be saved. Your draft is still here.');
    } } finally { if (alive.current) setBusy(false); }
  }
  async function loadHistory(cursor?: string) {
    if (!saved?.canEditPolicy || historyBusy) return;
    setHistoryBusy(true); setHistoryError('');
    try { const value = await listScMonitoringPolicyEvents(agencyId, cursor); if (alive.current) setHistory(old => ({ ...value, items: cursor ? [...(old?.items || []), ...value.items] : value.items })); }
    catch (error) { if (alive.current) { if (denied(error)) clear(); setHistoryError('Policy history unavailable. Try loading it again.'); } }
    finally { if (alive.current) setHistoryBusy(false); }
  }
  let validTimezone = false;
  try { if (saved?.timezone) { new Intl.DateTimeFormat('en-US', { timeZone: saved.timezone }); validTimezone = true; } } catch { /* Explicit unavailable state below. */ }
  const disabled = busy || conflict || !saved?.canEditPolicy;
  return <SettingsSectionCard title="Support Coordination monitoring" subtitle="Saved independently of your agency profile">
    {message && <p role="status" className="text-sm">{message}</p>}
    {!saved && <Button type="button" variant="outline" disabled={busy} onClick={() => void load()}>Reload policy</Button>}
    {conflict && saved && <><Button type="button" variant="outline" disabled={busy} onClick={() => void loadLatest()}>Load latest policy</Button>
      {latest && <div className="space-y-2 text-sm"><p>Latest policy: {latest.policy.enabled ? 'Enabled' : 'Disabled'}, {latest.policy.intervalDays ?? 'No'} days, {latest.policy.qualifyingMethods.map(label).join(', ') || 'No methods'}, direct contact {latest.policy.requireDirectContact ? 'required' : 'optional'}, reminders {latest.policy.remindersEnabled ? 'on' : 'off'}. Review this alongside your retained draft below.</p>
        <Button type="button" disabled={busy || !latest.canEditPolicy} onClick={() => { setSaved(latest); setDraft(draftOf(latest)); setLatest(null); setConflict(false); }}>Use latest policy</Button>
        <Button type="button" disabled={busy || !latest.canEditPolicy} onClick={() => { setSaved(latest); setDraft(current => current && ({ ...current, expectedRevision: latest.policy.revision })); setLatest(null); setConflict(false); setMessage('Draft reapplied. Review your changes before saving.'); }}>Reapply my draft</Button></div>}</>}
    {saved && draft && <div className="space-y-4">
      {!saved.canEditPolicy && <p className="text-sm">Only the agency owner can change monitoring rules.</p>}
      {!validTimezone && <p role="alert" className="text-sm">Set a valid agency time zone before enabling monitoring schedules or reminders. <a href="#agency-timezone" className="underline">View agency time zone</a></p>}
      <p className="text-sm text-muted-foreground">Agency time zone: {saved.timezone || 'Not configured'}</p>
      <Checkbox label="Enable monitoring contact schedules" checked={draft.enabled} disabled={disabled || !validTimezone && !draft.enabled} onChange={event => setDraft({ ...draft, enabled: event.target.checked })} />
      <label className="block text-sm">Rolling interval (days)<Input type="number" min={1} max={365} step={1} disabled={disabled} value={draft.intervalDays ?? ''} onChange={event => setDraft({ ...draft, intervalDays: event.target.value === '' ? null : Number(event.target.value) })} /></label>
      <p className="text-sm text-muted-foreground">Enter the interval your agency uses, from 1 to 365 days.</p>
      <fieldset disabled={disabled} className="space-y-2"><legend className="text-sm font-medium">Contact methods that count</legend>{monitoringMethods.map(method => <Checkbox key={method} label={label(method)} checked={draft.qualifyingMethods.includes(method)} onChange={event => setDraft({ ...draft, qualifyingMethods: event.target.checked ? [...draft.qualifyingMethods, method] : draft.qualifyingMethods.filter(value => value !== method) })} />)}</fieldset>
      <Checkbox label="Require direct contact with the client" disabled={disabled} checked={draft.requireDirectContact} onChange={event => setDraft({ ...draft, requireDirectContact: event.target.checked })} />
      <Checkbox label="Send reminders to the assigned SC" disabled={disabled || !validTimezone && !draft.remindersEnabled} checked={draft.remindersEnabled} onChange={event => setDraft({ ...draft, remindersEnabled: event.target.checked })} />
      <p className="text-sm text-muted-foreground">Contact reminders appear in-app. Follow-up reminders can appear in-app and by email, based on the SC's notification preferences. Reminders are available even when contact scheduling is disabled.</p>
      <p className="text-sm text-muted-foreground">SCs may receive reminders for contacts and follow-ups already due. No push alerts are sent.</p>
      {saved.canEditPolicy && <><label className="block text-sm">Reason for this change<Textarea maxLength={2000} disabled={disabled} value={draft.changeReason} onChange={event => setDraft({ ...draft, changeReason: event.target.value })} /></label>
        {draft.enabled && <p className="text-sm">These rules apply to all active SC clients. Changing them may move contact deadlines or make a client overdue. Disabling and re-enabling keeps the original baseline.</p>}
        <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" disabled={busy} onClick={() => { setDraft(draftOf(latest || saved)); if (latest) setSaved(latest); const stillStale = conflict && !latest; setLatest(null); setConflict(stillStale); setMessage(stillStale ? 'Draft discarded. Load the latest policy before editing.' : ''); }}>Cancel changes</Button>
          <Button type="button" disabled={disabled || (draft.enabled || draft.remindersEnabled) && !validTimezone || draft.enabled && (!Number.isInteger(draft.intervalDays) || !draft.intervalDays || draft.intervalDays < 1 || draft.intervalDays > 365 || !draft.qualifyingMethods.length)} onClick={() => void save()}>{busy ? 'Saving…' : 'Save policy'}</Button></div>
        <Button type="button" variant="outline" disabled={historyBusy} onClick={() => void loadHistory()}>View policy history</Button>
        {historyError && <p role="alert">{historyError}</p>}{history && <div className="space-y-3">{history.items.length === 0 && <p>No policy changes yet.</p>}{history.items.map(event => <article key={event.eventId} className="rounded border p-3 text-sm"><p>{event.authorName} · {event.createdAt}</p><p>{event.changeReason}</p>{(['enabled', 'intervalDays', 'qualifyingMethods', 'requireDirectContact', 'remindersEnabled'] as const).filter(key => JSON.stringify(event.previousValues[key]) !== JSON.stringify(event.nextValues[key])).map(key => <p key={key}>{({ enabled: 'Schedule', intervalDays: 'Interval (days)', qualifyingMethods: 'Contact methods', requireDirectContact: 'Direct contact required', remindersEnabled: 'Reminders' })[key]}: {String(event.previousValues[key] ?? 'Not set')} → {String(event.nextValues[key] ?? 'Not set')}</p>)}</article>)}{history.nextCursor && <Button type="button" variant="outline" disabled={historyBusy} onClick={() => void loadHistory(history.nextCursor || undefined)}>Load older changes</Button>}</div>}</>}
    </div>}
  </SettingsSectionCard>;
}
