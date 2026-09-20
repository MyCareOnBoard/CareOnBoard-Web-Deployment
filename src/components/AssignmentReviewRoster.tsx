import {createContext, useContext, useEffect, useRef, useState, type ReactNode, type MutableRefObject} from 'react';
import {format, isValid} from 'date-fns';
import {useAuth} from '@/utils/auth';
import {useAssignmentReview, useAssignmentReviewScope} from '@/hooks/useAssignmentReview';
import {assignmentServiceRowKey, type AssignmentReviewEnvelope} from '@/lib/api/assignment-review';
import {AssignmentReview} from './AssignmentReview';
import {ClientCompetencyPanel} from '@/pages/shared/client-details/components/ClientCompetencyPanel';
import {Routes} from '@/routes/constants';
import {AssignmentDecision, assignmentAcknowledgments, type AssignmentConsentDrafts} from './AssignmentDecision';
import {useAssignmentDecision} from '@/hooks/useAssignmentDecision';
import type {AssignmentDecision as Decision} from '@/lib/api/assignment-decision';
export type RosterDecisionState = {decisions: Record<string, Decision>; drafts: AssignmentConsentDrafts; loading?: boolean; submitted?: {viewKey: string; decisions: Record<string, Decision> | null; saved: boolean; error?: string}};
export type RosterDecisionProps = {decisionState?: RosterDecisionState; onDecisionState?: React.Dispatch<React.SetStateAction<RosterDecisionState>>; decisionCaptureRef?: MutableRefObject<string>};

export type ReviewRosterRow = {id?: string; reviewSourceRowKey?: string | null; code?: string; serviceCode?: string; serviceId?: string; startAuthDate?: unknown; endAuthDate?: unknown; sdrStartDate?: unknown; sdrEndDate?: unknown; startDate?: unknown; endDate?: unknown};
export type SavedRosterReview = {metadata?: AssignmentReviewEnvelope; submittedViewKey: string; documentsChanged: boolean; assignmentChanged?: boolean};
type RosterScope = RosterDecisionProps & {medication?: {value: import('@/lib/api/clients').MedicationSupportSettings; onChange: (settings: import('@/lib/api/clients').MedicationSupportSettings) => void; showQuestion?: boolean}; clientId?: string; agencyId?: string; program: 'ddd' | 'hha'; savedRows: ReviewRosterRow[]; selected: string; select: (key: string) => void; captureRef?: MutableRefObject<string>; savedReview?: SavedRosterReview; onViewNeeds?: () => void};
const RosterContext = createContext<RosterScope | null>(null);
export function AssignmentReviewRosterProvider({children, enabled = true, ...scope}: Omit<RosterScope, 'selected' | 'select'> & {children: ReactNode; enabled?: boolean}) {
  const [selected, select] = useState('');
  const [reviewClientId, setReviewClientId] = useState(scope.clientId);
  if (reviewClientId !== scope.clientId) {
    setReviewClientId(scope.clientId);
    select('');
  }
  return <RosterContext.Provider value={enabled ? {...scope, selected, select} : null}>{children}</RosterContext.Provider>;
}

function day(value: unknown) {
  if (!value) return null;
  if (value instanceof Date) return isValid(value) ? format(value, 'yyyy-MM-dd') : 'invalid';
  if (typeof value === 'string') return value.slice(0, 10);
  return 'invalid';
}
function dates(row: ReviewRosterRow) {
  return JSON.stringify((row.startAuthDate ? [row.startAuthDate, row.endAuthDate] : row.startDate || row.endDate ? [row.startDate, row.endDate] : [row.sdrStartDate, row.sdrEndDate]).map(day));
}
const rowIdentity = (row: ReviewRosterRow) => JSON.stringify([row.code || row.serviceCode || '', row.serviceId || '']);

