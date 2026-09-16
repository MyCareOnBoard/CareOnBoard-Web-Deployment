import {AssignmentReview as ReviewPanel} from "./AssignmentReview";
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { useAssignmentReview } from '@/hooks/useAssignmentReview';
import { getAssignmentReview, type AssignmentReview } from '@/lib/api/assignment-review';

vi.mock('@/utils/auth', () => ({useAuth: () => ({user: {uid: 'admin', userType: 'super_admin'}})}));
vi.mock('@/pages/agency/trainings/reviewTrainingsModal', () => ({default: () => null}));
vi.mock('@/lib/api/assignment-review', async importOriginal => ({...await importOriginal<object>(), getAssignmentReview: vi.fn()}));
const selection = {agencyId: 'agency', clientId: 'client', input: {program: 'ddd' as const, kind: 'service_roster' as const, employeeId: 'employee', serviceRowKey: 'row'}};
const review: AssignmentReview = {version: 1, evaluatedAt: '2026-09-16T12:00:00Z', agencyDate: '2026-09-16', timezone: 'UTC', context: {...selection.input, agencyId: 'agency', clientId: 'client', serviceRowKey: 'row', startDate: null, endDate: null, startTime: null, endTime: null, dateCoverage: 'as_of_today'}, state: 'information', coverage: {clientDocuments: 'complete', employeeTraining: 'complete'}, findings: [], retryable: false};
beforeEach(() => vi.clearAllMocks());

it('hides old selections immediately and ignores their late catch/finally', async () => {
  let rejectOld!: (reason: Error) => void;
  vi.mocked(getAssignmentReview).mockImplementationOnce(() => new Promise((_, reject) => {rejectOld = reject;})).mockResolvedValue(review);
  const {result, rerender} = renderHook(({employeeId}) => useAssignmentReview({...selection, input: {...selection.input, employeeId}}, {enabled: true, scopeKey: 'actor/staging'}), {initialProps: {employeeId: 'old'}});
  rerender({employeeId: 'employee'});
  await waitFor(() => expect(result.current.review).toEqual(review));
  await act(async () => rejectOld(new Error('late failure')));
  expect(result.current.review).toEqual(review);
  expect(result.current.error).toBeNull();
});

it('accepts matching saved evidence without a second preview and rejects an old session save', async () => {
  vi.mocked(getAssignmentReview).mockImplementation(() => new Promise(() => {}));
  const {result, rerender} = renderHook(({enabled, scopeKey}) => useAssignmentReview(selection, {enabled, scopeKey}), {initialProps: {enabled: true, scopeKey: 'actor/staging'}});
  const submittedKey = result.current.viewKey;
  act(() => {expect(result.current.acceptSavedReview(review, submittedKey)).toBe(true);});
  expect(result.current.review).toEqual(review);
  expect(getAssignmentReview).toHaveBeenCalledTimes(1);
  rerender({enabled: false, scopeKey: 'actor/staging'});
  rerender({enabled: true, scopeKey: 'actor/staging'});
  act(() => {expect(result.current.acceptSavedReview(review, submittedKey)).toBe(false);});
  expect(result.current.review).toBeNull();
  rerender({enabled: true, scopeKey: 'other/production'});
  act(() => {expect(result.current.acceptSavedReview(review, submittedKey)).toBe(false);});
});

it('supersedes Refresh while coalescing identical in-flight calls', async () => {
  const pending: Array<(review: AssignmentReview) => void> = [];
  vi.mocked(getAssignmentReview).mockImplementation(() => new Promise(resolve => pending.push(resolve)));
  const {result} = renderHook(() => useAssignmentReview(selection, {enabled: true, scopeKey: 'actor/staging'}));
  act(() => {void result.current.refresh(false);});
  expect(getAssignmentReview).toHaveBeenCalledTimes(1);
  act(() => {void result.current.refresh();});
  expect(getAssignmentReview).toHaveBeenCalledTimes(2);
  await act(async () => pending[0]({...review, evaluatedAt: 'old'}));
  expect(result.current.review).toBeNull();
  expect(result.current.loading).toBe(true);
  await act(async () => pending[1](review));
  expect(result.current.review).toEqual(review);
});

it('adopts a saved changed-date review without fetching again after the baseline updates', () => {
  const dated = {...selection, expectedDates: {startDate: '2026-10-01', endDate: null}};
  const {result, rerender} = renderHook(({previewEnabled}) => useAssignmentReview(dated, {enabled: true, previewEnabled, scopeKey: 'actor'}), {initialProps: {previewEnabled: false}});
  const submitted = result.current.viewKey;
  act(() => {expect(result.current.acceptSavedReview({...review, context: {...review.context, startDate: '2026-10-01', dateCoverage: 'start_only'}}, submitted)).toBe(true);});
  rerender({previewEnabled: true});
  expect(getAssignmentReview).not.toHaveBeenCalled();
  expect(result.current.review?.context.startDate).toBe('2026-10-01');
});

