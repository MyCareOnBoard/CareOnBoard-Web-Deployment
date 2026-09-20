import {createContext, useContext, useEffect, useRef, useState, type ReactNode, type MutableRefObject} from 'react';
import {format, isValid} from 'date-fns';
import {useAuth} from '@/utils/auth';
import {useAssignmentReviewScope} from '@/hooks/useAssignmentReview';
import {assignmentServiceRowKey, type AssignmentReviewEnvelope} from '@/lib/api/assignment-review';
import {AssignmentDecision, assignmentAcknowledgments, type AssignmentConsentDrafts} from './AssignmentDecision';
import {useAssignmentDecision} from '@/hooks/useAssignmentDecision';
import type {AssignmentDecision as Decision} from '@/lib/api/assignment-decision';
export type RosterDecisionState = {decisions: Record<string, Decision & {rosterKey?: string}>; drafts: AssignmentConsentDrafts; loading?: boolean; error?: boolean; submitted?: {viewKey: string; decisions: Record<string, Decision> | null; saved: boolean; error?: string}};
export type RosterDecisionProps = {decisionState?: RosterDecisionState; onDecisionState?: React.Dispatch<React.SetStateAction<RosterDecisionState>>; decisionCaptureRef?: MutableRefObject<string>};

export type ReviewRosterRow = {cprRequired?: boolean;id?: string; reviewSourceRowKey?: string | null; code?: string; serviceCode?: string; serviceId?: string; startAuthDate?: unknown; endAuthDate?: unknown; sdrStartDate?: unknown; sdrEndDate?: unknown; startDate?: unknown; endDate?: unknown};
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

export const rosterPreviewKey = (row: ReviewRosterRow, program: 'ddd' | 'hha') => JSON.stringify([rowIdentity(row), dates(row), program === 'hha' ? true : row.cprRequired ?? null]);

export function rosterAssignmentsChanged(before: Array<ReviewRosterRow & {assignedDsps?: Array<{id: string}>}>, after: Array<ReviewRosterRow & {assignedDsps?: Array<{id: string}>}>) {
  const entries = (rows: typeof before) => rows.flatMap(row => (row.assignedDsps ?? []).map(employee => JSON.stringify([row.id, rowIdentity(row), employee.id, dates(row), row.cprRequired])));
  const previous = new Set(entries(before));
  return entries(after).some(key => !previous.has(key));
}
export function rosterAcknowledgments(state: RosterDecisionState, before: Array<ReviewRosterRow & {assignedDsps?: Array<{id: string}>}>, after: typeof before, program: 'ddd' | 'hha') {
  return assignmentAcknowledgments(state.decisions, state.drafts).filter(ack => {
    try {
      const context = JSON.parse(ack.contextKey);
      return after.some(row => (row.assignedDsps || []).some(staff => staff.id === context[2]) && assignmentServiceRowKey(row, program) === context[5]
        && JSON.stringify([context[7], context[8]]) === dates(row) && state.decisions[ack.contextKey]?.rosterKey === rosterPreviewKey(row, program)
        && !before.some(old => assignmentServiceRowKey(old, program) === context[5] && dates(old) === dates(row) && rowIdentity(old) === rowIdentity(row) && old.cprRequired === row.cprRequired && old.assignedDsps?.some(staff => staff.id === context[2])));
    } catch {return false;}
  });
}

export function rosterSubmissionBlocked(state: RosterDecisionState, before: Array<ReviewRosterRow & {assignedDsps?: Array<{id: string}>}>, after: typeof before, program: 'ddd' | 'hha') {
  if (!rosterAssignmentsChanged(before, after)) return false;
  if (state.loading || state.error) return true;
  const acknowledgments = rosterAcknowledgments(state, before, after, program);
  return after.some(row => row.assignedDsps?.some(staff => {
    const rowKey = assignmentServiceRowKey(row, program);
    if (before.some(old => assignmentServiceRowKey(old, program) === rowKey && dates(old) === dates(row) && rowIdentity(old) === rowIdentity(row) && old.cprRequired === row.cprRequired && old.assignedDsps?.some(previous => previous.id === staff.id))) return false;
    const decision = Object.values(state.decisions).find(d => {
      try {const c = JSON.parse(d.contextKey); return d.rosterKey === rosterPreviewKey(row, program) && c[2] === staff.id && c[3] === program && c[5] === rowKey && JSON.stringify([c[7], c[8]]) === dates(row);} catch {return false;}
    });
    return !decision || decision.state !== 'ready' || decision.decision === 'BLOCKED' || (decision.decision === 'WARNING' && !acknowledgments.some(a => a.contextKey === decision.contextKey));
  }));
}

