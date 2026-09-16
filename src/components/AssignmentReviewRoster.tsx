import {createContext, useContext, useEffect, useRef, useState, type ReactNode, type MutableRefObject} from 'react';
import {format, isValid} from 'date-fns';
import {useAuth} from '@/utils/auth';
import {useAssignmentReview, useAssignmentReviewScope} from '@/hooks/useAssignmentReview';
import {assignmentServiceRowKey, type AssignmentReviewEnvelope} from '@/lib/api/assignment-review';
import {AssignmentReview} from './AssignmentReview';

export type ReviewRosterRow = {id?: string; reviewSourceRowKey?: string | null; code?: string; serviceCode?: string; serviceId?: string; startAuthDate?: unknown; endAuthDate?: unknown; sdrStartDate?: unknown; sdrEndDate?: unknown; startDate?: unknown; endDate?: unknown};
export type SavedRosterReview = {metadata?: AssignmentReviewEnvelope; submittedViewKey: string; documentsChanged: boolean; assignmentChanged?: boolean};
type RosterScope = {clientId?: string; agencyId?: string; program: 'ddd' | 'hha'; savedRows: ReviewRosterRow[]; selected: string; select: (key: string) => void; captureRef?: MutableRefObject<string>; savedReview?: SavedRosterReview};
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

export function useRosterReviewSelection(row: ReviewRosterRow | undefined) {
  const scope = useContext(RosterContext);
  const localId = useRef(Math.random().toString(36));
  const rowKey = row?.id || localId.current;
  return {available: !!scope, agencyId: scope?.agencyId, program: scope?.program, select: (employeeId: string) => scope?.select(JSON.stringify([rowKey, employeeId])), selectedEmployee: scope?.selected ? (() => {const [key, employee] = JSON.parse(scope.selected); return key === rowKey ? employee as string : undefined;})() : undefined};
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
  return <AssignmentReview controller={controller} employeeName={employeeName} unsaved={!saved && !controller.review} documentsChanged={controller.saved && scope.savedReview?.documentsChanged && scope.savedReview.submittedViewKey === controller.viewKey} />;
}
