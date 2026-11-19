import {complianceAlertsApi} from './api';
import {ComplianceBadge, ComplianceSkeleton} from './CompliancePresentation';

export type FindingEvidence = {id: string; occurredAt: string | null; outcome: string; source: string; noteType: string | null; fields: string[]; noteId: string | null; shiftId: string | null; activityLogId: string | null};
export type StaffFinding = {
  id: string; status: 'open' | 'recurred' | 'resolved' | 'dismissed'; severity: 'low' | 'medium' | 'high' | null; program: string | null;
  metrics: {numerator: number; denominator: number} | null; topFields: Array<{key: string; count: number}>;
  trend: string | null; explanation: string | null; recurrenceCount: number; lastSeenAt: string | null; resolvedAt: string | null;
  evidence: FindingEvidence[];
};
type Args = {employeeId: string; agencyId: string; mode: string; scopeKey: string};

const findingsApi = complianceAlertsApi.injectEndpoints({endpoints: builder => ({
  staffFindings: builder.query<{findings: StaffFinding[]}, Args>({
    query: ({employeeId, scopeKey: _scope, ...params}) => ({url: `/notifications/compliance/findings/staff/${encodeURIComponent(employeeId)}`, method: 'GET', params, requiresAuth: true}),
    keepUnusedDataFor: 0,
  }),
})});
export const {useStaffFindingsQuery} = findingsApi;

const severityTone = {high: 'danger', medium: 'warning', low: 'neutral'} as const;
const statusLabel: Record<string, string> = {open: 'Open', recurred: 'Came back', resolved: 'Resolved', dismissed: 'Dismissed'};
const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString() : 'unknown date');

export function StaffFindings(args: Args) {
  const query = useStaffFindingsQuery(args, {refetchOnMountOrArgChange: true});
  const findings = query.currentData?.findings;
  return <section aria-label="Documentation patterns" className="space-y-3 border-t border-[#dce7e8] pt-4">
    <h3 className="font-bold">Documentation patterns</h3>
    <p className="text-xs text-[#5e7378]">Based on submitted service notes. These are advisory and need a person to review them.</p>
    {query.isFetching && !findings && <ComplianceSkeleton label="Checking documentation patterns…" detail={false}/>}
    {!!query.error && !findings && <p role="alert" className="text-sm">Documentation patterns could not be loaded. <button type="button" className="underline" onClick={() => void query.refetch()}>Try again</button></p>}
    {findings && !findings.length && <p className="text-sm">No documentation patterns found.</p>}
    {findings?.map(finding => <article key={finding.id} className="space-y-2 rounded-lg border border-[#dce7e8] p-3">
      <div className="flex flex-wrap items-center gap-2">
        {finding.severity && <ComplianceBadge tone={severityTone[finding.severity]}>{finding.severity[0].toUpperCase() + finding.severity.slice(1)} severity</ComplianceBadge>}
        <ComplianceBadge tone={finding.status === 'resolved' || finding.status === 'dismissed' ? 'success' : 'warning'}>{statusLabel[finding.status]}</ComplianceBadge>
        {finding.recurrenceCount > 0 && <span className="text-xs text-[#5e7378]">Returned {finding.recurrenceCount} time{finding.recurrenceCount === 1 ? '' : 's'}</span>}
      </div>
      {finding.explanation && <p className="text-sm">{finding.explanation}</p>}
      {finding.evidence.length > 0 && <details>
        <summary className="cursor-pointer text-sm font-semibold">Evidence ({finding.evidence.length} records)</summary>
        <ul className="mt-2 divide-y divide-[#dce7e8] text-sm">{finding.evidence.map(item => <li key={item.id} className="py-2">
          <span className="font-medium">{fmt(item.occurredAt)}</span>
          {item.noteType && <span className="text-[#5e7378]"> · {item.noteType}</span>}
          {item.fields.length > 0 && <span> · Missing: {item.fields.join(', ')}</span>}
        </li>)}</ul>
      </details>}
    </article>)}
  </section>;
}
