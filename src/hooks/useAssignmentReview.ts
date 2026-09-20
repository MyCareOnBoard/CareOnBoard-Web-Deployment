import {useCallback, useEffect, useId, useRef, useState} from 'react';
import {getAssignmentReview, type AssignmentReview, type ReviewSelection} from '@/lib/api/assignment-review';
import {useAuth} from '@/utils/auth';

export function useAssignmentReviewScope() {
  const {user} = useAuth();
  return JSON.stringify([import.meta.env.VITE_API_ENVIRONMENT || 'staging', user?.uid, user?.userType, user?.agencyId,
    user?.profile?.accessList, user?.profile?.agencyModes, user?.profile?.isActive, user?.profile?.agencyScope,
    user?.profile?.agencyIds, user?.profile?.status, user?.profile?.supportedClientTypes, user?.agency?.supportedClientTypes]);
}

function clock(value: string | null | undefined) {
  if (!value) return null;
  const match = /^(\d{1,2}):(\d{2})(?::?\s*(AM|PM))?$/i.exec(value.trim());
  if (!match) return value;
  const hour = match[3] ? Number(match[1]) % 12 + (match[3].toUpperCase() === 'PM' ? 12 : 0) : Number(match[1]);
  return `${String(hour).padStart(2, '0')}:${match[2]}`;
}

export function reviewMatchesSelection(review: AssignmentReview, selection: ReviewSelection) {
  const {input} = selection;
  const context = review.context;
  if (context.agencyId !== selection.agencyId || context.clientId !== selection.clientId || context.employeeId !== input.employeeId || context.program !== input.program || context.kind !== input.kind) return false;
  const row = input.serviceRowKey || input.serviceAuthorizationId;
  if (row && context.serviceRowKey !== row && context.serviceRowKey !== selection.requestServiceRowKey) return false;
  if (Object.hasOwn(input,'cprRequired') && context.cprRequired !== input.cprRequired) return false;
  if (input.kind === 'service_roster') return !selection.expectedDates || (context.startDate === selection.expectedDates.startDate && context.endDate === selection.expectedDates.endDate);
  if (input.kind === 'shift' && input.date) {
    const end = clock(input.endTime);
    const start = clock(input.startTime);
    const nextDay = new Date(`${input.date}T00:00:00Z`);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    const endDate = !end ? null : start && end <= start ? nextDay.toISOString().slice(0, 10) : input.date;
    if (context.endDate !== endDate) return false;
  }
  return context.startDate === (input.date || input.startDate || null)
    && clock(context.startTime) === clock(input.startTime) && clock(context.endTime) === clock(input.endTime)
    && (input.kind !== 'caregiver_link' || context.endDate === (input.assignmentEndDate || null));
}

export function useAssignmentReview(selection: ReviewSelection | null, {enabled, scopeKey, previewEnabled = true}: {enabled: boolean; scopeKey: string; previewEnabled?: boolean}) {
  const instanceId = useId();
  const session = useRef({enabled: false, number: 0});
  if (enabled !== session.current.enabled) session.current = {enabled, number: session.current.number + 1};
  const {requestServiceRowKey: _requestRow, ...viewSelection} = selection ?? {};
  const viewKey = JSON.stringify([instanceId, scopeKey, session.current.number, enabled && selection ? viewSelection : null]);
  const current = useRef({viewKey, selection, enabled, previewEnabled});
  current.current = {viewKey, selection, enabled, previewEnabled};
  const generation = useRef(0);
  const pending = useRef<{key: string; controller: AbortController; promise: Promise<void>} | null>(null);
  const [state, setState] = useState<{key: string; review: AssignmentReview | null; loading: boolean; error: string | null; retryable: boolean; saved?: boolean}>({key: '', review: null, loading: false, error: null, retryable: false});
  const refresh = useCallback((force = true) => {
    const captured = current.current;
    if (!captured.enabled || !captured.selection || !captured.previewEnabled) return Promise.resolve();
    if (!force && pending.current?.key === captured.viewKey) return pending.current.promise;
    pending.current?.controller.abort();
    const controller = new AbortController();
    const request = ++generation.current;
    const active = () => current.current.viewKey === captured.viewKey && generation.current === request && !controller.signal.aborted;
    setState({key: captured.viewKey, review: null, loading: true, error: null, retryable: false});
    const promise = getAssignmentReview(captured.selection, controller.signal).then(review => {
      if (active()) setState({key: captured.viewKey, review, loading: false, error: null, retryable: review.retryable});
    }).catch((error: unknown) => {
      if (!active()) return;
      const status = (error as {response?: {status?: number}})?.response?.status;
      setState({key: captured.viewKey, review: null, loading: false, error: status === 403 || status === 401 ? "You don't have access to these records. Ask your agency administrator to review them." : 'Some records could not be checked.', retryable: ![400, 401, 403, 404].includes(status ?? 0)});
    }).finally(() => {if (active()) pending.current = null;});
    pending.current = {key: captured.viewKey, controller, promise};
    return promise;
  }, []);
  useEffect(() => {
    void refresh(false);
    return () => {generation.current++; pending.current?.controller.abort(); pending.current = null;};
  }, [viewKey, refresh]);
  const acceptSavedReview = useCallback((review: AssignmentReview | undefined, submittedViewKey: string) => {
    const captured = current.current;
    if (!captured.enabled || captured.viewKey !== submittedViewKey || !captured.selection || (review && !reviewMatchesSelection(review, captured.selection))) return false;
    generation.current++;
    pending.current?.controller.abort();
    pending.current = null;
    setState({key: captured.viewKey, review: review ?? null, loading: false, error: review ? null : "Assignment saved. Some records could not be checked.", retryable: review?.retryable ?? true, saved: true});
    return true;
  }, []);
  return {viewKey, acceptSavedReview, refresh, saved: state.key === viewKey && !!state.saved, review: state.key === viewKey ? state.review : null,
    loading: enabled && previewEnabled && !!selection && (state.key === viewKey && state.loading), error: state.key === viewKey ? state.error : null,
    retryable: state.key === viewKey && state.retryable};
}