it('replaces older evidence with an explicit old-server save fallback and retries review only', async () => {
  vi.mocked(getAssignmentReview).mockResolvedValue(review);
  const {result} = renderHook(() => useAssignmentReview(selection, {enabled: true, scopeKey: 'actor'}));
  await waitFor(() => expect(result.current.review).toEqual(review));
  act(() => {result.current.acceptSavedReview(undefined, result.current.viewKey);});
  expect(result.current.review).toBeNull();
  expect(result.current.error).toBe('Assignment saved. Some records could not be checked.');
  expect(result.current.retryable).toBe(true);
  await act(async () => result.current.refresh());
  expect(getAssignmentReview).toHaveBeenCalledTimes(2);
});

it('hides protected payloads and source actions even when restricted data is returned', () => {
  const restrictedReview: AssignmentReview = {...review, state: 'attention', coverage: {clientDocuments: 'restricted', employeeTraining: 'restricted'}, documents: [{key: 'isp', status: 'on_file', count: 7, expiredCount: 0, dateReviewCount: 0, futureExpiryCount: 0}], training: {reviewedCount: 3, hasMore: false, countsByDisplayedState: {not_completed: 3}, attentionItems: [{id: 'private', name: 'Private course', state: 'not_completed'}]}};
  const controller = {viewKey: 'key', review: restrictedReview, loading: false, error: null, retryable: false, saved: false, refresh: vi.fn(), acceptSavedReview: vi.fn()};
  render(<ReviewPanel controller={controller} />);
  expect(screen.queryByText('Private course')).not.toBeInTheDocument();
  expect(screen.queryByRole('link', {name: 'View client documents'})).not.toBeInTheDocument();
  expect(screen.queryByRole('button', {name: 'View all training'})).not.toBeInTheDocument();
});

it('provides scoped document navigation and keeps focus when refreshing', () => {
  const refresh = vi.fn();
  const controller = {viewKey: 'key', review: {...review, documents: []}, loading: false, error: null, retryable: false, saved: false, refresh, acceptSavedReview: vi.fn()};
  render(<ReviewPanel controller={controller} />);
  expect(screen.getByRole('link', {name: 'View client documents'})).toHaveAttribute('href', '/super-admin/clients/client?tab=documents');
  const button = screen.getByRole('button', {name: 'Refresh review'});
  button.focus(); fireEvent.click(button);
  expect(button).toHaveFocus();
  expect(refresh).toHaveBeenCalledTimes(1);
});

it('allows review retry after an unsaved roster baseline becomes saved with missing metadata', async () => {
  vi.mocked(getAssignmentReview).mockResolvedValue(review);
  const {result, rerender} = renderHook(({previewEnabled}) => useAssignmentReview(selection, {enabled: true, previewEnabled, scopeKey: 'actor'}), {initialProps: {previewEnabled: false}});
  act(() => {result.current.acceptSavedReview(undefined, result.current.viewKey);});
  rerender({previewEnabled: true});
  expect(result.current.loading).toBe(false);
  expect(result.current.retryable).toBe(true);
  expect(getAssignmentReview).not.toHaveBeenCalled();
  await act(async () => result.current.refresh());
  expect(result.current.review).toEqual(review);
});

it('retains actual keyboard focus throughout a deferred refresh', async () => {
  let finish!: (value: AssignmentReview) => void;
  vi.mocked(getAssignmentReview).mockResolvedValueOnce(review).mockImplementationOnce(() => new Promise(resolve => {finish = resolve;}));
  function Harness() {const controller = useAssignmentReview(selection, {enabled: true, scopeKey: 'actor'}); return <ReviewPanel controller={controller} />;}
  render(<Harness />);
  const button = await screen.findByRole('button', {name: 'Refresh review'});
  button.focus(); fireEvent.click(button);
  expect(screen.getByRole('button', {name: 'Refreshing review…'})).toBe(button);
  expect(button).toHaveFocus();
  expect(button).toHaveAttribute('aria-disabled', 'true');
  await act(async () => finish(review));
  expect(screen.getByRole('button', {name: 'Refresh review'})).toBe(button);
  expect(button).toHaveFocus();
});

it('adopts a legacy row save across the baseline switch to its persisted ID without another preview', async () => {
  const legacyKey = JSON.stringify(['hha', 't1019', null, null]);
  const input = {...selection.input, program: 'hha' as const, serviceRowKey: 'local-row'};
  const savedReview: AssignmentReview = {...review, context: {...review.context, program: 'hha', serviceRowKey: 'local-row'}};
  vi.mocked(getAssignmentReview).mockImplementation(() => new Promise(() => {}));
  const {result, rerender} = renderHook(({requestServiceRowKey}) => useAssignmentReview({...selection, input, requestServiceRowKey}, {enabled: true, scopeKey: 'actor'}), {initialProps: {requestServiceRowKey: legacyKey}});
  const submitted = result.current.viewKey;
  act(() => {expect(result.current.acceptSavedReview(savedReview, submitted)).toBe(true);});
  rerender({requestServiceRowKey: 'local-row'});
  expect(result.current.viewKey).toBe(submitted);
  expect(result.current.review).toEqual(savedReview);
  expect(getAssignmentReview).toHaveBeenCalledTimes(1);
  act(() => {void result.current.refresh();});
  expect(getAssignmentReview).toHaveBeenLastCalledWith(expect.objectContaining({requestServiceRowKey: 'local-row'}), expect.any(AbortSignal));
});
