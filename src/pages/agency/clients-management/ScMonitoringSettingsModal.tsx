import { useScMonitoringRefresh } from '@/hooks/useScMonitoringRefresh';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Bell, Clock3, FileText, Loader2, Settings, X } from 'lucide-react';
import { Link } from 'react-router';
import { Routes } from '@/routes/constants';
import VoiceEnabledTextarea from '@/components/VoiceEnabledTextarea';
import VoiceInputButton from '@/components/VoiceInputButton';
import { VoiceRecordingProvider, useVoiceRecording } from '@/contexts/VoiceRecordingContext';
import { useAssignmentReviewScope } from '@/hooks/useAssignmentReview';
import { useEffectiveAgencyMode } from '@/hooks/useEffectiveAgencyMode';
import { useToast } from '@/hooks/use-toast';
import { getScMonitoringPolicy, saveScMonitoringPolicy, listScMonitoringPolicyEvents, monitoringMethods, documentReviewTypes, emptyDocumentReviewIntervals, type DocumentReviewIntervals, type MonitoringPolicyResponse, type MonitoringPolicyInput, type MonitoringPolicyEvent, type MonitoringPolicyEventPage } from '@/lib/api/sc-monitoring-policy';
type PolicyDraft = MonitoringPolicyInput & { documentReviewsEnabled: boolean; documentRemindersEnabled: boolean; documentReviewIntervals: DocumentReviewIntervals };
const draftOf = ({ policy }: MonitoringPolicyResponse): PolicyDraft => ({ expectedRevision: policy.revision, enabled: policy.enabled, intervalDays: policy.intervalDays, qualifyingMethods: [...policy.qualifyingMethods], requireDirectContact: policy.requireDirectContact, remindersEnabled: policy.remindersEnabled, documentReviewsEnabled: policy.documentReviewsEnabled ?? false, documentRemindersEnabled: policy.documentRemindersEnabled ?? false, documentReviewIntervals: { ...emptyDocumentReviewIntervals(), ...policy.documentReviewIntervals }, changeReason: '' });
const statusOf = (error: unknown) => (error as { response?: { status?: number } })?.response?.status;
const label = (value: string) => value.replaceAll('_', ' ').replace(/^./, first => first.toUpperCase());
export default function ScMonitoringSettingsModal({ clientId, onSaved }: { clientId: string; onSaved?: () => void }) {
  const scope = useAssignmentReviewScope(); const mode = useEffectiveAgencyMode();
  const [open, setOpen] = useState(false);
  if (mode !== 'sc') return null;
  return <Dialog key={`${scope}:${clientId}`} open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><Button variant="outline" size="icon" className="size-[52px] shrink-0 p-0 hover:border-[#00b4b8] hover:bg-[#e6f7f8] hover:text-[#008f93] focus-visible:ring-[#00b4b8]/25 focus-visible:ring-offset-0" aria-label="Monitoring Settings" title="Monitoring Settings" disabled={!clientId}><Settings className="h-5 w-5" aria-hidden="true" /></Button></DialogTrigger>
    {open && <VoiceRecordingProvider pageTitle="SC monitoring settings"><PolicyEditor clientId={clientId} onSaved={onSaved} onClose={() => setOpen(false)} /></VoiceRecordingProvider>}
  </Dialog>;
}
function PolicyEditor({ clientId, onSaved, onClose }: { clientId: string; onSaved?: () => void; onClose: () => void }) {
  const { toast } = useToast();
  const { stopRecording } = useVoiceRecording();
  const [saved, setSaved] = useState<MonitoringPolicyResponse | null>(null);
  const [draft, setDraft] = useState<PolicyDraft | null>(null);
  const [latest, setLatest] = useState<MonitoringPolicyResponse | null>(null);
  const [conflict, setConflict] = useState(false); const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(''); const [history, setHistory] = useState<MonitoringPolicyEventPage | null>(null);
  const [historyError, setHistoryError] = useState(''); const [historyBusy, setHistoryBusy] = useState(false);
  const alive = useRef(true);
  const submitting = useRef(false);
  const denied = (error: unknown) => [401, 403, 404].includes(statusOf(error) || 0);
  function clear() { setSaved(null); setDraft(null); setLatest(null); setHistory(null); setConflict(true); }
  async function load() {
    setBusy(true); setLoading(true); setMessage('');
    try { const value = await getScMonitoringPolicy(clientId); if (alive.current) { setSaved(value); setDraft(draftOf(value)); setMessage(''); setConflict(false); } }
    catch (error) { if (alive.current) { if (denied(error)) clear(); setMessage('Monitoring policy could not be loaded. Retry.'); } }
    finally { if (alive.current) { setBusy(false); setLoading(false); } }
  }
  useEffect(() => { alive.current = true; const controller = new AbortController();
    getScMonitoringPolicy(clientId, controller.signal).then(value => { if (!controller.signal.aborted) { setSaved(value); setDraft(draftOf(value)); } })
      .catch(error => { if (!controller.signal.aborted) { if (denied(error)) clear(); setMessage('Monitoring policy could not be loaded. Retry.'); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => { alive.current = false; controller.abort(); };
  }, [clientId]);
  const currentState = useRef({saved, draft, conflict}); currentState.current = {saved,draft,conflict};
  useScMonitoringRefresh({scopeKey:clientId,timezone:saved?.timezone,enabled:Boolean(saved && !busy),refresh:async signal => {
    try { const value = await getScMonitoringPolicy(clientId,signal); if (signal.aborted || !alive.current) return;
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
    try { const value = await getScMonitoringPolicy(clientId); if (alive.current) setLatest(value); }
    catch (error) { if (alive.current) { if (denied(error)) clear(); setMessage('Latest policy unavailable. Your draft is retained; Save remains disabled. Retry loading the latest policy.'); } }
    finally { if (alive.current) setBusy(false); }
  }
  async function save() {
    if (!draft || !saved?.canEditPolicy || conflict || busy || submitting.current) return;
    submitting.current = true;
    setBusy(true); setSaving(true); setMessage('');
    try { const value = await saveScMonitoringPolicy(clientId, draft); if (alive.current) { setSaved(value); setDraft(draftOf(value)); setHistory(null); setMessage('Monitoring policy saved.'); onSaved?.(); toast({ title: 'Monitoring settings saved', description: 'Monitoring rules and reminder settings for this client have been updated.', variant: 'success' }); } }
    catch (error) { if (alive.current) {
      const saveError = denied(error) ? 'Your access changed. Reload the policy.' : statusOf(error) === 409
        ? 'Monitoring policy changed. Load the latest rules, review your draft, and reapply changes.'
        : 'Policy could not be saved. Your draft is still here.';
      if (denied(error)) clear();
      else if (statusOf(error) === 409) { setConflict(true); setLatest(null); }
      setMessage(saveError);
      toast({ title: 'Monitoring settings could not be saved', description: saveError, variant: 'destructive' });
    } } finally { submitting.current = false; if (alive.current) { setBusy(false); setSaving(false); } }
  }
  async function loadHistory(cursor?: string) {
    if (!saved?.canEditPolicy || historyBusy) return;
    setHistoryBusy(true); setHistoryError('');
    try { const value = await listScMonitoringPolicyEvents(clientId, cursor); if (alive.current) setHistory(old => ({ ...value, items: cursor ? [...(old?.items || []), ...value.items] : value.items })); }
    catch (error) { if (alive.current) { if (denied(error)) clear(); setHistoryError('Policy history unavailable. Try loading it again.'); } }
    finally { if (alive.current) setHistoryBusy(false); }
  }
  let validTimezone = false;
  try { if (saved?.timezone) { new Intl.DateTimeFormat('en-US', { timeZone: saved.timezone }); validTimezone = true; } } catch { /* Explicit unavailable state below. */ }
  const disabled = busy || conflict || !saved?.canEditPolicy;
  useEffect(() => { if (disabled) stopRecording(); }, [disabled, stopRecording]);
  const invalidDocumentIntervals = draft && documentReviewTypes.some(type => {
    const days = draft.documentReviewIntervals[type];
    return days !== null && (!Number.isInteger(days) || days < 1 || days > 365);
  });
  const noDocumentIntervals = draft && !documentReviewTypes.some(type => draft.documentReviewIntervals[type] !== null);
  const needsTimezone = draft && (draft.enabled || draft.remindersEnabled || draft.documentReviewsEnabled || draft.documentRemindersEnabled);
  return <DialogContent showCloseButton={false}
    className="left-auto right-4 flex max-h-[90dvh] w-[calc(100vw-32px)] max-w-[600px] translate-x-0 flex-col overflow-hidden rounded-[26px] border border-[#dce8e8] bg-white text-[#16383b] shadow-xl sm:right-8 [&_label]:relative [&_button:focus-visible]:ring-[#00b4b8]/25 [&_button:focus-visible]:ring-offset-0"
    onEscapeKeyDown={event => { if (saving) event.preventDefault(); }} onInteractOutside={event => { if (saving) event.preventDefault(); }}>
    <header className="flex shrink-0 items-start justify-between gap-4 border-b border-[#e6eeee] bg-[#f7fbfb] px-5 py-5 sm:px-6">
      <div><p className="mb-1 text-[11px] font-semibold uppercase tracking-[.14em] text-[#087b80]">Client monitoring</p><DialogTitle className="text-[22px] font-semibold leading-tight">Monitoring Settings</DialogTitle><DialogDescription className="mt-2 max-w-[420px] text-sm leading-5 text-[#617579]">Manage contact schedules and recurring document reviews for this client.</DialogDescription></div>
      <Button type="button" variant="ghost" size="icon-sm" className="shrink-0 rounded-full bg-white text-[#526e72]" aria-label="Close monitoring settings" disabled={saving} onClick={onClose}><X className="size-4" /></Button>
    </header>
    {loading && !saved ? <SettingsSkeleton /> : <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
    {message && <p role="status" className="mb-4 rounded-xl bg-[#f0f7f7] px-3 py-2.5 text-sm leading-5">{message}</p>}
    {!saved && <Button type="button" variant="outline" disabled={busy} onClick={() => void load()}>Reload policy</Button>}
    {conflict && saved && <div className="mb-5 space-y-3 rounded-xl border border-[#eed6a6] bg-[#fffbf2] p-4"><Button type="button" variant="outline" disabled={busy} onClick={() => void loadLatest()}>Load latest policy</Button>
      {latest && <div className="space-y-3 text-sm"><p>Latest contact policy: {latest.policy.enabled ? 'Enabled' : 'Disabled'}, {latest.policy.intervalDays ?? 'No'} days, {latest.policy.qualifyingMethods.map(label).join(', ') || 'No methods'}, direct contact {latest.policy.requireDirectContact ? 'required' : 'optional'}, reminders {latest.policy.remindersEnabled ? 'on' : 'off'}.</p>
        <p>Latest document policy: reviews {latest.policy.documentReviewsEnabled ? 'on' : 'off'}, reminders {latest.policy.documentRemindersEnabled ? 'on' : 'off'}. {documentReviewTypes.map(type => `${type}: ${latest.policy.documentReviewIntervals?.[type] ? `every ${latest.policy.documentReviewIntervals[type]} days` : 'off'}`).join(' · ')}. Review these rules alongside your retained draft below.</p>
        <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={busy || !latest.canEditPolicy} onClick={() => { setSaved(latest); setDraft(draftOf(latest)); setLatest(null); setConflict(false); }}>Use latest policy</Button>
        <Button type="button" variant="outline" disabled={busy || !latest.canEditPolicy} onClick={() => { setSaved(latest); setDraft(current => current && ({ ...current, expectedRevision: latest.policy.revision })); setLatest(null); setConflict(false); setMessage('Draft reapplied. Review your changes before saving.'); }}>Reapply my draft</Button></div></div>}</div>}
    {saved && draft && <div className="space-y-6">
      <div className="space-y-2 text-sm">
        <p className="flex flex-wrap items-center justify-between gap-2 text-[#617579]"><span>Agency time zone</span><span className="rounded-full bg-[#eff6f6] px-2.5 py-1 font-medium text-[#335d61]">{saved.timezone || 'Not configured'}</span></p>
        {!saved.canEditPolicy && <p className="rounded-lg bg-[#f7f9f9] px-3 py-2">Only the agency owner can change monitoring rules.</p>}
        {!validTimezone && <p role="alert" className="rounded-lg bg-[#fff8e9] px-3 py-2 text-[#795510]">Set a valid agency time zone before enabling monitoring schedules, document reviews, or reminders. <Link to={`${Routes.agency.agencySettings}?tab=agencyInfo#agency-timezone`} className="font-medium underline" onClick={onClose}>View agency time zone</Link></p>}
      </div>
      <section aria-labelledby="sc-contact-policy-heading" className="space-y-4 border-t border-[#e6eeee] pt-5">
      <div><h3 id="sc-contact-policy-heading" className="flex items-center gap-2 text-base font-semibold"><Clock3 className="size-4 text-[#008f93]" aria-hidden="true" />Contact schedule</h3><p className="mt-1 text-sm text-[#617579]">Choose how often qualifying client contact is needed.</p></div>
      <Checkbox label="Enable monitoring contact schedules" checked={draft.enabled} disabled={disabled || !validTimezone && !draft.enabled} onChange={event => setDraft({ ...draft, enabled: event.target.checked })} />
      <div className="flex flex-wrap items-end justify-between gap-3"><label className="block max-w-full text-sm font-medium">Rolling interval (days)<Input type="number" className="mt-1.5 w-40 focus-visible:border-[#00b4b8] focus-visible:ring-0" min={1} max={365} step={1} disabled={disabled} value={draft.intervalDays ?? ''} onChange={event => setDraft({ ...draft, intervalDays: event.target.value === '' ? null : Number(event.target.value) })} /></label><p className="pb-2 text-xs text-[#617579]">1–365 days between qualifying contacts</p></div>
      <fieldset disabled={disabled} className="space-y-3"><legend className="mb-2 text-sm font-medium">Contact methods that count</legend><div className="grid grid-cols-1 gap-x-6 gap-y-3 min-[400px]:grid-cols-2">{monitoringMethods.map(method => <Checkbox key={method} label={label(method)} labelClassName="font-normal" className="size-5 rounded" checked={draft.qualifyingMethods.includes(method)} onChange={event => setDraft({ ...draft, qualifyingMethods: event.target.checked ? [...draft.qualifyingMethods, method] : draft.qualifyingMethods.filter(value => value !== method) })} />)}</div></fieldset>
      <Checkbox label="Require direct contact with the client" disabled={disabled} checked={draft.requireDirectContact} onChange={event => setDraft({ ...draft, requireDirectContact: event.target.checked })} />
      {draft.enabled && <p className="text-xs leading-5 text-[#617579]">Changing this interval can move contact deadlines. Disabling and re-enabling keeps the original baseline.</p>}
      </section>
      <section aria-labelledby="sc-document-policy-heading" className="space-y-4 border-t border-[#e6eeee] pt-5">
        <div><h3 id="sc-document-policy-heading" className="flex items-center gap-2 text-base font-semibold"><FileText className="size-4 text-[#008f93]" aria-hidden="true" />Client document monitoring</h3><p className="mt-1 text-sm leading-5 text-[#617579]">Set a review cadence for each document type. The SC marks each file reviewed to start its next interval.</p></div>
        <Checkbox label="Enable recurring document reviews" disabled={disabled || !validTimezone && !draft.documentReviewsEnabled} checked={draft.documentReviewsEnabled} onChange={event => setDraft({ ...draft, documentReviewsEnabled: event.target.checked })} />
        <div className="overflow-hidden rounded-xl border border-[#e0eaea]">
          <div className="flex items-center justify-between gap-3 bg-[#f7fbfb] px-3 py-2 text-xs font-medium text-[#526e72]"><span>Document type</span><span>Review every</span></div>
          {documentReviewTypes.map(type => <div key={type} className="flex items-center justify-between gap-3 border-t border-[#e6eeee] px-3 py-2.5">
            <label htmlFor={`sc-document-interval-${type}`} className="min-w-0 text-sm font-medium">{type}</label>
            <div className="flex shrink-0 items-center gap-2"><Input id={`sc-document-interval-${type}`} aria-label={`${type} review interval (days)`} type="number" min={1} max={365} step={1} placeholder="Off" className="h-9 w-20 text-right focus-visible:border-[#00b4b8] focus-visible:ring-0" disabled={disabled || !draft.documentReviewsEnabled} value={draft.documentReviewIntervals[type] ?? ''} onChange={event => setDraft({ ...draft, documentReviewIntervals: { ...draft.documentReviewIntervals, [type]: event.target.value === '' ? null : Number(event.target.value) } })} /><span className="text-xs text-[#617579]">days</span></div>
          </div>)}
        </div>
        <p className="text-xs leading-5 text-[#617579]">Use 1–365 days, or leave a type blank to turn it off. New files need a first review. The SC's recorded review starts the next interval.</p>
        {draft.documentReviewsEnabled && noDocumentIntervals && <p role="status" className="text-sm text-[#795510]">Add an interval for at least one document type.</p>}
        {invalidDocumentIntervals && <p role="alert" className="text-sm text-[#b42332]">Document review intervals must be whole numbers from 1 to 365.</p>}
      </section>
      <section aria-labelledby="sc-reminder-policy-heading" className="space-y-4 border-t border-[#e6eeee] pt-5">
      <div><h3 id="sc-reminder-policy-heading" className="flex items-center gap-2 text-base font-semibold"><Bell className="size-4 text-[#008f93]" aria-hidden="true" />SC reminders</h3><p className="mt-1 text-sm text-[#617579]">Choose which reminders the assigned SC receives.</p></div>
      <Checkbox label="Send reminders to the assigned SC" disabled={disabled || !validTimezone && !draft.remindersEnabled} checked={draft.remindersEnabled} onChange={event => setDraft({ ...draft, remindersEnabled: event.target.checked })} />
      <p className="text-xs leading-5 text-[#617579]">Contact reminders appear in-app. Follow-up reminders can also arrive by email, based on the SC's notification preferences.</p>
      <Checkbox label="Send document review reminders to the assigned SC" disabled={disabled || !validTimezone && !draft.documentRemindersEnabled} checked={draft.documentRemindersEnabled} onChange={event => setDraft({ ...draft, documentRemindersEnabled: event.target.checked })} />
      <p className="text-xs leading-5 text-[#617579]">Document reminders appear in-app when a review is due. Notification preferences apply. Turning reminders on can notify the SC about reviews already due.</p>
      </section>
      {saved.canEditPolicy && <section className="space-y-4 border-t border-[#e6eeee] pt-5"><div className="space-y-2"><Label htmlFor="sc-monitoring-change-reason">Reason for this change</Label><VoiceEnabledTextarea id="sc-monitoring-change-reason" className="focus-visible:border-[#00b4b8] focus-visible:ring-0" fieldName="Monitoring policy change reason" pageTitle="SC monitoring settings" rows={3} placeholder="Explain why these rules are changing" disabled={disabled} value={draft.changeReason} onChange={value => setDraft(current => current && ({ ...current, changeReason: value.slice(0, 2000) }))} /></div>
        {historyError && <p role="alert" className="text-sm text-[#b42332]">{historyError}</p>}{historyBusy && <p role="status" className="text-sm text-[#617579]">Loading policy history…</p>}{history && <div className="space-y-3">{history.items.length === 0 && <p className="text-sm">No policy changes yet.</p>}{history.items.map(event => <article key={event.eventId} className="space-y-1.5 border-l border-[#d7e6e6] pl-3 text-sm"><p className="font-medium">{event.authorName} <span className="font-normal text-[#617579]">· {event.createdAt}</span></p><p className="break-words text-[#526e72]">{event.changeReason}</p><PolicyChanges event={event} /></article>)}{history.nextCursor && <Button type="button" variant="outline" disabled={historyBusy} onClick={() => void loadHistory(history.nextCursor || undefined)}>Load older changes</Button>}</div>}</section>}
    </div>}
    </div>}
    {saved?.canEditPolicy && draft && <footer className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t px-5 py-4">
      <Button type="button" variant="outline" disabled={historyBusy || busy} onClick={() => void loadHistory()}>View policy history</Button>
      <Button type="button" className="ml-auto" aria-busy={saving} disabled={disabled || Boolean(needsTimezone && !validTimezone || invalidDocumentIntervals || draft.documentReviewsEnabled && noDocumentIntervals || draft.enabled && (!Number.isInteger(draft.intervalDays) || !draft.intervalDays || draft.intervalDays < 1 || draft.intervalDays > 365 || !draft.qualifyingMethods.length))} onClick={() => void save()}>{saving ? <><Loader2 className="size-4 motion-safe:animate-spin" aria-hidden="true" />Saving…</> : 'Save policy'}</Button>
    </footer>}
    <VoiceInputButton className="z-[60]" />
  </DialogContent>;
}

function SettingsSkeleton() {
  return <div role="status" aria-label="Loading monitoring settings" className="flex min-h-0 flex-1 flex-col"><span className="sr-only">Loading monitoring settings…</span>
    <div aria-hidden="true" className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5 sm:px-6">
      <div className="flex justify-between"><Skeleton className="h-4 w-28" /><Skeleton className="h-6 w-20 rounded-full" /></div>
      <div className="space-y-4 border-t border-[#e6eeee] pt-5"><Skeleton className="h-5 w-40" /><Skeleton className="h-4 w-4/5" /><Skeleton className="h-6 w-3/4" /><Skeleton className="h-10 w-40" /><div className="grid grid-cols-2 gap-3">{[0, 1, 2, 3].map(index => <Skeleton key={index} className="h-5 w-4/5" />)}</div></div>
      <div className="space-y-4 border-t border-[#e6eeee] pt-5"><Skeleton className="h-5 w-48" /><Skeleton className="h-4 w-full" /><Skeleton className="h-6 w-3/4" /><div className="space-y-2 rounded-xl border border-[#e6eeee] p-3">{documentReviewTypes.map(type => <div key={type} className="flex h-10 items-center justify-between gap-4"><Skeleton className="h-4 w-24" /><Skeleton className="h-9 w-24" /></div>)}</div></div>
      <Skeleton className="h-20 w-full" />
    </div><div aria-hidden="true" className="flex shrink-0 flex-wrap justify-between gap-2 border-t border-[#e6eeee] px-5 py-4"><Skeleton className="h-10 w-36" /><Skeleton className="h-10 w-28" /></div>
  </div>;
}

function PolicyChanges({ event }: { event: MonitoringPolicyEvent }) {
  const fields = { enabled: 'Contact schedule', intervalDays: 'Contact interval (days)', qualifyingMethods: 'Contact methods', requireDirectContact: 'Direct contact required', remindersEnabled: 'Contact and follow-up reminders', documentReviewsEnabled: 'Document reviews', documentRemindersEnabled: 'Document reminders' } as const;
  const display = (value: unknown) => typeof value === 'boolean' ? value ? 'On' : 'Off' : Array.isArray(value) ? value.map(label).join(', ') || 'None' : String(value ?? 'Not set');
  return <div className="space-y-1 text-xs leading-5 text-[#617579]">
    {(Object.keys(fields) as Array<keyof typeof fields>).filter(key => JSON.stringify(event.previousValues[key]) !== JSON.stringify(event.nextValues[key])).map(key => <p key={key}>{fields[key]}: {display(event.previousValues[key])} → {display(event.nextValues[key])}</p>)}
    {documentReviewTypes.filter(type => (event.previousValues.documentReviewIntervals?.[type] ?? null) !== (event.nextValues.documentReviewIntervals?.[type] ?? null)).map(type => <p key={type}>{type} review interval: {event.previousValues.documentReviewIntervals?.[type] ? `${event.previousValues.documentReviewIntervals[type]} days` : 'Off'} → {event.nextValues.documentReviewIntervals?.[type] ? `${event.nextValues.documentReviewIntervals[type]} days` : 'Off'}</p>)}
  </div>;
}
