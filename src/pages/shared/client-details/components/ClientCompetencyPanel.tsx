import {useCallback, useEffect, useId, useRef, useState} from 'react';
import {format, parseISO} from 'date-fns';
import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';
import {Calendar} from '@/components/ui/calendar';
import {Popover, PopoverContent, PopoverTrigger} from '@/components/ui/popover';
import {useAssignmentReviewScope} from '@/hooks/useAssignmentReview';
import ReviewTrainingsModal from '@/pages/agency/trainings/reviewTrainingsModal';
import {getClientCompetencies, saveClientCompetency, type CompetencyDTO, type CompetencyKey, type NeedsScope} from '@/lib/api/client-needs';

type Props = NeedsScope & {employeeId: string; employeeName?: string; onViewNeeds?: () => void};
type Editor = {key: CompetencyKey; result: 'verified' | 'not_verified'; basis: string; validUntil: string; certificate?: {trainingId: string; certificateId: string}};
const names = {medication_support: 'Medication support', medical_acuity: 'Medical support', behavioral_acuity: 'Behavioral support'};
const states = {needs_not_recorded: 'Needs not recorded', not_required: 'Not required', not_recorded: 'No verification recorded', verified: 'Verification recorded', not_verified: 'Not verified', needs_review: 'Needs review'};
const reasons: Record<string, string> = {employee_changed: 'The employee identity changed.', self_review: 'The recorded reviewer now matches this employee.', needs_changed: 'Client needs changed.', evidence_changed: 'The completion certificate changed.', evidence_ownership_changed: 'The certificate no longer matches this employee and agency.', evidence_not_accepted: 'The current certificate is not accepted.', invalid_validity: 'The recorded validity date needs review.', invalid_timezone: 'The agency time zone needs review.', validity_expired: 'The recorded validity date has passed.', validity_expires_today: 'The recorded validity date is today.'};
const conflicts: Record<string, string> = {CLIENT_NEEDS_CHANGED: 'Client needs changed.', COMPETENCY_REVIEW_CHANGED: 'Another review was saved.', TRAINING_EVIDENCE_CHANGED: 'Certificate changed.'};

