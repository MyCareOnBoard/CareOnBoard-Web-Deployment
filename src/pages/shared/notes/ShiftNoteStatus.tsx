import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { useGetShiftNoteComplianceDetailQuery } from '@/pages/agency/compliance-alerts/api';
import { shiftNoteLabels, ShiftNoteAction } from '@/pages/agency/compliance-alerts/apiTypes';
import { NOTE_ROUTES, NoteTypeId } from '@/lib/notes/noteTypes';
import { createEmployeeActivityLog } from '@/lib/api/employees';
import {visibleSourceData, SourceNotice} from '@/pages/agency/compliance-alerts/SourceControls';
const SubmittedNoteModal = lazy(() => import('./SubmittedNoteModal'));

const actionLabels = {start: 'Start note', continue: 'Continue note', correct: 'Correct note', view: 'View submitted note', review: 'Agency review'};
const descriptions: Record<string, string> = {
  missing: 'This shift ended without a submitted note.', draft: 'Your draft is saved. Submit it when it is complete.',
  needs_correction: 'Your note needs correction before submitting.', submitted: 'Submitted for agency review. No action is needed from you.',
  needs_review: 'This note needs agency review. You cannot edit it here.',
};
export default function ShiftNoteStatus(props: {scopeKey?: string; shiftId: string; agencyId: string; viewerId: string; mode?: string; employeeId?: string}) {
  const {currentData, error, isFetching, isError, refetch} = useGetShiftNoteComplianceDetailQuery(props, {skip: !props.viewerId || !props.agencyId});
  const item = visibleSourceData(currentData, error);
  const navigate = useNavigate();
  const startPending = useRef(false);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState(false);
  const [review, setReview] = useState<ShiftNoteAction | null>(null);
  useEffect(() => {if (error) setReview(null);}, [error]);
  const act = async (action: ShiftNoteAction) => {
    if (!item) return;
    if (action.submissionId) {setReview(action); return;}
    const route = NOTE_ROUTES[item.noteType as NoteTypeId];
    if (!route) return;
    let id = action.activityLogId;
    if (action.type === 'start') {
      if (startPending.current) return;
      startPending.current = true; setStarting(true); setStartError(false);
      try {
        const result = await createEmployeeActivityLog({shiftId: item.shiftId});
        if (!result.success || typeof result.data?.id !== 'string') throw new Error('Missing activity log');
        id = result.data.id;
      } catch {setStartError(true); return;}
      finally {startPending.current = false; setStarting(false);}
    }
    if (id) navigate(`${route}?id=${encodeURIComponent(id)}`);
  };
  return <section aria-label="Shift note status" className="my-4 rounded-xl border border-white bg-[#FFFFFF4D] p-4">
    <h3 className="font-semibold">Shift note</h3>
    <SourceNotice error={error} hasData={!!item} checked={item?.checkedAt} retry={() => void refetch()} reset={() => void refetch()}/>
    {isFetching && !item ? <p role="status">Checking shift note…</p> : null}
    {!error && (item?.syncStatus === 'unavailable' || item?.coverage === 'unavailable') ? <p role="alert">We couldn’t check these notes. Try again. <Button variant="outline" onClick={() => void refetch()}>Retry</Button></p> : null}
    {item?.coverage === 'disabled' ? <p>Shift-note monitoring is not enabled for this agency.</p> : item ? <>
      <p className="mt-2 font-medium">{shiftNoteLabels[item.state]}</p>
      <p className="text-sm">{item.reasonCodes?.includes('career_plan_selection_required') ? 'Select a published plan to link these entries to its goals.' : item.reasonCodes?.some(code=>['career_plan_missing','career_plan_dates','career_plan_reference_invalid','career_authorization_invalid'].includes(code)) ? 'Your agency needs to review the Career Planning plan for this service. You can save a draft.' : item.reasonCodes?.includes('returned_note') ? 'Your agency returned this note for correction.' : descriptions[item.state]}</p>
      {item.checkedAt ? <p className="mt-1 text-xs text-[#808081]">Checked {new Date(item.checkedAt).toLocaleString()}{isError ? ' — last checked result' : ''}</p> : null}
      {item.syncStatus === 'pending' ? <p className="text-sm">Your change is saved. The list status is updating.</p> : null}
      {item.coverage === 'checking' ? <p>We’re checking shifts. More notes may appear.</p> : null}
      {item.coverage === 'paused' ? <p>Shift-note reminders are paused.</p> : null}
      <div className="mt-3 flex flex-wrap gap-2">
        {!isError && item.syncStatus !== 'unavailable' ? item.actions.map((action, index) => <Button key={index} disabled={starting} className="rounded-full bg-[#00b4b8] text-white hover:bg-[#009da1]" onClick={() => void act(action)}>{starting && action.type === 'start' ? 'Starting…' : actionLabels[action.type]}</Button>) : null}
        <Button variant="outline" onClick={() => void refetch()} disabled={isFetching}>Refresh</Button>
      </div>
      {startError ? <p role="alert" className="mt-2 text-sm text-red-700">We couldn’t start this note. Try Start note again.</p> : null}
    </> : null}
    {item && !isError && review?.submissionId ? <Suspense fallback={<p>Loading submitted note…</p>}><SubmittedNoteModal isOpen submissionId={review.submissionId} readOnly={review.type !== 'review'} onClose={() => setReview(null)} /></Suspense> : null}
  </section>;
}
