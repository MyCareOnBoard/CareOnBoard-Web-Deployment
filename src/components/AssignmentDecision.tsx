import {AlertCircle, CheckCircle2, Loader2, RotateCw, XCircle} from 'lucide-react';
import {useEffect, useId, useRef} from 'react';
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
export function AssignmentDecision({decision, loading, error, refresh, draft, onChange, context = 'shift', employeeName, date, selectionCleared = false}: {decision: Decision | null; loading?: boolean; error?: string | null; refresh: () => unknown; draft?: AssignmentConsentDraft; onChange: (draft: AssignmentConsentDraft) => void; context?: 'staff' | 'shift'; employeeName?: string; date?: string; selectionCleared?: boolean}) {
  const panel = useRef<HTMLDivElement>(null);
  const reasonId = useId();
  useEffect(() => {if (error || decision?.decision === 'BLOCKED') panel.current?.focus();}, [error, decision?.fingerprint, decision?.decision]);
  if (!loading && !error && !decision) return null;
  const unavailable = (!decision && error) || decision?.state === 'unavailable';
  const status = decision?.state === 'inactive' ? 'BLOCKED' : decision?.decision;
  const staffRejected = selectionCleared && decision?.state === 'ready' && status === 'BLOCKED';
  const passed = decision?.checks?.filter(check => check.outcome === 'pass') || [];
  const Icon = loading ? Loader2 : status === 'CLEARED' ? CheckCircle2 : status === 'BLOCKED' && !staffRejected ? XCircle : AlertCircle;
  const title = loading ? 'Checking requirements…' : unavailable ? 'Checks unavailable' : decision?.state === 'inactive' ? 'Blocked · no applicable assignment checks enabled' : status === 'CLEARED' ? 'Cleared · configured requirements passed' : staffRejected ? 'Staff not selected · requirements not met' : status === 'BLOCKED' ? 'Blocked · requirements need attention' : 'Warning · requirements need review';
  const color = loading || unavailable ? 'bg-slate-50 text-foreground' : status === 'CLEARED' ? 'bg-emerald-50 text-emerald-800' : status === 'BLOCKED' && !staffRejected ? 'bg-red-50 text-red-800' : 'bg-amber-50 text-amber-900';
  return <section ref={panel} tabIndex={-1} className="my-4 overflow-hidden rounded-2xl border border-[#dce6e8] bg-white text-sm" aria-label="Assignment checks" aria-live="polite">
    <div className={`flex items-start gap-3 px-5 py-4 ${color}`}>
      <Icon aria-hidden="true" className={`mt-0.5 h-5 w-5 shrink-0 ${loading ? 'animate-spin' : ''}`} />
      <div><h3 className="font-semibold">{title}</h3><p className="mt-1 text-xs">{context === 'staff' ? 'Staff requirements' : 'Staff and client requirements'}{employeeName ? ` · ${employeeName}` : ''}{date ? ` · ${date}` : ''}</p></div>
    </div>
    {!loading && <>
      {unavailable ? <p role="alert" className="px-5 py-4">{error || CHECKS_UNAVAILABLE}</p> : decision?.state === 'inactive' ? <p className="px-5 py-4 text-muted-foreground">Assignment is blocked. The agency owner must enable applicable requirements in <a href="/agency/agency-settings?tab=agencyInfo" className="text-primary underline underline-offset-2 hover:no-underline">Settings → Agency Information → Assignment checks.</a></p> : <>
        {staffRejected && <p className="px-5 pt-4">Search for another staff member. This person's unmet requirements are shown below.</p>}
        {error && <p role="alert" className="px-5 pt-4">{error}</p>}
        <div className="divide-y divide-border px-5">{decision?.findings.map(f => <div className="flex gap-3 py-3" key={`${f.ruleId}:${f.code}`}>
          {f.severity === 'mandatory' ? <XCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-red-700" /> : <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />}
          <div className="min-w-0"><p className="break-words">{f.message}</p><p className="mt-1 text-xs text-muted-foreground">{f.severity === 'mandatory' ? 'Required · resolve before assigning' : 'Warning · acknowledgment required'}</p></div>
        </div>)}</div>
        {decision?.hasRestrictedFindings && <p className="px-5 py-3">An agency administrator must review requirements you cannot view.</p>}
        {!!passed.length && <details className="border-t border-[#dce6e8] px-5 py-3"><summary className="cursor-pointer text-muted-foreground">{passed.length} {passed.length === 1 ? 'check' : 'checks'} passed</summary><ul className="mt-2 space-y-2">{passed.map(check => <li key={check.ruleId} className="flex items-center gap-3"><CheckCircle2 aria-hidden="true" className="h-4 w-4 shrink-0 text-emerald-700" /><span>{check.label}</span></li>)}</ul></details>}
        {status === 'WARNING' && decision?.canAcknowledge && <div className="space-y-3 border-t border-[#dce6e8] px-5 py-4">
          <Checkbox label="I reviewed these warnings" checked={draft?.consent === true && draft.fingerprint === decision.fingerprint} onChange={event => onChange({reason: draft?.reason || '', consent: event.target.checked, fingerprint: decision.fingerprint})} />
          <div><label htmlFor={reasonId}>Reason for assigning with warnings</label><Textarea id={reasonId} className="mt-2" required maxLength={500} placeholder="Explain why this assignment can proceed" value={draft?.reason || ''} onChange={event => onChange({reason: event.target.value, consent: draft?.consent === true && draft.fingerprint === decision.fingerprint, fingerprint: decision.fingerprint})} /></div>
        </div>}
      </>}
      <div className="space-y-2 border-t border-[#dce6e8] px-5 py-3">
        <Button type="button" variant="outline" size="sm" onClick={() => void refresh()}><RotateCw className="mr-2 h-4 w-4" aria-hidden="true" />{unavailable ? 'Retry checks' : 'Recheck requirements'}</Button>
        <p className="text-xs text-muted-foreground">{context === 'staff' ? 'Client documents are checked when creating a shift.' : 'Checks use the selected shift dates. Requirements are checked again when saving.'}</p>
      </div>
    </>}
  </section>;
}