export function ClientCompetencyPanel(props: Props) {
  const actorScope = useAssignmentReviewScope();
  return <CompetencyEditor key={JSON.stringify([actorScope, props.clientId, props.agencyId, props.program, props.employeeId])} {...props} />;
}
function CompetencyEditor({clientId, agencyId, program, employeeId, employeeName, onViewNeeds}: Props) {
  const id = useId();
  const [data, setData] = useState<CompetencyDTO>();
  const [editor, setEditor] = useState<Editor>();
  const [loading, setLoading] = useState(true), [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState(false), [denied, setDenied] = useState(false);
  const [message, setMessage] = useState(''), [picker, setPicker] = useState(false), [calendar, setCalendar] = useState(false);
  const mounted = useRef(true), generation = useRef(0), request = useRef<AbortController | undefined>(undefined);
  const scope = {clientId, agencyId, program};
  const load = useCallback(async () => {
    const sequence = ++generation.current;
    request.current?.abort(); request.current = new AbortController();
    setLoading(true); setMessage('');
    try {
      const next = await getClientCompetencies({clientId, agencyId, program}, employeeId, request.current.signal);
      if (!mounted.current || sequence !== generation.current) return;
      setData(next); setConflict(false); setDenied(false);
      if (next.coverage !== 'complete' || !next.canVerify) {setEditor(undefined); setPicker(false); setCalendar(false);}
      else setEditor(current => current && {...current, certificate: undefined});
    } catch (error) {
      if (!mounted.current || sequence !== generation.current) return;
      const status = (error as {response?: {status: number}})?.response?.status;
      const noAccess = [400, 401, 403, 404].includes(status ?? 0);
      setData(undefined); setDenied(noAccess); setMessage(noAccess ? "You don't have access to these records." : 'Competency records unavailable. Try again.');
      if (noAccess) {setEditor(undefined); setPicker(false); setCalendar(false);}
    } finally {if (mounted.current && sequence === generation.current) setLoading(false);}
  }, [clientId, agencyId, program, employeeId]);
  useEffect(() => {mounted.current = true; void load(); return () => {mounted.current = false; generation.current++; request.current?.abort();};}, [load]);
  const ready = data?.coverage === 'complete' ? data : undefined;
  const item = ready?.items.find(row => row.requirementKey === editor?.key);
  const applicable = item && !['needs_not_recorded', 'not_required'].includes(item.state);
  async function save() {
    if (!ready?.canVerify || !editor || !item || saving || loading || conflict || !applicable || !editor.basis.trim() || (editor.result === 'verified' && !editor.certificate)) return;
    const sequence = generation.current;
    setSaving(true); setMessage('');
    try {
      const saved = await saveClientCompetency(scope, employeeId, editor.key, {expectedNeedsRevision: ready.needsRevision, expectedReviewRevision: item.reviewRevision, result: editor.result, basis: editor.basis.trim(),
        ...(editor.result === 'verified' ? {...editor.certificate, ...(editor.validUntil ? {validUntil: editor.validUntil} : {})} : {})});
      if (!mounted.current || sequence !== generation.current) return;
      setData({...ready, needsRevision: saved.needsRevision, items: ready.items.map(row => row.requirementKey === saved.item.requirementKey ? saved.item : row)});
      setEditor(undefined); setPicker(false); setCalendar(false); setMessage('Review saved.');
    } catch (error) {
      if (!mounted.current || sequence !== generation.current) return;
      const status = (error as {response?: {status: number}})?.response?.status;
      const code = (error as {response?: {data?: {code?: string}}})?.response?.data?.code;
      if (status === 409) {setConflict(true); setEditor(current => current && {...current, certificate: undefined}); setMessage(`${conflicts[code || ''] || 'Records changed.'} Reload and review the current records before saving.`);}
      else if (status === 400 && code === 'INVALID_COMPETENCY_VALIDITY') setMessage("Choose a validity date after today in the agency's time zone, or leave it empty if no date was recorded.");
      else if ([401, 403, 404].includes(status ?? 0)) {setData(undefined); setEditor(undefined); setPicker(false); setCalendar(false); setDenied(true); setMessage("You don't have access to these records.");}
      else setMessage('Verification could not be saved. Try again.');
    } finally {if (mounted.current && sequence === generation.current) setSaving(false);}
  }
  return <section aria-label="Client competency" className="mt-3 min-w-0 rounded-[20px] border border-border bg-white p-4 text-sm">
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">Client-specific competency</h3>
      {!denied && <Button type="button" variant="outline" size="sm" disabled={loading || saving} onClick={() => void load()}>{conflict ? 'Reload competency records' : 'Refresh competency'}</Button>}
    </div>
    <p className="my-2 text-muted-foreground">This records the agency's verification for this client. It does not confirm clinical clearance or change assignment eligibility.</p>
    {onViewNeeds && <Button type="button" variant="link" className="px-0" onClick={onViewNeeds}>View recorded client needs</Button>}
    {loading && <p role="status">Loading competency records…</p>}
    {message && <p role="status">{message}</p>}
    {data?.coverage === 'restricted' && <p>Training records are restricted.</p>}
    {data?.coverage === 'unavailable' && <p>Competency records unavailable. Review the client needs first.</p>}
    {ready?.items.map(row => <div key={row.requirementKey} className="mt-3 border-t border-border pt-3">
      <h4 className="font-medium">{names[row.requirementKey]}</h4><p>{states[row.state]}</p>
      {row.reasonCode && <p className="text-muted-foreground">{reasons[row.reasonCode] || 'The needs, employee or certificate records need review.'}</p>}
      {row.review && <div className="mt-1 break-words text-muted-foreground"><p>Recorded by {row.review.reviewerUid}{row.review.reviewedAt ? ` on ${new Date(row.review.reviewedAt).toLocaleString()}` : ''}. {row.review.basis}</p>
        {row.review.result === 'verified' && <p>{row.review.validUntil ? `Recorded valid until ${row.review.validUntil}` : 'Validity not recorded'}</p>}</div>}
      {ready.canVerify && !editor && !['needs_not_recorded', 'not_required'].includes(row.state) && <div className="mt-2 flex flex-wrap gap-2">
        {(['verified', 'not_verified'] as const).map(result => <Button key={result} type="button" variant="outline" size="sm" aria-label={`${result === 'verified' ? 'Record verification' : 'Record not verified'} for ${names[row.requirementKey]}`} onClick={() => {setMessage(''); setEditor({key: row.requirementKey, result, basis: '', validUntil: ''});}}>{result === 'verified' ? 'Record verification' : 'Record not verified'}</Button>)}
      </div>}
      {editor?.key === row.requirementKey && ready.canVerify && <fieldset disabled={saving || loading} className="mt-3 min-w-0 space-y-3">
        <p>{editor.result === 'verified' ? 'Record verification' : 'Record not verified'}</p>
        <div><label htmlFor={`${id}-basis`}>Verification basis</label><Textarea id={`${id}-basis`} maxLength={500} value={editor.basis} onChange={event => setEditor({...editor, basis: event.target.value})} /></div>
        {editor.result === 'verified' && <>
          <Button type="button" variant="outline" disabled={conflict || !applicable} onClick={() => setPicker(true)}>Choose completion certificate</Button>
          {editor.certificate && <p>Completion certificate selected.</p>}
          <div><label id={`${id}-validity`}>Valid until (optional)</label><Popover open={calendar} onOpenChange={setCalendar}><PopoverTrigger asChild><Button type="button" variant="outline" aria-labelledby={`${id}-validity`} className="ml-2">{editor.validUntil || 'Choose date'}</Button></PopoverTrigger>
            <PopoverContent className="w-auto bg-white p-0"><Calendar mode="single" selected={editor.validUntil ? parseISO(editor.validUntil) : undefined} onSelect={date => {setEditor({...editor, validUntil: date ? format(date, 'yyyy-MM-dd') : ''}); setCalendar(false);}} autoFocus /></PopoverContent></Popover>
            {editor.validUntil && <Button type="button" variant="link" onClick={() => setEditor({...editor, validUntil: ''})}>Clear date</Button>}</div>
          <p className="text-muted-foreground">Leave empty if no validity date was recorded.</p>
        </>}
        {!applicable && <p>The current needs do not require this verification. Review the client needs before continuing.</p>}
        <div className="flex flex-wrap gap-2"><Button type="button" disabled={conflict || !applicable || !editor.basis.trim() || (editor.result === 'verified' && !editor.certificate)} onClick={() => void save()}>Save verification</Button>
          <Button type="button" variant="outline" onClick={() => {setEditor(undefined); setPicker(false); setCalendar(false);}}>Cancel</Button></div>
      </fieldset>}
    </div>)}
    {picker && ready?.canVerify && <ReviewTrainingsModal open onOpenChange={setPicker} employee={{id: employeeId, fullName: employeeName || 'Selected employee', role: 'Staff'}} agencyId={agencyId} mode={program} readOnly onSelectCertificate={certificate => {setEditor(current => current && {...current, certificate}); setPicker(false);}} />}
  </section>;
}
