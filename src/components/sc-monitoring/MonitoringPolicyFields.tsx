import { useId } from 'react';
import { Bell, Clock3, FileText } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { documentReviewTypes, monitoringMethods } from '@/lib/api/sc-monitoring-policy';
import type { MonitoringPolicyDraft } from '@/lib/sc-monitoring-policy-draft';

export default function MonitoringPolicyFields({ draft, onChange, disabled = false, timezone }: {
  draft: MonitoringPolicyDraft;
  onChange: (draft: MonitoringPolicyDraft) => void;
  disabled?: boolean;
  timezone: string | null;
}) {
  const id = useId();
  let validTimezone = false;
  try { if (timezone) { new Intl.DateTimeFormat('en-US', { timeZone: timezone }); validTimezone = true; } } catch { /* Keep existing schedules switchable off. */ }
  const invalidDocumentIntervals = documentReviewTypes.some(type => {
    const days = draft.documentReviewIntervals[type];
    return days !== null && (!Number.isInteger(days) || days < 1 || days > 365);
  });
  const noDocumentIntervals = !documentReviewTypes.some(type => draft.documentReviewIntervals[type] !== null);
  const label = (value: string) => value.replaceAll('_', ' ').replace(/^./, first => first.toUpperCase());

  return <div className="space-y-6 [&_label]:relative">
    <section aria-labelledby={`${id}-contact-policy-heading`} className="space-y-4 border-t border-[#e6eeee] pt-5">
      <div><h3 id={`${id}-contact-policy-heading`} className="flex items-center gap-2 text-base font-semibold"><Clock3 className="size-4 text-[#008f93]" aria-hidden="true" />Contact schedule</h3><p className="mt-1 text-sm text-[#617579]">Choose how often qualifying client contact is needed.</p></div>
      <Checkbox label="Enable monitoring contact schedules" checked={draft.enabled} disabled={disabled || !validTimezone && !draft.enabled} onChange={event => onChange({ ...draft, enabled: event.target.checked })} />
      <div className="flex flex-wrap items-end justify-between gap-3"><label className="block max-w-full text-sm font-medium">Rolling interval (days)<Input type="number" className="mt-1.5 w-40 focus-visible:border-[#00b4b8] focus-visible:ring-0" min={1} max={365} step={1} disabled={disabled} value={draft.intervalDays ?? ''} onChange={event => onChange({ ...draft, intervalDays: event.target.value === '' ? null : Number(event.target.value) })} /></label><p className="pb-2 text-xs text-[#617579]">1–365 days between qualifying contacts</p></div>
      <fieldset disabled={disabled} className="space-y-3"><legend className="mb-2 text-sm font-medium">Contact methods that count</legend><div className="grid grid-cols-1 gap-x-6 gap-y-3 min-[400px]:grid-cols-2">{monitoringMethods.map(method => <Checkbox key={method} label={label(method)} labelClassName="font-normal" className="size-5 rounded" checked={draft.qualifyingMethods.includes(method)} onChange={event => onChange({ ...draft, qualifyingMethods: event.target.checked ? [...draft.qualifyingMethods, method] : draft.qualifyingMethods.filter(value => value !== method) })} />)}</div></fieldset>
      <Checkbox label="Require direct contact with the client" disabled={disabled} checked={draft.requireDirectContact} onChange={event => onChange({ ...draft, requireDirectContact: event.target.checked })} />
      {draft.enabled && <p className="text-xs leading-5 text-[#617579]">Changing this interval can move contact deadlines. Disabling and re-enabling keeps the original baseline.</p>}
    </section>
    <section aria-labelledby={`${id}-document-policy-heading`} className="space-y-4 border-t border-[#e6eeee] pt-5">
      <div><h3 id={`${id}-document-policy-heading`} className="flex items-center gap-2 text-base font-semibold"><FileText className="size-4 text-[#008f93]" aria-hidden="true" />Client document monitoring</h3><p className="mt-1 text-sm leading-5 text-[#617579]">Set a review cadence for each document type. The SC marks each file reviewed to start its next interval.</p></div>
      <Checkbox label="Enable recurring document reviews" disabled={disabled || !validTimezone && !draft.documentReviewsEnabled} checked={draft.documentReviewsEnabled} onChange={event => onChange({ ...draft, documentReviewsEnabled: event.target.checked })} />
      <div className="overflow-hidden rounded-xl border border-[#e0eaea]">
        <div className="flex items-center justify-between gap-3 bg-[#f7fbfb] px-3 py-2 text-xs font-medium text-[#526e72]"><span>Document type</span><span>Review every</span></div>
        {documentReviewTypes.map(type => <div key={type} className="flex items-center justify-between gap-3 border-t border-[#e6eeee] px-3 py-2.5">
          <label htmlFor={`${id}-document-interval-${type}`} className="min-w-0 text-sm font-medium">{type}</label>
          <div className="flex shrink-0 items-center gap-2"><Input id={`${id}-document-interval-${type}`} aria-label={`${type} review interval (days)`} type="number" min={1} max={365} step={1} placeholder="Off" className="h-9 w-20 text-right focus-visible:border-[#00b4b8] focus-visible:ring-0" disabled={disabled || !draft.documentReviewsEnabled} value={draft.documentReviewIntervals[type] ?? ''} onChange={event => onChange({ ...draft, documentReviewIntervals: { ...draft.documentReviewIntervals, [type]: event.target.value === '' ? null : Number(event.target.value) } })} /><span className="text-xs text-[#617579]">days</span></div>
        </div>)}
      </div>
      <p className="text-xs leading-5 text-[#617579]">Use 1–365 days, or leave a type blank to turn it off. New files need a first review. The SC's recorded review starts the next interval.</p>
      {draft.documentReviewsEnabled && noDocumentIntervals && <p role="status" className="text-sm text-[#795510]">Add an interval for at least one document type.</p>}
      {invalidDocumentIntervals && <p role="alert" className="text-sm text-[#b42332]">Document review intervals must be whole numbers from 1 to 365.</p>}
    </section>
    <section aria-labelledby={`${id}-reminder-policy-heading`} className="space-y-4 border-t border-[#e6eeee] pt-5">
      <div><h3 id={`${id}-reminder-policy-heading`} className="flex items-center gap-2 text-base font-semibold"><Bell className="size-4 text-[#008f93]" aria-hidden="true" />SC reminders</h3><p className="mt-1 text-sm text-[#617579]">Choose which reminders the assigned SC receives.</p></div>
      <Checkbox label="Send reminders to the assigned SC" disabled={disabled || !validTimezone && !draft.remindersEnabled} checked={draft.remindersEnabled} onChange={event => onChange({ ...draft, remindersEnabled: event.target.checked })} />
      <p className="text-xs leading-5 text-[#617579]">Contact reminders appear in-app. Follow-up reminders can also arrive by email, based on the SC's notification preferences.</p>
      <Checkbox label="Send document review reminders to the assigned SC" disabled={disabled || !validTimezone && !draft.documentRemindersEnabled} checked={draft.documentRemindersEnabled} onChange={event => onChange({ ...draft, documentRemindersEnabled: event.target.checked })} />
      <p className="text-xs leading-5 text-[#617579]">Document reminders appear in-app when a review is due. Notification preferences apply. Turning reminders on can notify the SC about reviews already due.</p>
    </section>
  </div>;
}