export function useRosterReviewSelection(row: ReviewRosterRow | undefined) {
  const scope = useContext(RosterContext);
  const localId = useRef(Math.random().toString(36));
  const rowKey = row?.id || localId.current;
  return {medication: scope?.medication, scopeKey: JSON.stringify([scope?.clientId, scope?.agencyId, scope?.program]), available: !!scope, agencyId: scope?.agencyId, program: scope?.program, select: (employeeId: string) => scope?.select(JSON.stringify([rowKey, employeeId])), selectedEmployee: scope?.selected ? (() => {const [key, employee] = JSON.parse(scope.selected); return key === rowKey ? employee as string : undefined;})() : undefined};
}

export function RosterAssignmentReview({row, employeeId, employeeName, onBlocked, selectionCleared}: {row?: ReviewRosterRow; employeeId: string; employeeName: string; onBlocked?: () => void; selectionCleared?: boolean}) {
  const scope = useContext(RosterContext)!;
  const {user} = useAuth();
  const scopeKey = useAssignmentReviewScope();
  const viewRowKey = row ? row.id || assignmentServiceRowKey(row, scope.program) : null;
  const agencyId = scope.agencyId || user?.agencyId || (user?.userType === 'agency' ? user?.uid : undefined);
  const recordedDates = row ? JSON.parse(dates(row)) as [string | null, string | null] : [null, null];
  const selection = viewRowKey && agencyId ? {agencyId, clientId: scope.clientId || 'new', input: {program: scope.program, kind: 'service_roster' as const, employeeId, serviceRowKey: viewRowKey,
    roster: {serviceCode: row?.serviceCode || row?.code || '', startDate: recordedDates[0], endDate: recordedDates[1], cprRequired: scope.program === 'hha' ? true : row?.cprRequired ?? null}}} : null;
  const rosterKey = row ? rosterPreviewKey(row, scope.program) : '';
  const checks = useAssignmentDecision(selection, {enabled: !!selection, scopeKey});
  if (scope.decisionCaptureRef) scope.decisionCaptureRef.current = checks.viewKey;
  useEffect(() => {
    if (!checks.loading && (checks.decision?.state === 'inactive' || checks.decision?.decision === 'BLOCKED')) onBlocked?.();
  }, [checks.loading, checks.decision, onBlocked]);
  useEffect(() => {
    scope.onDecisionState?.(previous => {
      if (checks.accessDenied) return {decisions: {}, drafts: {}, error: true};
      const d = checks.decision, draft = d && previous.drafts[d.contextKey];
      const decisions = Object.fromEntries(Object.entries(previous.decisions).filter(([key]) => {try {const ctx = JSON.parse(key); return ctx[2] !== employeeId || ctx[5] !== viewRowKey;} catch {return false;}}));
      return {...previous, error: !!checks.error, loading: checks.loading, decisions: d ? {...decisions, [d.contextKey]: {...d, rosterKey}} : decisions,
        drafts: d && draft && draft.fingerprint !== d.fingerprint ? {...previous.drafts, [d.contextKey]: {...draft, consent: false, fingerprint: d.fingerprint}} : previous.drafts};
    });
  }, [checks.decision, checks.loading, checks.error, checks.accessDenied, employeeId, viewRowKey, rosterKey, scope.onDecisionState]);
  useEffect(() => {
    const submitted = scope.decisionState?.submitted;
    if (!submitted || submitted.viewKey !== checks.viewKey) return;
    const decision = Object.values(submitted.decisions || {}).find(item => {
      try {const c = JSON.parse(item.contextKey); return c[1] === (scope.clientId || 'new') && c[2] === employeeId && c[3] === scope.program && c[4] === 'service_roster' && c[5] === viewRowKey;} catch {return false;}
    });
    if (decision || !submitted.decisions) checks.acceptDecision(decision || null, submitted.viewKey, submitted.saved);
  }, [scope.decisionState?.submitted, checks.acceptDecision, checks.viewKey, scope.clientId, scope.program, employeeId, viewRowKey]);
  useEffect(() => () => {scope.onDecisionState?.(previous => ({...previous, loading: false, error: false}));}, [scope.onDecisionState]);
  return <AssignmentDecision context="staff" selectionCleared={selectionCleared} employeeName={employeeName} decision={checks.decision} loading={checks.loading} error={scope.decisionState?.submitted?.viewKey === checks.viewKey ? scope.decisionState.submitted.error || checks.error : checks.error} refresh={checks.refresh}
    draft={checks.decision ? scope.decisionState?.drafts[checks.decision.contextKey] : undefined} onChange={draft => {if (checks.decision) scope.onDecisionState?.(previous => ({...previous, drafts: {...previous.drafts, [checks.decision!.contextKey]: draft}}));}} />;
}
