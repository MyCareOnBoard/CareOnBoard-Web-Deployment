import { useScMonitoringRefresh } from '@/hooks/useScMonitoringRefresh';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, Settings, X } from 'lucide-react';
import { Link } from 'react-router';
import { Routes } from '@/routes/constants';
import VoiceEnabledTextarea from '@/components/VoiceEnabledTextarea';
import VoiceInputButton from '@/components/VoiceInputButton';
import { VoiceRecordingProvider, useVoiceRecording } from '@/contexts/VoiceRecordingContext';
import { useAssignmentReviewScope } from '@/hooks/useAssignmentReview';
import { useEffectiveAgencyMode } from '@/hooks/useEffectiveAgencyMode';
import { useToast } from '@/hooks/use-toast';
import { getScMonitoringPolicy, saveScMonitoringPolicy, listScMonitoringPolicyEvents, monitoringMethods, type MonitoringPolicyResponse, type MonitoringPolicyInput, type MonitoringPolicyEventPage } from '@/lib/api/sc-monitoring-policy';
const draftOf = ({ policy, source, overrideRevision, agencyRevision }: MonitoringPolicyResponse): MonitoringPolicyInput => ({ expectedRevision: overrideRevision ?? policy.revision, enabled: policy.enabled, intervalDays: policy.intervalDays, qualifyingMethods: [...policy.qualifyingMethods], requireDirectContact: policy.requireDirectContact, remindersEnabled: policy.remindersEnabled, changeReason: '', ...(source ? { useAgencyPolicy: source === 'agency', expectedAgencyRevision: agencyRevision } : {}) });
const statusOf = (error: unknown) => (error as { response?: { status?: number } })?.response?.status;
const label = (value: string) => value.replaceAll('_', ' ').replace(/^./, first => first.toUpperCase());
export default function ScMonitoringSettingsModal({ agencyId, clientId, onSaved }: { agencyId: string; clientId?: string; onSaved?: () => void }) {
  const scope = useAssignmentReviewScope(); const mode = useEffectiveAgencyMode();
  const [open, setOpen] = useState(false);
  if (mode !== 'sc') return null;
  return <Dialog key={`${scope}:${agencyId}:${clientId || ''}`} open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><Button variant="outline" size="icon" className="size-[52px] shrink-0 p-0 hover:border-[#00b4b8] hover:bg-[#e6f7f8] hover:text-[#008f93] focus-visible:ring-[#00b4b8]/25 focus-visible:ring-offset-0" aria-label="Monitoring Settings" title="Monitoring Settings" disabled={!agencyId && !clientId}><Settings className="h-5 w-5" aria-hidden="true" /></Button></DialogTrigger>
    {open && <VoiceRecordingProvider pageTitle="SC monitoring settings"><PolicyEditor agencyId={agencyId} clientId={clientId} onSaved={onSaved} onClose={() => setOpen(false)} /></VoiceRecordingProvider>}
  </Dialog>;
}
function PolicyEditor({ agencyId, clientId, onSaved, onClose }: { agencyId: string; clientId?: string; onSaved?: () => void; onClose: () => void }) {
  const { toast } = useToast();
  const { stopRecording } = useVoiceRecording();
  const [saved, setSaved] = useState<MonitoringPolicyResponse | null>(null);
  const [draft, setDraft] = useState<MonitoringPolicyInput | null>(null);
  const [latest, setLatest] = useState<MonitoringPolicyResponse | null>(null);
  const [conflict, setConflict] = useState(false); const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(''); const [history, setHistory] = useState<MonitoringPolicyEventPage | null>(null);
  const [historyError, setHistoryError] = useState(''); const [historyBusy, setHistoryBusy] = useState(false);
  const alive = useRef(true);
  const denied = (error: unknown) => [401, 403, 404].includes(statusOf(error) || 0);
  function clear() { setSaved(null); setDraft(null); setLatest(null); setHistory(null); setConflict(true); }
  async function load() {
    setBusy(true);
    try { const value = await getScMonitoringPolicy(agencyId, undefined, clientId); if (alive.current) { setSaved(value); setDraft(draftOf(value)); setMessage(''); setConflict(false); } }
    catch (error) { if (alive.current) { if (denied(error)) clear(); setMessage('Monitoring policy could not be loaded. Retry.'); } }
    finally { if (alive.current) setBusy(false); }
  }
  useEffect(() => { alive.current = true; const controller = new AbortController();
    getScMonitoringPolicy(agencyId, controller.signal, clientId).then(value => { if (!controller.signal.aborted) { setSaved(value); setDraft(draftOf(value)); } })
      .catch(error => { if (!controller.signal.aborted) { if (denied(error)) clear(); setMessage('Monitoring policy could not be loaded. Retry.'); } });
    return () => { alive.current = false; controller.abort(); };
  }, [agencyId, clientId]);
  const currentState = useRef({saved, draft, conflict}); currentState.current = {saved,draft,conflict};
  useScMonitoringRefresh({scopeKey:`${agencyId}:${clientId || ''}`,timezone:saved?.timezone,enabled:Boolean(saved && !busy),refresh:async signal => {
    try { const value = await getScMonitoringPolicy(agencyId,signal,clientId); if (signal.aborted || !alive.current) return;
      const current = currentState.current;
      if (current.saved && current.draft && (current.conflict || JSON.stringify(current.draft) !== JSON.stringify(draftOf(current.saved)))) {
        setSaved(old => old && ({...old,timezone:value.timezone,canEditPolicy:value.canEditPolicy}));
        if (!value.canEditPolicy) { setHistory(null); setDraft(draftOf(value)); setSaved(value); setConflict(false); setLatest(null); }
        else if (value.policy.revision !== current.saved.policy.revision || value.overrideRevision !== current.saved.overrideRevision || value.source !== current.saved.source || value.source === 'agency' && value.agencyRevision !== current.saved.agencyRevision) { setConflict(true); setLatest(value); setMessage('Monitoring policy changed. Review the latest rules alongside your retained draft.'); }
      } else { setSaved(value); setDraft(draftOf(value)); setConflict(false); setLatest(null); }
    } catch (error) { if (!signal.aborted && alive.current) { if (denied(error)) clear(); setMessage('Could not refresh monitoring policy. Retry. Your draft is retained.'); } }
  }});
  async function loadLatest() {
    setBusy(true);
    try { const value = await getScMonitoringPolicy(agencyId, undefined, clientId); if (alive.current) setLatest(value); }
    catch (error) { if (alive.current) { if (denied(error)) clear(); setMessage('Latest policy unavailable. Your draft is retained; Save remains disabled. Retry loading the latest policy.'); } }
    finally { if (alive.current) setBusy(false); }
  }
  async function save() {
    if (!draft || !saved?.canEditPolicy || conflict) return;
    setBusy(true); setSaving(true); setMessage('');
    const input = clientId && draft.useAgencyPolicy ? { ...draftOf(saved), useAgencyPolicy: true, changeReason: draft.changeReason } : draft;
    try { const value = await (clientId ? saveScMonitoringPolicy(agencyId, input, clientId) : saveScMonitoringPolicy(agencyId, input)); if (alive.current) { setSaved(value); setDraft(draftOf(value)); setHistory(null); setMessage('Monitoring policy saved.'); onSaved?.(); toast({ title: 'Monitoring settings saved', description: clientId ? 'This client’s monitoring rules and reminder settings have been updated.' : 'Your agency’s monitoring rules and reminder settings have been updated.', variant: 'success' }); } }
    catch (error) { if (alive.current) {
      const saveError = denied(error) ? 'Your access changed. Reload the policy.' : statusOf(error) === 409
        ? 'Monitoring policy changed. Load the latest rules, review your draft, and reapply changes.'
        : 'Policy could not be saved. Your draft is still here.';
      if (denied(error)) clear();
      else if (statusOf(error) === 409) { setConflict(true); setLatest(null); }
      setMessage(saveError);
      toast({ title: 'Monitoring settings could not be saved', description: saveError, variant: 'destructive' });
    } } finally { if (alive.current) { setBusy(false); setSaving(false); } }
  }
  async function loadHistory(cursor?: string) {
    if (!saved?.canEditPolicy || historyBusy) return;
    setHistoryBusy(true); setHistoryError('');
    try { const value = await listScMonitoringPolicyEvents(agencyId, cursor, undefined, clientId); if (alive.current) setHistory(old => ({ ...value, items: cursor ? [...(old?.items || []), ...value.items] : value.items })); }
    catch (error) { if (alive.current) { if (denied(error)) clear(); setHistoryError('Policy history unavailable. Try loading it again.'); } }
    finally { if (alive.current) setHistoryBusy(false); }
  }
  let validTimezone = false;
  try { if (saved?.timezone) { new Intl.DateTimeFormat('en-US', { timeZone: saved.timezone }); validTimezone = true; } } catch { /* Explicit unavailable state below. */ }
  const disabled = busy || conflict || !saved?.canEditPolicy;
  const rulesDisabled = disabled || Boolean(clientId && draft?.useAgencyPolicy);
  useEffect(() => { if (disabled) stopRecording(); }, [disabled, stopRecording]);
  return <DialogContent showCloseButton={false}
    className="left-auto right-4 flex max-h-[90dvh] w-[calc(100vw-32px)] max-w-[500px] translate-x-0 flex-col rounded-[30px] border border-white/30 bg-white shadow-xl sm:right-8 [&_button:focus-visible]:ring-[#00b4b8]/25 [&_button:focus-visible]:ring-offset-0"
    onEscapeKeyDown={event => { if (busy) event.preventDefault(); }} onInteractOutside={event => { if (busy) event.preventDefault(); }}>
    <header className="flex shrink-0 items-start justify-between gap-4 p-5 pb-4">
      <div><DialogTitle className="text-[20px] font-medium leading-[1.6]">Monitoring Settings</DialogTitle><DialogDescription className="mt-1 text-sm">{clientId ? 'Set monitoring contact rules and reminders for this client. Client settings override agency settings.' : 'Set monitoring contact rules and reminders for your agency.'}</DialogDescription></div>
      <Button type="button" variant="ghost" size="icon-sm" className="shrink-0 bg-[#eff2f3]" aria-label="Close monitoring settings" disabled={busy} onClick={onClose}><X className="size-4" /></Button>
    </header>
    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 pb-5">
    {message && <p role="status" className="text-sm">{message}</p>}
    {!saved && <Button type="button" variant="outline" disabled={busy} onClick={() => void load()}>Reload policy</Button>}
    {conflict && saved && <><Button type="button" variant="outline" disabled={busy} onClick={() => void loadLatest()}>Load latest policy</Button>
      {latest && <div className="space-y-2 text-sm"><p>Latest policy: {latest.policy.enabled ? 'Enabled' : 'Disabled'}, {latest.policy.intervalDays ?? 'No'} days, {latest.policy.qualifyingMethods.map(label).join(', ') || 'No methods'}, direct contact {latest.policy.requireDirectContact ? 'required' : 'optional'}, reminders {latest.policy.remindersEnabled ? 'on' : 'off'}. Review this alongside your retained draft below.</p>
        <Button type="button" disabled={busy || !latest.canEditPolicy} onClick={() => { setSaved(latest); setDraft(draftOf(latest)); setLatest(null); setConflict(false); }}>Use latest policy</Button>
        <Button type="button" disabled={busy || !latest.canEditPolicy} onClick={() => { setSaved(latest); setDraft(current => current && ({ ...current, expectedRevision: latest.overrideRevision ?? latest.policy.revision, ...(clientId ? { expectedAgencyRevision: latest.agencyRevision } : {}) })); setLatest(null); setConflict(false); setMessage('Draft reapplied. Review your changes before saving.'); }}>Reapply my draft</Button></div>}</>}
    {saved && draft && <div className="space-y-4">
      {!saved.canEditPolicy && <p className="text-sm">Only the agency owner can change monitoring rules.</p>}
      {!validTimezone && <p role="alert" className="text-sm">Set a valid agency time zone before enabling monitoring schedules or reminders. <Link to={`${Routes.agency.agencySettings}?tab=agencyInfo#agency-timezone`} className="underline" onClick={onClose}>View agency time zone</Link></p>}
      <p className="text-sm text-muted-foreground">Agency time zone: {saved.timezone || 'Not configured'}</p>
      {clientId && <><p role="status" className="text-sm">{saved.source === 'client' ? 'This client uses its own monitoring settings.' : 'This client uses agency monitoring settings.'}</p><Checkbox label="Use client-specific settings" checked={!draft.useAgencyPolicy} disabled={disabled} onChange={event => setDraft({ ...draft, useAgencyPolicy: !event.target.checked })} /><p className="text-sm text-muted-foreground">Turn this off and save to use the agency settings again.</p></>}
      <Checkbox label="Enable monitoring contact schedules" checked={draft.enabled} disabled={rulesDisabled || !validTimezone && !draft.enabled} onChange={event => setDraft({ ...draft, enabled: event.target.checked })} />
      <label className="block text-sm">Rolling interval (days)<Input type="number" className="focus-visible:border-[#00b4b8] focus-visible:ring-0" min={1} max={365} step={1} disabled={rulesDisabled} value={draft.intervalDays ?? ''} onChange={event => setDraft({ ...draft, intervalDays: event.target.value === '' ? null : Number(event.target.value) })} /></label>
      <p className="text-sm text-muted-foreground">Enter a monitoring interval from 1 to 365 days.</p>
      <fieldset disabled={rulesDisabled} className="space-y-3"><legend className="text-sm font-medium">Contact methods that count</legend><div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">{monitoringMethods.map(method => <Checkbox key={method} label={label(method)} checked={draft.qualifyingMethods.includes(method)} onChange={event => setDraft({ ...draft, qualifyingMethods: event.target.checked ? [...draft.qualifyingMethods, method] : draft.qualifyingMethods.filter(value => value !== method) })} />)}</div></fieldset>
      <Checkbox label="Require direct contact with the client" disabled={rulesDisabled} checked={draft.requireDirectContact} onChange={event => setDraft({ ...draft, requireDirectContact: event.target.checked })} />
      <Checkbox label="Send reminders to the assigned SC" disabled={rulesDisabled || !validTimezone && !draft.remindersEnabled} checked={draft.remindersEnabled} onChange={event => setDraft({ ...draft, remindersEnabled: event.target.checked })} />
      <p className="text-sm text-muted-foreground">Contact reminders appear in-app. Follow-up reminders can appear in-app and by email, based on the SC's notification preferences. Reminders are available even when contact scheduling is disabled.</p>
      <p className="text-sm text-muted-foreground">SCs may receive reminders for contacts and follow-ups already due. No push alerts are sent.</p>
      {saved.canEditPolicy && <><div className="space-y-2"><Label htmlFor="sc-monitoring-change-reason">Reason for this change</Label><VoiceEnabledTextarea id="sc-monitoring-change-reason" className="focus-visible:border-[#00b4b8] focus-visible:ring-0" fieldName="Monitoring policy change reason" pageTitle="SC monitoring settings" rows={4} placeholder="Explain why these rules are changing" disabled={disabled} value={draft.changeReason} onChange={value => setDraft(current => current && ({ ...current, changeReason: value.slice(0, 2000) }))} /></div>
        {draft.enabled && <p className="text-sm">{clientId ? 'Client settings apply only to this client.' : 'Agency settings apply to active SC clients without client overrides.'} Changing them may move contact deadlines or make a client overdue. Disabling and re-enabling keeps the original baseline.</p>}
        {historyError && <p role="alert">{historyError}</p>}{history && <div className="space-y-3">{history.items.length === 0 && <p>No policy changes yet.</p>}{history.items.map(event => <article key={event.eventId} className="rounded border p-3 text-sm"><p>{event.authorName} · {event.createdAt}</p><p>{event.changeReason}</p>{clientId && <p>{event.useAgencyPolicy ? 'Use agency settings' : 'Use client settings'}</p>}{(['enabled', 'intervalDays', 'qualifyingMethods', 'requireDirectContact', 'remindersEnabled'] as const).filter(key => JSON.stringify(event.previousValues[key]) !== JSON.stringify(event.nextValues[key])).map(key => <p key={key}>{({ enabled: 'Schedule', intervalDays: 'Interval (days)', qualifyingMethods: 'Contact methods', requireDirectContact: 'Direct contact required', remindersEnabled: 'Reminders' })[key]}: {String(event.previousValues[key] ?? 'Not set')} → {String(event.nextValues[key] ?? 'Not set')}</p>)}</article>)}{history.nextCursor && <Button type="button" variant="outline" disabled={historyBusy} onClick={() => void loadHistory(history.nextCursor || undefined)}>Load older changes</Button>}</div>}</>}
    </div>}
    </div>
    {saved?.canEditPolicy && draft && <footer className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t px-5 py-4">
      <Button type="button" variant="outline" disabled={historyBusy || busy} onClick={() => void loadHistory()}>View policy history</Button>
      <Button type="button" className="ml-auto" aria-busy={saving} disabled={disabled || !(clientId && draft.useAgencyPolicy) && ((draft.enabled || draft.remindersEnabled) && !validTimezone || draft.enabled && (!Number.isInteger(draft.intervalDays) || !draft.intervalDays || draft.intervalDays < 1 || draft.intervalDays > 365 || !draft.qualifyingMethods.length))} onClick={() => void save()}>{saving ? <><Loader2 className="size-4 motion-safe:animate-spin" aria-hidden="true" />Saving…</> : 'Save policy'}</Button>
    </footer>}
    <VoiceInputButton className="z-[60]" />
  </DialogContent>;
}
