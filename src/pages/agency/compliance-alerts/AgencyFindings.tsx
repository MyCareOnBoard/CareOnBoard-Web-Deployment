import {complianceAlertsApi} from './api';
import {Button} from '@/components/ui/button';
import {FindingActions} from './FindingActions';
import {RULE_LABELS, concentrationLine, fieldLabel, nextStep, ruleLabel, trendLine} from './findingLabels';
import {EvidenceList, useStaffFindingsQuery} from './StaffFindings';
import {useState} from 'react';
import {ComplianceBadge, ComplianceSkeleton} from './CompliancePresentation';
import {SourcePage, type SourceProps} from './SourceControls';
import WhatWeCheck from './WhatWeCheck';

export type AgencyFinding = {
  id: string; ruleId?: string; employeeId: string; employeeName: string | null; status: 'open' | 'recurred' | 'resolved' | 'dismissed';
  severity: 'low' | 'medium' | 'high' | null; metrics: {numerator: number; denominator: number} | null;
  topFields: Array<{key: string; count: number}>; recurrenceCount: number; lastSeenAt: string | null; explanation: string | null;
  trend?: string | null; concentration?: {dimension: 'client' | 'weekday'; count: number; of: number; weekday?: number} | null; priorWindow?: {numerator: number; denominator: number} | null; recommendationKey?: string | null;
};
type Args = {agencyId: string; mode: string; scopeKey: string; status: string; severity?: string; ruleId?: string; cursor?: string};
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

/** The finding's own sentence; the counts line only when an older finding has no stored wording. */
const summaryOf = (item: AgencyFinding) => item.explanation || (item.metrics
  ? `${item.metrics.numerator} of the last ${item.metrics.denominator} ${!item.ruleId || item.ruleId === 'note.required_fields' ? 'records incomplete' : item.ruleId === 'document.expiry_lapse' ? 'documents lapsed' : item.ruleId === 'training.timeliness' ? 'trainings late' : 'shifts affected'}${item.topFields[0] ? `; most often ${fieldLabel(item.topFields[0].key)}` : ''}.`
  : null);

type Scope = {agencyId: string; mode: string; scopeKey: string};

// Mounted only when the evidence is opened, so a long list does not load every person's records.
function Evidence({item, scope}: {item: AgencyFinding; scope: Scope}) {
  const query = useStaffFindingsQuery({employeeId: item.employeeId, ...scope}, {refetchOnMountOrArgChange: true});
  const finding = query.currentData?.findings.find(candidate => candidate.id === item.id);
  if (query.isFetching && !query.currentData) return <p className="mt-2 text-sm">Loading records…</p>;
  if (query.error && !query.currentData) return <p role="alert" className="mt-2 text-sm">The records could not be loaded. <button type="button" className="underline" onClick={() => void query.refetch()}>Try again</button></p>;
  if (!finding?.evidence.length) return <p className="mt-2 text-sm">No records to show.</p>;
  return <div className="mt-2"><EvidenceList ruleId={item.ruleId} evidence={finding.evidence}/></div>;
}

function PatternCard({item, scope, focused, onOpenStaff, onDone}: {item: AgencyFinding; scope: Scope; focused: boolean; onOpenStaff?: (employeeId: string) => void; onDone: () => void}) {
  const [open, setOpen] = useState(focused);
  const summary = summaryOf(item);
  const step = nextStep(item.recommendationKey);
  const trend = trendLine(item.trend, item.priorWindow);
  return <li className={`space-y-2 py-4 ${focused ? 'rounded-lg bg-[#f5f9f9] px-3' : ''}`}>
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-bold">{item.employeeName || 'Unnamed staff member'}</span>
      <ComplianceBadge tone="neutral">{ruleLabel(item.ruleId)}</ComplianceBadge>
      {item.severity && <ComplianceBadge tone={tone[item.severity]}>{item.severity[0].toUpperCase() + item.severity.slice(1)} severity</ComplianceBadge>}
      <ComplianceBadge tone={item.status === 'resolved' || item.status === 'dismissed' ? 'success' : 'warning'}>{statusLabel[item.status]}</ComplianceBadge>
      {item.recurrenceCount > 0 && <span className="text-xs text-[#5e7378]">Returned {item.recurrenceCount}×</span>}
    </div>
    {summary && <p className="text-sm">{summary}</p>}
    {trend && <p className="text-xs text-[#5e7378]">{trend}</p>}
    {item.concentration && <p className="text-xs text-[#5e7378]">{concentrationLine(item.concentration)}</p>}
    {step && (item.status === 'open' || item.status === 'recurred') && <p className="text-sm"><span className="font-semibold">Next step:</span> {step}</p>}
    <details open={open} onToggle={event => setOpen(event.currentTarget.open)}>
      <summary className="cursor-pointer text-sm font-semibold">Records behind this</summary>
      {open && <Evidence item={item} scope={scope}/>}
    </details>
    <FindingActions findingId={item.id} status={item.status} name={item.employeeName || undefined} onDone={onDone}/>
    {onOpenStaff && <Button type="button" variant="ghost" size="sm" className="h-9 px-3 text-[#007f84]" aria-label={`Review ${item.employeeName || 'staff member'}`} onClick={() => onOpenStaff(item.employeeId)}>Staff compliance</Button>}
  </li>;
}