export function rosterAssignmentsChanged(before: Array<ReviewRosterRow & {assignedDsps?: Array<{id: string}>}>, after: Array<ReviewRosterRow & {assignedDsps?: Array<{id: string}>}>) {
  const entries = (rows: typeof before) => rows.flatMap(row => (row.assignedDsps ?? []).map(employee => JSON.stringify([row.id, rowIdentity(row), employee.id, dates(row)])));
  const previous = new Set(entries(before));
  return entries(after).some(key => !previous.has(key));
}
export function rosterAcknowledgments(state: RosterDecisionState, before: Array<ReviewRosterRow & {assignedDsps?: Array<{id: string}>}>, after: typeof before, program: 'ddd' | 'hha') {
  return assignmentAcknowledgments(state.decisions, state.drafts).filter(ack => {
    try {
      const context = JSON.parse(ack.contextKey);
      return after.some(row => (row.assignedDsps || []).some(staff => staff.id === context[2]) && assignmentServiceRowKey(row, program) === context[5]
        && JSON.stringify([context[7], context[8]]) === dates(row)
        && !before.some(old => assignmentServiceRowKey(old, program) === context[5] && dates(old) === dates(row) && rowIdentity(old) === rowIdentity(row) && old.assignedDsps?.some(staff => staff.id === context[2])));
    } catch {return false;}
  });
}

export function useRosterReviewSelection(row: ReviewRosterRow | undefined) {
  const scope = useContext(RosterContext);
  const localId = useRef(Math.random().toString(36));
  const rowKey = row?.id || localId.current;
  return {medication: scope?.medication, scopeKey: JSON.stringify([scope?.clientId, scope?.agencyId, scope?.program]), available: !!scope, agencyId: scope?.agencyId, program: scope?.program, select: (employeeId: string) => scope?.select(JSON.stringify([rowKey, employeeId])), selectedEmployee: scope?.selected ? (() => {const [key, employee] = JSON.parse(scope.selected); return key === rowKey ? employee as string : undefined;})() : undefined};
}

