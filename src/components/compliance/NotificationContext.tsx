import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/utils/auth';
import { useAssignmentReviewScope } from '@/hooks/useAssignmentReview';
import { useGetComplianceNotificationContextQuery } from '@/pages/agency/compliance-alerts/api';
import { SourceNotice } from '@/pages/agency/compliance-alerts/SourceControls';
const CompetencyPanel = lazy(() => import('@/pages/shared/client-details/components/ClientCompetencyPanel').then(m => ({ default: m.ClientCompetencyPanel })));
interface Props {
    notificationId?: string | null;
    initialRunId?: string | null;
    initialItemId?: string | null;
    expectedClientId?: string;
    expectedEmployeeId?: string;
    expectedShiftId?: string;
}
export function NotificationContext(props: Props) {
    if (!props.notificationId && !(props.initialRunId && props.initialItemId))
        return null;
    return <ContextRecord key={[props.notificationId, props.initialRunId, props.initialItemId, props.expectedClientId, props.expectedShiftId].join(':')} {...props}/>;
}
function ContextRecord(props: Props) {
    const scopeKey = useAssignmentReviewScope(), { user } = useAuth();
    const { currentData: data, isFetching, error, refetch } = useGetComplianceNotificationContextQuery({ notificationId: props.notificationId || undefined, initialRunId: props.initialRunId || undefined, initialItemId: props.initialItemId || undefined, scopeKey }, { refetchOnMountOrArgChange: true, refetchOnFocus: true });
    const [review, setReview] = useState(false), panel = useRef<HTMLElement>(null), focused = useRef(false);
    const mismatch = !!data && ((props.expectedClientId && props.expectedClientId !== data.clientId) || (props.expectedEmployeeId && props.expectedEmployeeId !== data.employeeId) || (props.expectedShiftId && props.expectedShiftId !== data.shiftId));
    useEffect(() => { if (data && !isFetching && !error && !mismatch && !focused.current) {
        panel.current?.focus();
        panel.current?.scrollIntoView?.({ block: 'nearest' });
        focused.current = true;
    } }, [data, isFetching, error, mismatch]);
    if (isFetching)
        return <Skeleton className="my-4 h-24 w-full" aria-label="Loading notification context"/>;
    if (error)
        return <SourceNotice error={error} hasData={false} retry={refetch} reset={refetch}/>;
    if (mismatch)
        return <p role="alert">This notification does not match this record.</p>;
    if (!data)
        return null;
    return <section ref={panel} tabIndex={-1} className="my-4 space-y-3 rounded-2xl border border-border bg-background p-5 focus:outline-primary" aria-label="Compliance notification">
  <h2 className="text-lg font-semibold">{data.kind === 'assignment_warning' ? 'Assignment saved with warnings' : 'Compliance notification'} · {data.program.toUpperCase()}</h2>
  {data.kind === 'assignment_warning' ? <><p className="text-sm text-muted-foreground">This is the saved assignment record, not a current clearance decision.</p><p className="text-sm">{data.acknowledgmentReason}</p>{data.acknowledgedAt && <p className="text-sm text-muted-foreground">Acknowledged {new Date(data.acknowledgedAt).toLocaleString()}</p>}</> : <p role="status">{data.state === 'open' ? 'These records currently need attention.' : data.state === 'resolved' ? 'This finding has been resolved or no longer applies.' : 'These records could not be verified. Try again.'}</p>}
  <ul className="list-inside list-disc text-sm">{data.reasons.map((reason, index) => <li key={index}>{reason.label} — {reason.code.replaceAll('_', ' ')}</li>)}</ul>
  <div className="flex flex-wrap items-center gap-3"><Button variant="outline" onClick={() => void refetch()}>Refresh check</Button>
   {data.employeeId && <a className="text-sm font-medium text-primary underline" href={'/agency/dsp-management/' + encodeURIComponent(data.employeeId) + '?mode=' + data.program}>Open staff record</a>}
   {data.kind === 'condition' && data.state === 'open' && data.clientId && data.employeeId && <Button variant="outline" onClick={() => setReview(!review)}>{review ? 'Close medication review' : 'Review medication evidence'}</Button>}
  </div>
  {review && data.state === 'open' && data.clientId && data.employeeId && user?.agencyId && <Suspense fallback={<Skeleton className="h-24 w-full"/>}><CompetencyPanel clientId={data.clientId} employeeId={data.employeeId} agencyId={user.agencyId} program={data.program}/></Suspense>}
 </section>;
}