export default function AgencyFindings({view, scopeKey, agencyId, mode, onApply, onPage, onPrevious, onOpenStaff}: SourceProps & {onOpenStaff?: (employeeId: string) => void}) {
  const status = view.findingStatus || 'active';
  const query = useAgencyFindingsQuery({agencyId, mode, scopeKey, status, severity: view.severity, ruleId: view.ruleId, cursor: view.cursor}, {refetchOnMountOrArgChange: true});
  const data = query.currentData;
  const scope = {agencyId, mode, scopeKey};
  return <section aria-label="Patterns" className="p-4 sm:p-6">
    <h2 className="text-xl font-bold">Patterns</h2>
    <p className="mt-2 text-sm text-[#5e7378]">Staff who keep missing the same requirement: service notes, shift attendance, documents or training. Most serious first. These are advisory: nothing is sent to the staff member until you act.</p>
    <WhatWeCheck {...scope}/>
    {view.employeeId && <div className="mt-3 flex flex-wrap items-center gap-2 text-sm"><span>Showing the selected staff member first.</span><Button type="button" variant="outline" size="sm" onClick={() => onApply({employeeId: undefined})}>Show everyone</Button></div>}
    <div className="my-4 flex flex-wrap gap-3">
      <label className="text-sm">Status <select aria-label="Pattern status" className="ml-2 rounded border border-[#dce7e8] p-1" value={status} onChange={event => onApply({findingStatus: event.target.value as 'active'})}>
        <option value="active">Active</option><option value="resolved">Resolved</option><option value="all">All</option></select></label>
      <label className="text-sm">Severity <select aria-label="Pattern severity" className="ml-2 rounded border border-[#dce7e8] p-1" value={view.severity || ''} onChange={event => onApply({severity: (event.target.value || undefined) as 'high' | undefined})}>
        <option value="">Any</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></label>
      <label className="text-sm">Type <select aria-label="Pattern type" className="ml-2 rounded border border-[#dce7e8] p-1" value={view.ruleId || ''} onChange={event => onApply({ruleId: event.target.value || undefined})}>
        <option value="">All</option>{Object.entries(RULE_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
      <Button type="button" variant="outline" disabled={query.isFetching} onClick={() => void query.refetch()}>Refresh</Button>
    </div>
    {query.isFetching && !data && <ComplianceSkeleton label="Loading patterns…"/>}
    {!!query.error && !data && <p role="alert" className="text-sm">Patterns could not be loaded. Refresh to try again.</p>}
    {data && <>
      {data.truncated && <p role="status" className="mb-3 text-sm">Showing the first {data.total} patterns only; narrow the filters to see others.</p>}
      {!data.items.length ? <p className="py-4 text-sm">No patterns match these filters.</p> :
        <ul className="divide-y divide-[#dce7e8]">{[...data.items].sort((a, b) => Number(b.employeeId === view.employeeId) - Number(a.employeeId === view.employeeId)).map(item =>
          <PatternCard key={item.id} item={item} scope={scope} focused={!!view.employeeId && item.employeeId === view.employeeId} onOpenStaff={onOpenStaff} onDone={() => void query.refetch()}/>)}</ul>}
      <SourcePage cursor={view.cursor} next={data.nextCursor} loading={query.isFetching} onNext={() => onPage(data.nextCursor!)} onPrevious={() => onPrevious()}/>
    </>}
  </section>;
}