export function RosterAssignmentReview({row, employeeId, employeeName}: {row?: ReviewRosterRow; employeeId: string; employeeName: string}) {
  const scope = useContext(RosterContext)!;
  const {user} = useAuth();
  const scopeKey = useAssignmentReviewScope();
  const viewRowKey = row ? row.id || assignmentServiceRowKey(row, scope.program) : null;
  const matchingRows = row ? scope.savedRows.filter(item => row.id ? item.id === row.id : assignmentServiceRowKey(item, scope.program) === viewRowKey) : [];
  const savedRow = matchingRows.length === 1 ? matchingRows[0] : undefined;
  const requestRowKey = savedRow ? savedRow.reviewSourceRowKey === undefined ? assignmentServiceRowKey(savedRow, scope.program) : savedRow.reviewSourceRowKey : null;
  const uniqueSource = requestRowKey && scope.savedRows.filter(item => (item.reviewSourceRowKey ?? assignmentServiceRowKey(item, scope.program)) === requestRowKey).length === 1;
  const saved = !!scope.clientId && !!uniqueSource && !!requestRowKey && !!savedRow && !!row && dates(savedRow) === dates(row) && rowIdentity(savedRow) === rowIdentity(row);
  const agencyId = scope.agencyId || user?.agencyId || (user?.userType === 'agency' ? user?.uid : undefined);
  const recordedDates = row ? JSON.parse(dates(row)) as [string | null, string | null] : [null, null];
  const selection = scope.clientId && viewRowKey && agencyId ? {agencyId, clientId: scope.clientId, input: {program: scope.program, kind: 'service_roster' as const, employeeId, serviceRowKey: viewRowKey}, ...(requestRowKey ? {requestServiceRowKey: requestRowKey} : {}), expectedDates: {startDate: recordedDates[0], endDate: recordedDates[1]}} : null;
  const controller = useAssignmentReview(selection, {enabled: !!selection, previewEnabled: saved, scopeKey});
  const checks = useAssignmentDecision(selection ? {agencyId: selection.agencyId, clientId: selection.clientId, input: {...selection.input, serviceRowKey: requestRowKey || viewRowKey!}} : null, {enabled: !!selection, previewEnabled: saved, scopeKey});
  if (scope.decisionCaptureRef) scope.decisionCaptureRef.current = checks.viewKey;
  useEffect(() => {
    scope.onDecisionState?.(previous => {
      if (checks.accessDenied) return {decisions: {}, drafts: {}};
      const d = checks.decision, draft = d && previous.drafts[d.contextKey];
      return {...previous, loading: checks.loading, decisions: d ? {...previous.decisions, [d.contextKey]: d} : previous.decisions,
        drafts: d && draft && draft.fingerprint !== d.fingerprint ? {...previous.drafts, [d.contextKey]: {...draft, consent: false, fingerprint: d.fingerprint}} : previous.drafts};
    });
  }, [checks.decision, checks.loading, checks.accessDenied, scope.onDecisionState]);
  useEffect(() => {
    const submitted = scope.decisionState?.submitted;
    if (!submitted || submitted.viewKey !== checks.viewKey) return;
    const decision = Object.values(submitted.decisions || {}).find(item => {
      try {const context = JSON.parse(item.contextKey); return context[1] === scope.clientId && context[2] === employeeId && context[3] === scope.program && context[4] === 'service_roster' && [viewRowKey, requestRowKey].includes(context[5]);} catch {return false;}
    });
    if (decision || !submitted.decisions) checks.acceptDecision(decision || null, submitted.viewKey, submitted.saved);
  }, [scope.decisionState?.submitted, checks.acceptDecision, checks.viewKey, scope.clientId, scope.program, employeeId, viewRowKey, requestRowKey]);
  if (scope.captureRef) scope.captureRef.current = controller.viewKey;
  useEffect(() => {
    if (!scope.savedReview) return;
    if (!scope.savedReview.metadata) {
      if (scope.savedReview.assignmentChanged) controller.acceptSavedReview(undefined, scope.savedReview.submittedViewKey);
      return;
    }
    for (const review of Object.values(scope.savedReview.metadata.assignmentReviews)) {
      if (controller.acceptSavedReview(review, scope.savedReview.submittedViewKey)) return;
    }
    if (scope.savedReview.assignmentChanged && (scope.savedReview.metadata.unreviewedPairCount > 0 || scope.savedReview.metadata.assignmentReviewCoverage === 'unavailable')) controller.acceptSavedReview(undefined, scope.savedReview.submittedViewKey);
  }, [scope.savedReview, controller.acceptSavedReview]);
  return <><AssignmentReview controller={controller} employeeName={employeeName} unsaved={!saved && !controller.review} documentsChanged={controller.saved && scope.savedReview?.documentsChanged && scope.savedReview.submittedViewKey === controller.viewKey} />
    <AssignmentDecision decision={checks.decision} loading={checks.loading} error={scope.decisionState?.submitted?.viewKey === checks.viewKey ? scope.decisionState.submitted.error || checks.error : checks.error} refresh={checks.refresh} draft={checks.decision ? scope.decisionState?.drafts[checks.decision.contextKey] : undefined} onChange={draft => {if (checks.decision) scope.onDecisionState?.(previous => ({...previous, drafts: {...previous.drafts, [checks.decision!.contextKey]: draft}}));}} />
    {scope.clientId && agencyId && <ClientCompetencyPanel clientId={scope.clientId} agencyId={agencyId} program={scope.program} employeeId={employeeId} employeeName={employeeName} onViewNeeds={scope.onViewNeeds || (() => {
      const route = user?.userType === 'super_admin' ? Routes.superAdmin.editClient : Routes.agency.editClient;
      window.location.assign(`${route.replace(':clientId', encodeURIComponent(scope.clientId!))}?stage=3`);
    })} />}
  </>;
}
