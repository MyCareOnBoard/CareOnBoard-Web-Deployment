import {useCallback, useEffect, useId, useRef, useState} from 'react';
import {format, parseISO} from 'date-fns';
import {AlertCircle, CalendarDays, CheckCircle2, FileCheck2, PenLine, RefreshCw, ShieldCheck} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';
import {Calendar} from '@/components/ui/calendar';
import {Popover, PopoverContent, PopoverTrigger} from '@/components/ui/popover';
import {useAssignmentReviewScope} from '@/hooks/useAssignmentReview';
import ReviewTrainingsModal from '@/pages/agency/trainings/reviewTrainingsModal';
import {getClientCompetencies, saveClientCompetency, type CompetencyDTO, type CompetencyKey, type NeedsScope} from '@/lib/api/client-needs';

type Props = NeedsScope & {employeeId: string; employeeName?: string; onViewNeeds?: () => void;
  /** Show only this requirement, e.g. medication support from an assignment check. */
  only?: CompetencyKey;
  /** Open the "Record verification" form for `only` as soon as it can be recorded. */
  startVerifying?: boolean;
  onSaved?: () => void};
type Editor = {key: CompetencyKey; result: 'verified' | 'not_verified'; basis: string; validUntil: string; certificate?: {trainingId: string; certificateId: string}; certificateName?: string};
const names = {medication_support: 'Medication support', medical_acuity: 'Medical support', behavioral_acuity: 'Behavioral support'};
const stateTone: Record<string, string> = {needs_not_recorded: 'bg-[#f5f9f9] text-[#627476]', not_required: 'bg-[#f5f9f9] text-[#627476]', not_recorded: 'bg-[#faf3e4] text-[#88601d]', verified: 'bg-[#e5f7f7] text-[#006b6e]', not_verified: 'bg-[#fff1eb] text-[#b14d35]', needs_review: 'bg-[#faf3e4] text-[#88601d]'};
const states = {needs_not_recorded: 'Needs not recorded', not_required: 'Not required', not_recorded: 'No verification recorded', verified: 'Verification recorded', not_verified: 'Not verified', needs_review: 'Needs review'};
const reasons: Record<string, string> = {employee_changed: 'The employee identity changed.', self_review: 'The recorded reviewer now matches this employee.', needs_changed: 'Client needs changed.', evidence_changed: 'The completion certificate changed.', evidence_ownership_changed: 'The certificate no longer matches this employee and agency.', evidence_not_accepted: 'The current certificate is not accepted.', invalid_validity: 'The recorded validity date needs review.', invalid_timezone: 'The agency time zone needs review.', validity_expired: 'The recorded validity date has passed.', validity_expires_today: 'The recorded validity date is today.'};
const conflicts: Record<string, string> = {CLIENT_NEEDS_CHANGED: 'Client needs changed.', COMPETENCY_REVIEW_CHANGED: 'Another review was saved.', TRAINING_EVIDENCE_CHANGED: 'Certificate changed.'};

// What still has to be filled in before a review can be saved, worded for the hint under the form.
function missingFields(editor: Editor): string[] {
  return [...(editor.result === 'verified' && !editor.certificate ? ['choose a completion certificate'] : []), ...(!editor.basis.trim() ? ['write the verification basis'] : [])];
}

