import {complianceAlertsApi} from './api';
import {Button} from '@/components/ui/button';
import {FindingActions} from './FindingActions';
import {ComplianceBadge, ComplianceSkeleton} from './CompliancePresentation';
import {SourcePage, type SourceProps} from './SourceControls';

export type AgencyFinding = {
  id: string; employeeId: string; employeeName: string | null; status: 'open' | 'recurred' | 'resolved' | 'dismissed';
  severity: 'low' | 'medium' | 'high' | null; metrics: {numerator: number; denominator: number} | null;
  topFields: Array<{key: string; count: number}>; recurrenceCount: number; lastSeenAt: string | null; explanation: string | null;
};
type Args = {agencyId: string; mode: string; scopeKey: string; status: string; severity?: string; cursor?: string};
type Page = {items: AgencyFinding[]; total: number; truncated: boolean; nextCursor: string | null};

const api = complianceAlertsApi.injectEndpoints({endpoints: builder => ({
  agencyFindings: builder.query<Page, Args>({
    query: ({scopeKey: _scope, ...params}) => ({url: '/notifications/compliance/findings', method: 'GET', params, requiresAuth: true}),
    keepUnusedDataFor: 0,
  }),
})});
export const {useAgencyFindingsQuery} = api;

const tone = {high: 'danger', medium: 'warning', low: 'neutral'} as const;
const statusLabel: Record<string, string> = {open: 'Open', recurred: 'Came back', resolved: 'Resolved', dismissed: 'Dismissed'};

export default function AgencyFindings({view, scopeKey, agencyId, mode, onApply, onPage, onPrevious, onOpenStaff}: SourceProps & {onOpenStaff?: (employeeId: string) => void}) {
  const status = view.findingStatus || 'active';
  const query = useAgencyFindingsQuery({agencyId, mode, scopeKey, status, severity: view.severity, cursor: view.cursor}, {refetchOnMountOrArgChange: true});
  const data = query.currentData;
  return <section aria-label="Documentation patterns" className="p-4 sm:p-6">
    <h2 className="text-xl font-bold">Documentation patterns</h2>
    <p className="mt-2 text-sm text-[#5e7378]">Staff whose submitted service notes are repeatedly incomplete, most severe first. These are advisory and need a person to review them.</p>
    <div className="my-4 flex flex-wrap gap-3">
      <label className="text-sm">Status <select aria-label="Pattern status" className="ml-2 rounded border border-[#dce7e8] p-1" value={status} onChange={event => onApply({findingStatus: event.target.value as 'active'})}>
        <option value="active">Active</option><option value="resolved">Resolved</option><option value="all">All</option></select></label>
      <label className="text-sm">Severity <select aria-label="Pattern severity" className="ml-2 rounded border border-[#dce7e8] p-1" value={view.severity || ''} onChange={event => onApply({severity: (event.target.value || undefined) as 'high' | undefined})}>
        <option value="">Any</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></label>
      <Button type="button" variant="outline" disabled={query.isFetching} onClick={() => void query.refetch()}>Refresh</Button>
    </div>
    {query.isFetching && !data && <ComplianceSkeleton label="Loading documentation patterns…"/>}
    {!!query.error && !data && <p role="alert" className="text-sm">Documentation patterns could not be loaded. Refresh to try again.</p>}
    {data && <>
      {data.truncated && <p role="status" className="mb-3 text-sm">Showing the first {data.total} patterns only; narrow the filters to see others.</p>}
      {!data.items.length ? <p className="py-4 text-sm">No documentation patterns match these filters.</p> :
        <ul className="divide-y divide-[#dce7e8]">{data.items.map(item => <li key={item.id} className="space-y-1 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold">{item.employeeName || 'Unnamed staff member'}</span>
            {item.severity && <ComplianceBadge tone={tone[item.severity]}>{item.severity[0].toUpperCase() + item.severity.slice(1)}</ComplianceBadge>}
            <ComplianceBadge tone={item.status === 'resolved' || item.status === 'dismissed' ? 'success' : 'warning'}>{statusLabel[item.status]}</ComplianceBadge>
            {item.recurrenceCount > 0 && <span className="text-xs text-[#5e7378]">Returned {item.recurrenceCount}×</span>}
          </div>
          {item.metrics && <p className="text-sm">{item.metrics.numerator} of the last {item.metrics.denominator} records incomplete{item.topFields[0] ? `; most often missing ${item.topFields[0].key}` : ''}.</p>}
          <FindingActions findingId={item.id} status={item.status} name={item.employeeName || undefined} onDone={() => void query.refetch()}/>
          {onOpenStaff && <Button type="button" variant="ghost" size="sm" className="h-9 px-3 text-[#007f84]" aria-label={`Review ${item.employeeName || 'staff member'}`} onClick={() => onOpenStaff(item.employeeId)}>Review staff</Button>}
        </li>)}</ul>}
      <SourcePage cursor={view.cursor} next={data.nextCursor} loading={query.isFetching} onNext={() => onPage(data.nextCursor!)} onPrevious={() => onPrevious()}/>
    </>}
  </section>;
}
