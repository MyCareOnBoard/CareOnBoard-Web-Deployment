import {useCallback, useEffect, useId, useRef, useState} from 'react';
import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {DocumentPreviewModal} from '@/components/documents/DocumentPreviewModal';
import {useAssignmentReviewScope} from '@/hooks/useAssignmentReview';
import {getClientNeeds, saveClientNeeds, reviewClientAenf, type NeedsAnswers, type NeedsDTO, type NeedsScope} from '@/lib/api/client-needs';
import type {ClientDocument} from '@/lib/api/clients';

export type ClientNeedsDraft = {scopeKey: string; answers: NeedsAnswers; revision: number};
type Props = Omit<NeedsScope, 'clientId'> & {
  clientId?: string; documents?: ClientDocument[]; documentsDirty?: boolean; documentsBusy?: boolean;
  onUploadAenf?: () => void; draft?: ClientNeedsDraft; onDraftChange?: (draft: ClientNeedsDraft | undefined) => void;
  onRefreshDocuments?: () => Promise<unknown>;
};
const choices = [['yes', 'Yes'], ['no', 'No'], ['unknown', 'Not recorded']] as const;
const labels = {medicationSupport: 'Medication support needed', medicalAcuity: 'Medical support needs identified', behavioralAcuity: 'Behavioral support needs identified', aenfApplicability: 'AENF required'};
const statusLabels = {applicability_not_recorded: 'Applicability not recorded', not_required: 'Not required', missing: 'No AENF on file', on_file: 'Evidence on file', verified: 'Verification recorded', not_verified: 'Not verified', needs_review: 'Needs review'};
const reasons: Record<string, string> = {needs_changed: 'Client needs changed.', evidence_changed: 'The reviewed AENF changed.', duplicate_evidence: 'Multiple AENF files need review.', invalid_reference: 'An AENF file reference needs review.', invalid_documents: 'Document records could not be evaluated.', expired_evidence: 'The recorded expiry date has passed.', expires_today: 'The recorded expiry date is today.', invalid_timezone: 'The agency time zone needs review.'};
const conflictText: Record<string, string> = {CLIENT_NEEDS_CHANGED: 'Client needs changed.', AENF_EVIDENCE_CHANGED: 'AENF changed.', AENF_REVIEW_CHANGED: 'Another review was saved.'};
const normalized = (answers: NeedsAnswers): NeedsAnswers => ({...answers,
  medicationSupportDescription: answers.medicationSupport === 'yes' ? answers.medicationSupportDescription?.trim() || null : null,
  aenfBasis: answers.aenfApplicability === 'unknown' ? null : answers.aenfBasis?.trim() || null});
const answerKey = (answers: NeedsAnswers) => JSON.stringify(normalized(answers));

export function ClientNeedsPanel(props: Props) {
  const actorScope = useAssignmentReviewScope();
  const scopeKey = JSON.stringify([actorScope, props.clientId, props.agencyId, props.program]);
  return <NeedsEditor key={scopeKey} {...props} scopeKey={scopeKey} />;
}