export function ClientCompetencyPanel(props: Props) {
  const actorScope = useAssignmentReviewScope();
  return <CompetencyEditor key={JSON.stringify([actorScope, props.clientId, props.agencyId, props.program, props.employeeId])} {...props} />;
}
function CompetencyEditor({clientId, agencyId, program, employeeId, employeeName, onViewNeeds, only, startVerifying, onSaved}: Props) {
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
      else setEditor(current => current && {...current, certificate: undefined, certificateName: undefined});
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
  const autoOpened = useRef(false);
  useEffect(() => {
    if (!startVerifying || !only || autoOpened.current || !ready?.canVerify) return;
    const row = ready.items.find(item => item.requirementKey === only);
    if (!row || ['needs_not_recorded', 'not_required', 'verified'].includes(row.state)) return;
    autoOpened.current = true;
    setEditor({key: only, result: 'verified', basis: '', validUntil: ''});
  }, [startVerifying, only, ready]);
  const item = ready?.items.find(row => row.requirementKey === editor?.key);
  const applicable = item && !['needs_not_recorded', 'not_required'].includes(item.state);
  async function save() {
    if (!ready?.canVerify || !editor || !item || saving || loading || conflict || !applicable || missingFields(editor).length > 0) return;
    const sequence = generation.current;
    setSaving(true); setMessage('');
    try {
      const saved = await saveClientCompetency(scope, employeeId, editor.key, {expectedNeedsRevision: ready.needsRevision, expectedReviewRevision: item.reviewRevision, result: editor.result, basis: editor.basis.trim(),
        ...(editor.result === 'verified' ? {...editor.certificate, ...(editor.validUntil ? {validUntil: editor.validUntil} : {})} : {})});
      if (!mounted.current || sequence !== generation.current) return;
      setData({...ready, needsRevision: saved.needsRevision, items: ready.items.map(row => row.requirementKey === saved.item.requirementKey ? saved.item : row)});
      setEditor(undefined); setPicker(false); setCalendar(false); setMessage('Review saved.');
      onSaved?.();
    } catch (error) {
      if (!mounted.current || sequence !== generation.current) return;
      const status = (error as {response?: {status: number}})?.response?.status;
      const code = (error as {response?: {data?: {code?: string}}})?.response?.data?.code;
      if (status === 409) {setConflict(true); setEditor(current => current && {...current, certificate: undefined, certificateName: undefined}); setMessage(`${conflicts[code || ''] || 'Records changed.'} Reload and review the current records before saving.`);}
      else if (status === 400 && code === 'INVALID_COMPETENCY_VALIDITY') setMessage("Choose a validity date after today in the agency's time zone, or leave it empty if no date was recorded.");
      else if ([401, 403, 404].includes(status ?? 0)) {setData(undefined); setEditor(undefined); setPicker(false); setCalendar(false); setDenied(true); setMessage("You don't have access to these records.");}
      else setMessage('Verification could not be saved. Try again.');
    } finally {if (mounted.current && sequence === generation.current) setSaving(false);}
  }
  return <section aria-label="Client competency" className="mt-3 min-w-0 overflow-hidden rounded-[20px] border border-[#dce6e8] bg-white text-sm shadow-[0_1px_2px_rgba(22,42,44,0.04)]">
    <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[#e2eaea] bg-[#f5f9f9] px-4 py-3">
      <div className="flex min-w-0 items-start gap-3">
        <span aria-hidden className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-[#e5f7f7] text-[#008c90]"><ShieldCheck className="size-5" /></span>
        <div className="min-w-0">
          <h3 className="font-semibold text-[#162a2c]">Client-specific competency</h3>
          <p className="mt-0.5 text-xs leading-5 text-[#627476]">This records the agency's verification for this client. A recorded verification backed by an accepted certificate meets the client-specific training check for this staff member's shifts. It does not confirm clinical clearance.</p>
        </div>
      </div>
      {!denied && <Button type="button" variant="ghost" size="sm" className="shrink-0 rounded-full text-[#008c90] hover:bg-[#e5f7f7]" disabled={loading || saving} onClick={() => void load()}>
        <RefreshCw aria-hidden className={`size-4 ${loading ? 'animate-spin' : ''}`} />{conflict ? 'Reload competency records' : 'Refresh competency'}</Button>}
    </header>
    <div className="space-y-3 p-4">
      {onViewNeeds && <Button type="button" variant="link" className="h-auto px-0 text-[#008c90]" onClick={onViewNeeds}>View recorded client needs</Button>}
      {loading && <p role="status" className="flex items-center gap-2 text-[#627476]"><RefreshCw aria-hidden className="size-4 animate-spin" />Loading competency records…</p>}
      {message && <p role="status" className={`rounded-[12px] px-3 py-2 ${message === 'Review saved.' ? 'bg-[#e5f7f7] text-[#006b6e]' : 'bg-[#faf3e4] text-[#5f4413]'}`}>{message}</p>}
      {data?.coverage === 'restricted' && <p className="text-[#627476]">Training records are restricted.</p>}
      {data?.coverage === 'unavailable' && <p className="text-[#627476]">Competency records unavailable. Review the client needs first.</p>}
      {ready && !ready.canVerify && only && <p className="rounded-[12px] bg-[#f5f9f9] px-3 py-2 text-[#627476]">Only the agency owner can record this verification.</p>}
      {ready?.items.filter(row => !only || row.requirementKey === only).map(row => <div key={row.requirementKey} className="rounded-[16px] border border-[#e2eaea] p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="font-medium text-[#162a2c]">{names[row.requirementKey]}</h4>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${stateTone[row.state]}`}>{states[row.state]}</span>
        </div>
        {row.reasonCode && <p className="mt-1 text-xs text-[#88601d]">{reasons[row.reasonCode] || 'The needs, employee or certificate records need review.'}</p>}
        {row.review && <div className="mt-2 break-words rounded-[12px] bg-[#f5f9f9] px-3 py-2 text-xs text-[#627476]"><p>Recorded by {row.review.reviewerUid}{row.review.reviewedAt ? ` on ${new Date(row.review.reviewedAt).toLocaleString()}` : ''}. {row.review.basis}</p>
          {row.review.result === 'verified' && <p>{row.review.validUntil ? `Recorded valid until ${row.review.validUntil}` : 'Validity not recorded'}</p>}</div>}
        {ready.canVerify && !editor && !['needs_not_recorded', 'not_required'].includes(row.state) && <div className="mt-3 flex flex-wrap gap-2">
          {(['verified', 'not_verified'] as const).map(result => <Button key={result} type="button" variant={result === 'verified' ? 'default' : 'outline'} size="sm" className="rounded-full" aria-label={`${result === 'verified' ? 'Record verification' : 'Record not verified'} for ${names[row.requirementKey]}`} onClick={() => {setMessage(''); setEditor({key: row.requirementKey, result, basis: '', validUntil: ''});}}>{result === 'verified' ? 'Record verification' : 'Record not verified'}</Button>)}
        </div>}
        {editor?.key === row.requirementKey && ready.canVerify && <fieldset disabled={saving || loading} className="mt-3 min-w-0 space-y-3 border-t border-[#e2eaea] pt-3">
          <legend className="sr-only">{editor.result === 'verified' ? 'Record verification' : 'Record not verified'}</legend>
          <p aria-hidden className="text-xs font-semibold uppercase tracking-wide text-[#008c90]">{editor.result === 'verified' ? 'Record verification' : 'Record not verified'}</p>
          {editor.result === 'verified' && <div className={`rounded-[14px] border px-3 py-3 ${editor.certificate ? 'border-[#008c90]/40 bg-[#e5f7f7]/60' : 'border-dashed border-[#dce6e8]'}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <span aria-hidden className={`flex size-8 shrink-0 items-center justify-center rounded-full ${editor.certificate ? 'bg-[#008c90] text-white' : 'bg-[#f5f9f9] text-[#627476]'}`}>{editor.certificate ? <CheckCircle2 className="size-4" /> : <FileCheck2 className="size-4" />}</span>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-[#627476]">{editor.certificate ? 'Completion certificate selected.' : 'Completion certificate'}</p>
                  <p className={editor.certificate ? 'truncate font-medium text-[#162a2c]' : 'text-[#162a2c]'}>{editor.certificate ? editor.certificateName || 'Accepted certificate' : 'No certificate chosen yet'}</p>
                </div>
              </div>
              <Button type="button" variant="outline" size="sm" className="rounded-full" disabled={conflict || !applicable} onClick={() => setPicker(true)}>Choose completion certificate</Button>
            </div>
          </div>}
          <div className={`rounded-[14px] border-2 px-3 py-3 transition-colors ${editor.basis.trim() ? 'border-[#008c90]/50 bg-white' : 'border-[#c99a3a] bg-[#faf3e4]'}`}>
            <label htmlFor={`${id}-basis`} className="flex items-center gap-2 font-semibold text-[#162a2c]"><PenLine aria-hidden className="size-4 text-[#008c90]" />Verification basis <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-[#88601d]">(required)</span></label>
            <p id={`${id}-basis-hint`} className="mt-1 text-xs text-[#627476]">Say how you confirmed this staff member can support this client.</p>
            <Textarea id={`${id}-basis`} aria-required="true" aria-describedby={`${id}-basis-hint`} maxLength={500} rows={3} className="mt-2 min-h-[88px] resize-y rounded-[12px] bg-white" placeholder="Example: Reviewed the certificate and observed this staff member supporting the client." value={editor.basis} onChange={event => setEditor({...editor, basis: event.target.value})} />
            <p aria-hidden className="mt-1 text-right text-[11px] text-[#627476]">{editor.basis.length}/500</p>
          </div>
          {editor.result === 'verified' && <div className="flex flex-wrap items-center gap-2">
            <label id={`${id}-validity`} className="flex items-center gap-1.5 text-[#162a2c]"><CalendarDays aria-hidden className="size-4 text-[#627476]" />Valid until (optional)</label>
            <Popover open={calendar} onOpenChange={setCalendar}><PopoverTrigger asChild><Button type="button" variant="outline" size="sm" aria-labelledby={`${id}-validity`} className="rounded-full">{editor.validUntil || 'Choose date'}</Button></PopoverTrigger>
              <PopoverContent className="w-auto bg-white p-0"><Calendar mode="single" selected={editor.validUntil ? parseISO(editor.validUntil) : undefined} onSelect={date => {setEditor({...editor, validUntil: date ? format(date, 'yyyy-MM-dd') : ''}); setCalendar(false);}} autoFocus /></PopoverContent></Popover>
            {editor.validUntil && <Button type="button" variant="link" size="sm" className="h-auto px-1 text-[#008c90]" onClick={() => setEditor({...editor, validUntil: ''})}>Clear date</Button>}
            <p className="w-full text-xs text-[#627476]">Leave empty if no validity date was recorded.</p>
          </div>}
          {!applicable && <p className="rounded-[12px] bg-[#faf3e4] px-3 py-2 text-[#5f4413]">The current needs do not require this verification. Review the client needs before continuing.</p>}
          {applicable && !conflict && missingFields(editor).length > 0 && <p id={`${id}-missing`} className="flex items-center gap-2 text-xs font-medium text-[#88601d]"><AlertCircle aria-hidden className="size-4 shrink-0" />To save, {missingFields(editor).join(' and ')}.</p>}
          <div className="flex flex-wrap justify-end gap-2 border-t border-[#e2eaea] pt-3">
            <Button type="button" variant="outline" className="rounded-full" onClick={() => {setEditor(undefined); setPicker(false); setCalendar(false);}}>Cancel</Button>
            <Button type="button" className="rounded-full" aria-describedby={applicable && !conflict && missingFields(editor).length ? `${id}-missing` : undefined} disabled={conflict || !applicable || missingFields(editor).length > 0} onClick={() => void save()}>{saving ? 'Saving…' : 'Save verification'}</Button>
          </div>
        </fieldset>}
      </div>)}
    </div>
    {picker && ready?.canVerify && <ReviewTrainingsModal open onOpenChange={setPicker} employee={{id: employeeId, fullName: employeeName || 'Selected employee', role: 'Staff'}} agencyId={agencyId} mode={program} readOnly onSelectCertificate={({name, ...certificate}) => {setEditor(current => current && {...current, certificate, certificateName: name}); setPicker(false);}} />}
  </section>;
}
