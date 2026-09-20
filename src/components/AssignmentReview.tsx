import {useRef, useState} from 'react';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import type {useAssignmentReview} from '@/hooks/useAssignmentReview';
import {useAuth} from '@/utils/auth';
import {Routes} from '@/routes/constants';

import ReviewTrainingsModal from '@/pages/agency/trainings/reviewTrainingsModal';
const labels: Record<string, string> = {
  changes_requested: 'Changes requested', awaiting_review: 'Awaiting review', not_completed: 'Not completed',
  needs_review: 'Needs review', unsupported: 'Unsupported evidence', certificate_accepted: 'Certificate accepted', legacy_completion: 'Legacy completion',
  not_uploaded: 'Not uploaded', multiple_files: 'Multiple files', expired: 'Expired', expires_today: 'Expires today', on_file: 'On file', on_file_no_expiry: 'On file; no expiry recorded',
  isp: 'ISP', pcpt: 'PCPT', sdr: 'SDR', form485: 'Form 485', poc: 'Plan of care', physicianOrders: 'Physician orders', clinicalAssessment: 'Clinical assessment',
};
const restricted = "You don't have access to these records. Ask your agency administrator to review them.";

export function AssignmentReview({controller, employeeName, unsaved = false, documentsChanged = false, onDocuments}: {
  controller: ReturnType<typeof useAssignmentReview>; employeeName?: string; unsaved?: boolean; documentsChanged?: boolean; onDocuments?: () => void;
}) {
  const {review, loading, error, retryable, refresh} = controller;
  const {user} = useAuth();
  const documentRoute = user?.userType === 'super_admin' ? Routes.superAdmin.clientDetails : Routes.agency.clientDetails;
  const [trainingOpen, setTrainingOpen] = useState(false);
  const refreshAction = useRef({key: controller.viewKey, visible: false});
  if (refreshAction.current.key !== controller.viewKey) refreshAction.current = {key: controller.viewKey, visible: false};
  if (!loading) refreshAction.current.visible = !unsaved && (retryable || !!(review && review.state !== "unavailable"));
  return <section aria-label="Assignment review" className="space-y-3 rounded-xl border border-[#cccccd] bg-white/70 p-4 text-sm text-[#10141a]">
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">Assignment review</h3>
      {review && <Badge variant="outline">{review.state === 'information' ? 'Evidence on record' : review.state === 'attention' ? 'Review recommended' : 'Review unavailable'}</Badge>}
    </div>
    <p className="text-xs text-[#626366]">Files and training on record for this assignment. This review does not confirm clinical clearance.</p>
    <div aria-live="polite">
      {unsaved ? <p>Save these changes to review the assignment records.</p> : loading ? <p>Checking assignment records…</p> : error ? <p>{error}</p> : !review ? <p>Select a client, staff member and service to review their records.</p> : review.state === 'unavailable' ? <p>Assignment review is unavailable. Existing scheduling checks still apply.</p> : null}
    </div>
    {review && <>
      <p className="text-xs text-[#626366]">Checked {new Date(review.evaluatedAt).toLocaleString()} · {employeeName || 'Selected staff member'}</p>
      <p className="text-xs">{review.context.dateCoverage === 'as_of_today' ? `Checked as of ${review.agencyDate || 'the agency date'}; no service period was checked.` : review.context.dateCoverage === 'start_only' ? `Checked for the start date only: ${review.context.startDate}` : review.context.dateCoverage === 'period' ? `Service dates: ${review.context.startDate} – ${review.context.endDate || review.context.startDate}` : 'Service dates could not be checked.'}</p>
      <div><h4 className="font-medium">Client documents</h4>
        {review.coverage.clientDocuments === 'restricted' ? <p className="text-xs">{restricted}</p> : <>
          {review.documents?.slice(0, 7).map(item => <p key={item.key} className="text-xs">{labels[item.key] || 'Document'}: {labels[item.status] || 'Review recommended'} · {item.count} in this summary{item.expiredCount > 0 ? `; ${item.expiredCount} expired` : ''}{item.dateReviewCount > 0 ? `; ${item.dateReviewCount} dates need review` : ''}{item.futureExpiryCount > 0 ? `; ${item.futureExpiryCount} expire on or before the service dates` : ''}</p>)}
          {review.findings.filter(item => item.code === 'document_service_expiry_equal').map((item, index) => <p key={`${item.subjectId}:${index}`} className="text-xs">{labels[item.subjectId || ''] || 'A document'} expires on a service date.</p>)}
          {review.coverage.clientDocuments !== 'complete' && <p className="text-xs">Some document records could not be checked.</p>}
          {review.documents && (onDocuments ? <Button type="button" variant="link" className="h-auto px-0 text-[#00a6aa]" onClick={onDocuments}>View client documents</Button> : <a className="inline-block py-2 font-medium text-[#00a6aa] underline-offset-4 hover:underline" href={`${documentRoute.replace(':clientId', encodeURIComponent(review.context.clientId))}?tab=documents`} target="_blank" rel="noopener noreferrer">View client documents</a>)}
        </>}
      </div>
      {review.cpr && review.coverage.employeeTraining !== 'restricted' && <div><h4 className="font-medium">CPR requirement</h4>{review.context.program==='hha' && <p className="text-xs">Required for all hired HHA staff.</p>}<p className="text-xs">{review.cpr.state==='not_required'?'This service does not require CPR-trained staff.':review.cpr.state==='valid'?'CPR certificate covers the known service dates.':review.cpr.reasonCode==='cpr_requirement_not_recorded'?'Record whether this service requires CPR-trained staff.':review.cpr.reasonCode==='expires_before_service_end'?'CPR expires before this assignment ends.':review.cpr.state==='missing'?'No valid CPR certificate is recorded for this staff member.':'CPR evidence could not be verified.'}</p>{review.cpr.validUntilDate && <p className="text-xs">Certificate expires {review.cpr.validUntilDate}</p>}</div>}
      <div><h4 className="font-medium">Employee training</h4>
        {review.coverage.employeeTraining === 'restricted' ? <p className="text-xs">{restricted}</p> : <>
          {review.training && <>
            <p className="text-xs">{review.training.reviewedCount ? `${review.training.reviewedCount} training records in this summary.` : 'No training assignments recorded'}</p>
            {Object.entries(review.training.countsByDisplayedState).map(([state, count]) => <p key={state} className="text-xs">{labels[state] || 'Needs review'}: {count} in this summary</p>)}
            {review.training.attentionItems.slice(0, 5).map(item => <p key={item.id} className="text-xs">{item.name}: {labels[item.state] || 'Needs review'}</p>)}
            {review.training.hasMore && <p className="text-xs">Showing a summary of 25 training records. More records are available.</p>}
            <Button type="button" variant="link" className="h-auto px-0 text-[#00a6aa]" onClick={() => setTrainingOpen(true)}>View all training</Button>
          </>}
          {review.coverage.employeeTraining === 'unavailable' && <p className="text-xs">Training records could not be checked.</p>}
        </>}
      </div>
      {documentsChanged && <p className="text-xs">Documents changed after this review.</p>}
      {trainingOpen && review.coverage.employeeTraining !== 'restricted' && <ReviewTrainingsModal key={`${controller.viewKey}:${review.context.employeeId}`} open onOpenChange={setTrainingOpen} employee={{id: review.context.employeeId, fullName: employeeName || 'Selected staff member', role: review.context.program === 'hha' ? 'Caregiver' : 'DSP'}} agencyId={review.context.agencyId} mode={review.context.program} readOnly />}
    </>}
    {refreshAction.current.visible && <Button type="button" variant="outline" className="rounded-full" aria-disabled={loading} onClick={() => {if (!loading) void refresh();}}>{loading ? 'Refreshing review…' : retryable && !documentsChanged ? 'Retry review' : 'Refresh review'}</Button>}
  </section>;
}