function NeedsEditor({clientId, agencyId, program, documents, documentsDirty = false, documentsBusy = false, onUploadAenf, onRefreshDocuments, draft, onDraftChange, scopeKey}: Props & {scopeKey: string}) {
  const id = useId();
  const [loaded, setLoaded] = useState<NeedsDTO>();
  const [editing, setEditing] = useState<ClientNeedsDraft | undefined>(draft?.scopeKey === scopeKey ? draft : undefined);
  const editingRef = useRef(editing); editingRef.current = editing;
  const draftCallback = useRef(onDraftChange); draftCallback.current = onDraftChange;
  const refreshDocuments = useRef(onRefreshDocuments); refreshDocuments.current = onRefreshDocuments;
  const reloadWanted = useRef(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [comparison, setComparison] = useState(false);
  const [message, setMessage] = useState('');
  const [denied, setDenied] = useState(false);
  const [reviewBasis, setReviewBasis] = useState('');
  const [reviewResult, setReviewResult] = useState<'verified' | 'not_verified'>('verified');
  const [selected, setSelected] = useState('');
  const [preview, setPreview] = useState<ClientDocument | null>(null);
  const generation = useRef(0);
  const mounted = useRef(true);
  const request = useRef<AbortController | undefined>(undefined);
  const loadedDocumentKey = useRef<string | undefined>(undefined);
  const aenfRecords = (Array.isArray(documents) ? documents : []).filter(doc => doc?.key === 'aenf');
  const evidence = aenfRecords.filter(doc => typeof doc.url === 'string' && doc.url.trim());
  const documentKey = JSON.stringify(Array.isArray(documents) || documents == null ? aenfRecords.map(doc => [doc.url, doc.issuedOnDate ?? null, doc.expiryDate ?? null]) : 'invalid_documents');
  const scope: NeedsScope | undefined = clientId ? {clientId, agencyId, program} : undefined;
  function keepDraft(next: ClientNeedsDraft | undefined) { editingRef.current = next; setEditing(next); draftCallback.current?.(next); }
  const load = useCallback(async (reload = false) => {
    if (!clientId) return;
    const sequence = ++generation.current;
    request.current?.abort(); request.current = new AbortController();
    setLoading(true); setMessage('');
    try {
      if (reload) {
        reloadWanted.current = true;
        if (await refreshDocuments.current?.() === false) throw new Error('Document records unavailable.');
      }
      if (!mounted.current || sequence !== generation.current) return;
      const data = await getClientNeeds({clientId, agencyId, program}, request.current.signal);
      if (!mounted.current || sequence !== generation.current) return;
      setLoaded(data); setDenied(false);
      if (data.state !== 'ready' || !data.canEdit) keepDraft(undefined);
      else if (editingRef.current) {
        if (reloadWanted.current) {
          keepDraft({...editingRef.current, revision: data.revision}); setComparison(true); setConflict(false);
        } else if (editingRef.current.revision !== data.revision) {
          setConflict(true); setMessage('Client needs changed. Reload the saved assessment before saving your edits.');
        }
      }
      if (reloadWanted.current) {setConflict(false); reloadWanted.current = false;}
    } catch (error) {
      if (!mounted.current || sequence !== generation.current) return;
      reloadWanted.current = false;
      const status = (error as {response?: {status: number}})?.response?.status;
      setLoaded(undefined);
      const noAccess = [400, 401, 403, 404].includes(status ?? 0);
      setDenied(noAccess); setMessage(noAccess ? "You don't have access to these records." : 'Records unavailable. Try again.');
      if (noAccess) {keepDraft(undefined); setReviewBasis(''); setSelected(''); setPreview(null);}
    } finally {if (mounted.current && sequence === generation.current) setLoading(false);}
  }, [clientId, agencyId, program]);
  useEffect(() => {
    mounted.current = true;
    if (draft && draft.scopeKey !== scopeKey) draftCallback.current?.(undefined);
    return () => {mounted.current = false; generation.current++; request.current?.abort();};
  }, [scopeKey]);
  useEffect(() => {
    if (saving || loadedDocumentKey.current === documentKey) return;
    loadedDocumentKey.current = documentKey;
    setSelected(''); setPreview(null); void load();
  }, [load, documentKey, saving]);

  if (!scope) return <p className="text-sm text-muted-foreground">Save the client to record these needs.</p>;
  const ready = loaded?.state === 'ready' ? loaded : undefined;
  const answers = editing?.answers || ready?.answers;
  const dirty = !!(ready && answers && answerKey(answers) !== answerKey(ready.answers));
  const valid = !!answers && (answers.medicationSupport !== 'yes' || !!answers.medicationSupportDescription?.trim()) && (answers.aenfApplicability === 'unknown' || !!answers.aenfBasis?.trim());
  const document = evidence[Number(selected || 0)];
  function edit(field: keyof NeedsAnswers, value: string) {
    if (!ready || !ready.canEdit || saving) return;
    keepDraft({scopeKey, revision: editing?.revision ?? ready.revision, answers: {...answers!, [field]: value}});
    setMessage('');
  }
  async function save(review = false) {
    if (!scope || !ready?.canEdit || saving || conflict) return;
    if (review && (dirty || documentsDirty || documentsBusy || !document || !reviewBasis.trim())) return;
    if (!review && (!valid || !dirty)) return;
    setSaving(true); setMessage('');
    request.current?.abort(); const sequence = ++generation.current;
    try {
      const data = review
        ? await reviewClientAenf(scope, {expectedNeedsRevision: ready.revision, expectedReviewRevision: ready.aenf.reviewRevision, result: reviewResult, basis: reviewBasis.trim(), document: {url: document!.url!, issuedOnDate: document!.issuedOnDate ?? null, expiryDate: document!.expiryDate ?? null}})
        : await saveClientNeeds(scope, {...normalized(answers!), expectedRevision: editing?.revision ?? ready.revision});
      if (!mounted.current || sequence !== generation.current) return;
      setLoaded(data); keepDraft(undefined); setComparison(false); setReviewBasis('');
      setMessage(review ? 'Review recorded.' : 'Needs saved.');
    } catch (error) {
      if (!mounted.current || sequence !== generation.current) return;
      const response = (error as {response?: {status: number; data?: {code?: string}}})?.response;
      if (response?.status === 409) {setConflict(true); setMessage(`${conflictText[response.data?.code || ''] || 'These records changed.'} Reload the saved assessment before saving your edits.`);}
      else if ([401, 403, 404].includes(response?.status ?? 0)) {setLoaded(undefined); setDenied(true); keepDraft(undefined); setReviewBasis(''); setPreview(null); setMessage("You don't have access to these records.");}
      else setMessage(review ? 'Review could not be saved. Your edits are retained.' : 'Needs could not be saved. Your edits are retained.');
    } finally {if (mounted.current && sequence === generation.current) {setSaving(false); setLoading(false);}}
  }
  return <section className="my-6 rounded-2xl border border-border bg-white p-5" aria-label="Client needs and AENF">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">Client needs and AENF</h2>
      {!denied && <Button type="button" variant="outline" disabled={loading || saving || documentsBusy} onClick={() => void load(true)}>{conflict ? 'Reload saved assessment' : 'Refresh needs'}</Button>}
    </div>
    <p className="mt-2 text-sm text-muted-foreground">This records the agency's assessment. It does not confirm clinical clearance.</p>
    {loading && <p role="status">Loading needs…</p>}
    {message && <p className="mt-3 text-sm" role="status">{message}</p>}
    {loaded?.state === 'unavailable' && <p role="alert">Records unavailable. Ask your agency administrator to review the saved assessment.</p>}
    {ready && answers && <>
      {comparison && <div className="my-3 rounded-lg bg-muted p-3 text-sm"><h3 className="font-medium">Saved assessment</h3><p>Review these saved values against your retained edits before saving.</p><dl>{(Object.keys(labels) as Array<keyof typeof labels>).map(field => <div key={field}><dt className="inline font-medium">{labels[field]}: </dt><dd className="inline">{ready.answers[field].replaceAll('_', ' ')}</dd></div>)}<dt>Medication support description</dt><dd>{ready.answers.medicationSupportDescription || 'Not recorded'}</dd><dt>AENF basis</dt><dd>{ready.answers.aenfBasis || 'Not recorded'}</dd></dl></div>}
      <fieldset disabled={saving || loading || !ready.canEdit} className="mt-4 min-w-0 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">{(Object.keys(labels) as Array<keyof typeof labels>).map(field => <div key={field}>
          <label htmlFor={`${id}-${field}`} className="mb-1 block text-sm font-medium">{labels[field]}</label>
          <Select value={answers[field]} onValueChange={value => edit(field, value)} disabled={!ready.canEdit || saving || loading}>
            <SelectTrigger className="w-full" id={`${id}-${field}`}><SelectValue /></SelectTrigger><SelectContent>
              {(field === 'aenfApplicability' ? [['required', 'Required'], ['not_required', 'Not required'], ['unknown', 'Not recorded']] : choices).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>)}</div>
        {answers.medicationSupport === 'yes' && <div><label htmlFor={`${id}-description`} className="text-sm font-medium">Medication support description</label><Textarea id={`${id}-description`} maxLength={500} value={answers.medicationSupportDescription || ''} onChange={event => edit('medicationSupportDescription', event.target.value)} /></div>}
        {answers.aenfApplicability !== 'unknown' && <div><label htmlFor={`${id}-basis`} className="text-sm font-medium">AENF applicability basis</label><Textarea id={`${id}-basis`} maxLength={500} value={answers.aenfBasis || ''} onChange={event => edit('aenfBasis', event.target.value)} /></div>}
        {ready.canEdit && <div className="flex flex-wrap items-center gap-3"><Button type="button" disabled={!valid || !dirty || conflict || saving || loading} onClick={() => void save()}>Save needs</Button><p className="text-sm text-muted-foreground">Client details and needs are saved separately.</p></div>}
      </fieldset>
      <div className="mt-5 border-t border-border pt-4">
        <h3 className="font-medium">AENF evidence (optional)</h3><p className="mt-1 text-sm">{statusLabels[ready.aenf.state]}</p>
        {ready.aenf.reasonCode && <p className="text-sm text-muted-foreground">{reasons[ready.aenf.reasonCode] || 'The recorded file dates need review.'}</p>}
        {ready.aenf.review && <p className="mt-2 break-words text-sm">{statusLabels[ready.aenf.review.result]} by {ready.aenf.review.reviewerUid}{ready.aenf.review.reviewedAt ? ` on ${new Date(ready.aenf.review.reviewedAt).toLocaleString()}` : ''}. {ready.aenf.review.basis}</p>}
        <div className="my-3 flex flex-wrap gap-2">{evidence.map((doc, index) => <Button key={`${doc.url}-${index}`} className="h-auto min-h-11 max-w-full whitespace-normal break-all py-2" variant="outline" type="button" onClick={() => setPreview(doc)}>{doc.fileName || `View AENF ${index + 1}`}</Button>)}
          {onUploadAenf && ready.canEdit && <Button type="button" variant="outline" disabled={documentsDirty || documentsBusy || saving} onClick={onUploadAenf}>Upload AENF</Button>}
        </div>
        {(dirty || documentsDirty) && <p className="text-sm text-muted-foreground">Save changes before recording a review.</p>}
        {ready.canEdit && ready.answers.aenfApplicability === 'required' && evidence.length > 0 && <fieldset className="mt-3 min-w-0 space-y-3" disabled={saving || loading || conflict || dirty || documentsDirty || documentsBusy}>
          {evidence.length > 1 && <div><label htmlFor={`${id}-document`}>AENF to review</label><Select value={selected} onValueChange={setSelected}><SelectTrigger className="w-full" id={`${id}-document`}><SelectValue placeholder="Select an AENF" /></SelectTrigger><SelectContent>{evidence.map((doc, index) => <SelectItem key={index} value={String(index)}>{doc.fileName || `AENF ${index + 1}`}</SelectItem>)}</SelectContent></Select></div>}
          <div><label htmlFor={`${id}-result`} className="text-sm font-medium">Review result</label><Select value={reviewResult} onValueChange={value => setReviewResult(value as typeof reviewResult)}><SelectTrigger className="w-full" id={`${id}-result`}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="verified">Verification recorded</SelectItem><SelectItem value="not_verified">Not verified</SelectItem></SelectContent></Select></div>
          <div><label htmlFor={`${id}-review-basis`} className="text-sm font-medium">Review basis</label><Textarea id={`${id}-review-basis`} maxLength={500} value={reviewBasis} onChange={event => setReviewBasis(event.target.value)} /></div>
          <Button type="button" disabled={!reviewBasis.trim() || !document || (evidence.length > 1 && !selected)} onClick={() => void save(true)}>Record review</Button>
        </fieldset>}
      </div>
    </>}
    <DocumentPreviewModal open={!!preview} onOpenChange={open => {if (!open) setPreview(null);}} title={preview?.title || 'AENF'} url={preview?.url} fileName={preview?.fileName} />
  </section>;
}
