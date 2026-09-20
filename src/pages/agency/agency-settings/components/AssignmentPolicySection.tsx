import {useEffect, useRef, useState} from 'react';
import {format} from 'date-fns';
import {Button} from '@/components/ui/button';
import {Checkbox} from '@/components/ui/checkbox';
import {Calendar} from '@/components/ui/calendar';
import {Popover, PopoverContent, PopoverTrigger} from '@/components/ui/popover';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {useAssignmentReviewScope} from '@/hooks/useAssignmentReview';
import {useEffectiveAgencyMode} from '@/hooks/useEffectiveAgencyMode';
import {useToast} from '@/hooks/use-toast';
import {getAssignmentPolicy, saveAssignmentPolicy, type AssignmentPolicyResponse, type PolicyInput, type PolicyEntry} from '@/lib/api/assignment-policy';
import SettingsSectionCard from './SettingsSectionCard';
import SettingsFormFieldRow from './SettingsFormFieldRow';

const draftOf = (data: AssignmentPolicyResponse): PolicyInput => ({expectedRevision: data.policy.revision, enabled: data.policy.enabled, serviceDateCutoff: data.policy.serviceDateCutoff, entries: data.policy.entries, adoption: false});
export default function AssignmentPolicySection({agencyId}: {agencyId: string}) {
  const scope = useAssignmentReviewScope();
  const program = useEffectiveAgencyMode();
  // Remount all private policy state when authority, actor, or agency changes.
  return <PolicyEditor key={`${scope}:${agencyId}:${program}`} agencyId={agencyId} />;
}
function PolicyEditor({agencyId}: {agencyId: string}) {
  const {toast} = useToast();
  const [data, setData] = useState<AssignmentPolicyResponse | null>(null);
  const [draft, setDraft] = useState<PolicyInput | null>(null);
  const [current, setCurrent] = useState<AssignmentPolicyResponse | null>(null);
  const [conflict, setConflict] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [reload, setReload] = useState(0);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    const controller = new AbortController();
    getAssignmentPolicy(agencyId, controller.signal).then(value => {if (!controller.signal.aborted) {setData(value); setDraft(draftOf(value)); setError(''); setConflict(false); setCurrent(null);}})
      .catch(() => {if (!controller.signal.aborted) setError('Assignment policy could not be loaded. Retry.');});
    return () => {alive.current = false; controller.abort();};
  }, [agencyId, reload]);
  async function save() {
    if (!draft || !data?.canEdit || conflict) return;
    setSaving(true); setError('');
    try {
      const value = await saveAssignmentPolicy(agencyId, draft);
      if (alive.current) {setData(value); setDraft(draftOf(value)); toast({title: 'Assignment checks updated', description: 'Your assignment requirements have been saved.'});}
    } catch (err) {
      if (!alive.current) return;
      const response = (err as {response?: {status?: number; data?: {code?: string}}}).response;
      const accessDenied = [401,403].includes(response?.status || 0);
      const changed = response?.data?.code === 'ASSIGNMENT_POLICY_CHANGED';
      const message = accessDenied ? 'You no longer have access to edit these assignment checks.' : changed
        ? 'Requirements changed. Review the current policy and reload before saving. Your draft is retained below.'
        : 'Assignment policy could not be saved. Your draft is still here.';
      setError(message);
      toast({title: 'Assignment checks could not be updated', description: message, variant: 'destructive'});
      if (accessDenied) {setData(null); setDraft(null); setCurrent(null); setConflict(true); return;}
      if (changed) {
        setConflict(true);
        try {const value = await getAssignmentPolicy(agencyId); if (alive.current) setCurrent(value);} catch { /* Explicit reload remains available. */ }
      }
    } finally {if (alive.current) setSaving(false);}
  }
  const disabled = !data?.canEdit || saving || conflict;
  return <SettingsSectionCard title="Assignment checks" subtitle="Changes apply when you save">
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {(!data || conflict) && <Button type="button" variant="outline" onClick={() => setReload(x => x + 1)}>Reload current policy</Button>}
    {current && <p className="text-sm">Current: {current.policy.enabled ? 'Enabled' : 'Disabled'}, revision {current.policy.revision}, {current.policy.entries.length} requirements, service on or after {current.policy.serviceDateCutoff || 'not set'}. Draft: {draft?.enabled ? 'Enabled' : 'Disabled'}, {draft?.entries.length} requirements, service on or after {draft?.serviceDateCutoff || 'not set'}.</p>}
    {current && <ul className="list-disc pl-5 text-sm">{current.policy.entries.map(entry => <li key={entry.ruleId}>Current: {current.approvedRules.find(rule => rule.ruleId === entry.ruleId)?.label || entry.ruleId} — {entry.severity}</li>)}</ul>}
    {data && draft && <>
      <p className="text-sm text-muted-foreground">Agency timezone: {data.timezone || 'Not configured'}</p>
      {!!data.approvedRules.length && <p className="text-sm text-muted-foreground">Choose Required to block assignments, Warning to require acknowledgment, or Not selected to omit a check. Assignments are blocked when no enabled check applies. Staff checks run in the client wizard and at shift creation; client documents, AENF and medication training are checked only for shifts. File contents and clinical clearance are not verified.</p>}
      {!data.approvedRules.length ? <p className="text-sm">No assignment requirements are available to enable yet.</p> : <>
        <div className="py-3"><Checkbox label="Enable assignment checks" disabled={disabled} checked={draft.enabled} onChange={event => setDraft({...draft, enabled: event.target.checked, adoption: false})} /></div>
        <SettingsFormFieldRow title="Apply to service on or after" description="Includes assignments that overlap this date. Shift checks use the service dates; wizard checks use today.">
          <Popover><PopoverTrigger asChild><Button type="button" variant="outline" disabled={disabled}>{draft.serviceDateCutoff || 'Select date'}</Button></PopoverTrigger>
            <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={draft.serviceDateCutoff ? new Date(`${draft.serviceDateCutoff}T12:00:00`) : undefined} onSelect={date => setDraft({...draft, serviceDateCutoff: date ? format(date, 'yyyy-MM-dd') : null, adoption: false})} /></PopoverContent>
          </Popover>
        </SettingsFormFieldRow>
        {data.approvedRules.map(rule => {
          const entry = draft.entries.find(e => e.ruleId === rule.ruleId);
          return <SettingsFormFieldRow key={rule.ruleId} title={rule.label} description={`${rule.programs.map(p => p.toUpperCase()).join(', ')} · ${rule.kinds?.length === 1 ? 'Shift creation only' : 'Client wizard and shift creation'}${entry && entry.ruleVersion < rule.ruleVersion ? ' · Legacy date rule; reselect severity to upgrade' : ''}`}>
            <Select disabled={disabled} value={entry?.severity || 'off'} onValueChange={value => setDraft({...draft, adoption: false, entries: [...draft.entries.filter(e => e.ruleId !== rule.ruleId), ...(value === 'off' ? [] : [{ruleId: rule.ruleId, ruleVersion: rule.ruleVersion, severity: value as PolicyEntry['severity']}])]})}>
              <SelectTrigger aria-label={rule.label}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="off">Not selected</SelectItem>{rule.allowedSeverities.map(s => <SelectItem disabled={!entry && draft.entries.length >= 20} key={s} value={s}>{s === 'mandatory' ? 'Required' : 'Warning'}</SelectItem>)}</SelectContent>
            </Select>
          </SettingsFormFieldRow>;
        })}
        <p className="text-sm">{draft.entries.length}/20 requirements selected.</p>
        {draft.enabled && <div className="py-3"><Checkbox label="I confirm these requirements and affected programs. Changes apply when you save." disabled={disabled} checked={draft.adoption} onChange={event => setDraft({...draft, adoption: event.target.checked})} /></div>}
        {data.canEdit && <Button type="button" disabled={disabled || draft.entries.length > 20 || (draft.enabled && (!draft.adoption || !draft.serviceDateCutoff || !draft.entries.length))} onClick={() => void save()}>{saving ? 'Saving…' : 'Save assignment checks'}</Button>}
      </>}
      {!data.canEdit && <p className="text-sm text-muted-foreground">Only the agency owner can change assignment checks.</p>}
    </>}
  </SettingsSectionCard>;
}
