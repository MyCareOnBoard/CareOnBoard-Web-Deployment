import {complianceAlertsApi} from './api';
import {Button} from '@/components/ui/button';
import {fieldLabel} from './findingLabels';
import {ComplianceSkeleton} from './CompliancePresentation';

export type FindingEvidence = {id: string; occurredAt: string | null; outcome: string; source: string; noteType: string | null; label?: string | null; fields: string[]; noteId: string | null; shiftId: string | null; activityLogId: string | null};
export type StaffFinding = {
  id: string; ruleId?: string; status: 'open' | 'recurred' | 'resolved' | 'dismissed'; severity: 'low' | 'medium' | 'high' | null; program: string | null;
  metrics: {numerator: number; denominator: number} | null; topFields: Array<{key: string; count: number}>;
  trend: string | null; priorWindow?: {numerator: number; denominator: number} | null; recommendationKey?: string | null; explanation: string | null; recurrenceCount: number; lastSeenAt: string | null; resolvedAt: string | null;
  reviewCount?: number; lastReviewedAt?: string | null; dismissedAt?: string | null; dismissReason?: string | null;
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

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString() : 'unknown date');

/** The records behind one pattern, newest first. Shared by the Patterns tab. */
export function EvidenceList({ruleId, evidence}: {ruleId?: string; evidence: FindingEvidence[]}) {
  return <ul className="divide-y divide-[#dce7e8] text-sm">{evidence.map(item => <li key={item.id} className="py-2">
    <span className="font-medium">{fmt(item.occurredAt)}</span>
    {(item.label || item.noteType) && <span className="text-[#5e7378]"> · {item.label || item.noteType}</span>}
    {item.fields.length > 0 && <span> · {!ruleId || ruleId === 'note.required_fields' ? 'Missing: ' : ''}{item.fields.map(fieldLabel).join(', ')}</span>}
  </li>)}</ul>;
}

/**
 * One line on a staff member's compliance page. The patterns themselves live in one place, the
 * Patterns tab; this only says how many are active and links there.
 */
export function StaffPatternsLink({onOpenPatterns, ...args}: Args & {onOpenPatterns?: (employeeId: string) => void}) {
  const query = useStaffFindingsQuery(args, {refetchOnMountOrArgChange: true});
  const findings = query.currentData?.findings;
  const active = (findings || []).filter(item => item.status === 'open' || item.status === 'recurred');
  const high = active.filter(item => item.severity === 'high').length;
  return <section aria-label="Compliance patterns" className="flex flex-wrap items-center gap-3 border-t border-[#dce7e8] pt-4">
    <h3 className="font-bold">Patterns</h3>
    {query.isFetching && !findings && <ComplianceSkeleton label="Checking patterns…" detail={false}/>}
    {!!query.error && !findings && <p role="alert" className="text-sm">Patterns could not be loaded. <button type="button" className="underline" onClick={() => void query.refetch()}>Try again</button></p>}
    {findings && <p className="text-sm">{active.length ? `${active.length} active${high ? ` · ${high} high severity` : ''}` : 'No active patterns.'}</p>}
    {findings && active.length > 0 && onOpenPatterns && <Button type="button" variant="outline" size="sm" onClick={() => onOpenPatterns(args.employeeId)}>View patterns</Button>}
  </section>;
}
