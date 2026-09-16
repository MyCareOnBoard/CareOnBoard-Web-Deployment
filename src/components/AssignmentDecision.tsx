import {useEffect, useRef} from 'react';
import {Button} from '@/components/ui/button';
import {Checkbox} from '@/components/ui/checkbox';
import {Textarea} from '@/components/ui/textarea';
import {CHECKS_UNAVAILABLE, type AssignmentAcknowledgment, type AssignmentDecision as Decision} from '@/lib/api/assignment-decision';
export type AssignmentConsentDraft = {reason: string; fingerprint?: string; consent: boolean};
export type AssignmentConsentDrafts = Record<string, AssignmentConsentDraft>;
export function assignmentAcknowledgments(decisions: Record<string, Decision>, drafts: AssignmentConsentDrafts): AssignmentAcknowledgment[] {
  return Object.values(decisions).flatMap(d => {
    const draft = drafts[d.contextKey];
    return d.decision === 'WARNING' && d.canAcknowledge && draft?.consent && draft.fingerprint === d.fingerprint && draft.reason.trim().length > 0 && draft.reason.trim().length <= 500
      ? [{contextKey: d.contextKey, fingerprint: d.fingerprint!, reason: draft.reason.trim()}] : [];
  });
}
export function AssignmentDecision({decision, loading, error, refresh, draft, onChange}: {decision: Decision | null; loading?: boolean; error?: string | null; refresh: () => unknown; draft?: AssignmentConsentDraft; onChange: (draft: AssignmentConsentDraft) => void}) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {if (error || decision?.decision === 'BLOCKED') panel.current?.focus();}, [error, decision?.fingerprint, decision?.decision]);
  if (!loading && !error && (!decision || decision.state === 'inactive')) return null;
  const unavailable = (!decision && error) || decision?.state === 'unavailable';
  return <div ref={panel} tabIndex={-1} className="my-3 space-y-3 rounded-xl border border-[#cccccd] bg-white p-4 text-sm" aria-label="Assignment checks" aria-live="polite">
    <h3 className="font-semibold">Assignment checks</h3>
    {error && decision?.state === 'ready' && <p role="alert">{error}</p>}
    {loading ? <p>Checking assignment requirements…</p> : unavailable ? <><p role="alert">{error || CHECKS_UNAVAILABLE}</p><Button type="button" variant="outline" onClick={() => void refresh()}>Retry checks</Button></> : <>
      {decision?.state === 'ready' && <p className="text-sm text-muted-foreground">Checks recorded files and any dates entered as of today. Blank dates are allowed. File contents and future service coverage are not verified.</p>}
      {decision?.decision === 'CLEARED' && <p>Meets the configured assignment checks.</p>}
      {decision?.findings.map(f => <p className="break-words" key={`${f.ruleId}:${f.code}`}>{f.message}</p>)}
      {decision?.hasRestrictedFindings && <p>An agency administrator must review requirements you cannot view.</p>}
      {decision?.decision === 'WARNING' && decision.canAcknowledge && <>
        <Checkbox label="I reviewed these warnings" checked={draft?.consent === true && draft.fingerprint === decision.fingerprint} onChange={event => onChange({reason: draft?.reason || '', consent: event.target.checked, fingerprint: decision.fingerprint})} />
        <label className="block">Reason for assigning with warnings<Textarea required maxLength={500} value={draft?.reason || ''} onChange={event => onChange({reason: event.target.value, consent: draft?.consent === true && draft.fingerprint === decision.fingerprint, fingerprint: decision.fingerprint})} /></label>
      </>}
    </>}
  </div>;
}
