import { act, renderHook, render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useNoteOperation } from '@/lib/notes/useNoteOperation';

describe('note operation retry identity', () => {
  it('shares pending clicks and retains the key after an uncertain failure', async () => {
    const {result} = renderHook(useNoteOperation);
    let reject!: (value: unknown) => void;
    const send = vi.fn((_operationId: string) => new Promise<void>((_, fail) => { reject = fail; }));
    const intent = {action: 'submit' as const, resourceId: 'log', noteIds: ['row']};
    let first!: Promise<void>;
    act(() => { first = result.current.run(intent, send); });
    const failure = first.catch(() => undefined);
    act(() => { expect(result.current.run(intent, send)).toBe(first); });
    await act(async () => { await Promise.resolve(); reject({status: 'FETCH_ERROR'}); await failure; });
    const retry = vi.fn(async (_operationId: string) => undefined);
    await act(async () => { await result.current.run(intent, retry); });
    expect(retry.mock.calls[0][0]).toBe(send.mock.calls[0][0]);
    await act(async () => { await result.current.run(intent, retry); });
    expect(retry.mock.calls[1][0]).not.toBe(retry.mock.calls[0][0]);
  });
});

const mocks = vi.hoisted(() => ({log: {} as any, save: vi.fn(), submit: vi.fn()}));
vi.mock('react-router', () => ({useLocation: () => ({search: '?id=log'}), useNavigate: () => vi.fn()}));
vi.mock('@/utils/auth', () => ({useAuth: () => ({user: {fullName: 'Aide'}})}));
vi.mock('@/pages/userPanel/notes/api', () => ({
  useGetSingleActivityLogQuery: () => ({data: mocks.log, isLoading: false}),
  useCreateOrUpdateActivityLogMutation: () => [mocks.save, {isLoading: false}],
  useSubmitActivityLogNotesMutation: () => [mocks.submit, {isLoading: false}],
  useUpdateActivityLogMutation: () => [() => ({unwrap: async () => undefined})],
}));
vi.mock('@/contexts/VoiceRecordingContext', () => ({VoiceRecordingProvider: ({children}: any) => children}));
vi.mock('@/components/VoiceInputButton', () => ({default: () => null}));
vi.mock('@/components/ContentEditableCell', () => ({default: ({value, onChange, readOnly, fieldName, fieldKey}: any) => <div data-note-field={fieldKey}><textarea aria-label={fieldName} value={value ?? ''} readOnly={readOnly} onChange={e => onChange(e.target.value)} /></div>}));
vi.mock('@/components/TimePicker', () => ({default: ({value, onChange, disabled}: any) => <input aria-label="Time" value={value} disabled={disabled} onChange={e => onChange(e.target.value)} />}));
import ActivitiesLogTemplate from '@/components/ActivitiesLogTemplate';
import HhaServiceActivityLogPage from './hha-service-activity-log';
import PersonalCareNoteForm from './hha-personal-care/PersonalCareNoteForm';
import SupportedEmploymentPrePage from './supported-employment-pre';
afterEach(cleanup);
beforeEach(() => {
  mocks.log = {id: 'log', status: 'active', notes: [], submittedNotes: [], approvedNotes: [], metadata: {}, serviceDate: '2026-09-12'};
  mocks.save.mockReset().mockImplementation(() => ({unwrap: async () => ({data: {id: 'saved-row'}})}));
  mocks.submit.mockReset().mockImplementation(() => ({unwrap: async () => undefined}));
});
describe('existing note forms', () => {
  it('waits for the shared activity autosave and submits its returned ID', async () => {
    mocks.log.notes = [{id: '', startDate: '2026-09-12', metadata: {units: '1', strategies: 'Goal', activities: 'Walk', location: 'Park', notes: 'Progress'}}];
    let resolve!: (value: unknown) => void;
    mocks.save.mockImplementation(() => ({unwrap: () => new Promise(done => {resolve = done;})}));
    render(<ActivitiesLogTemplate title="Activities" />);
    fireEvent.change(screen.getAllByRole('textbox', {name: 'Strategies Addressed Today'})[0], {target: {value: 'Updated strategy'}});
    await waitFor(() => expect(mocks.save).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', {name: 'Submit'}));
    expect(mocks.submit).not.toHaveBeenCalled();
    await act(async () => {resolve({data: {id: 'new-row'}});});
    await waitFor(() => expect(mocks.submit).toHaveBeenCalledWith(expect.objectContaining({logNoteIds: ['new-row'], operationId: expect.any(String)})));
  });
  it('preserves shared activity input and never submits when save fails', async () => {
    mocks.log.notes = [{id: 'row', startDate: '2026-09-12', metadata: {strategies: 'Before'}}];
    mocks.save.mockImplementation(() => ({unwrap: async () => {throw new Error('Offline');}}));
    render(<ActivitiesLogTemplate title="Activities" />);
    fireEvent.change(screen.getAllByRole('textbox', {name: 'Strategies Addressed Today'})[0], {target: {value: 'Keep this draft'}});
    await act(async () => {});
    fireEvent.click(screen.getByRole('button', {name: 'Submit'}));
    await act(async () => {});
    expect(mocks.submit).not.toHaveBeenCalled();
    expect(screen.getAllByRole('textbox', {name: 'Strategies Addressed Today'})[0]).toHaveValue('Keep this draft');
  });
  it('keeps mixed supported-employment evidence visible with only drafts editable', () => {
    const note = (id: string, text: string) => ({id, startDate: '2026-09-12', metadata: {whatWasDone: text}});
    mocks.log.notes = [note('draft', 'Draft work')];
    mocks.log.submittedNotes = [note('submitted', 'Submitted work')];
    mocks.log.approvedNotes = [note('approved', 'Approved work')];
    render(<SupportedEmploymentPrePage />);
    expect(screen.getByDisplayValue('Draft work')).not.toHaveAttribute('readonly');
    expect(screen.getByDisplayValue('Submitted work')).toHaveAttribute('readonly');
    expect(screen.getByDisplayValue('Approved work')).toHaveAttribute('readonly');
  });
  it('uses linked service date for a late HHA service note and flushes its draft', async () => {
    render(<HhaServiceActivityLogPage />);
    fireEvent.change(screen.getByRole('textbox', {name: 'Activity'}), {target: {value: 'Assisted with activities'}});
    fireEvent.click(screen.getByRole('button', {name: 'Submit'}));
    await waitFor(() => expect(mocks.submit).toHaveBeenCalled());
    expect(mocks.save.mock.calls[0][0].data).toMatchObject({startDate: '2026-09-12', endDate: '2026-09-12', metadata: {description: 'Assisted with activities'}});
  });
  it('keeps personal-care service date separate from completion date', async () => {
    render(<PersonalCareNoteForm activityLogId="log" />);
    fireEvent.click(screen.getAllByRole('checkbox')[0]);
    fireEvent.click(screen.getByRole('button', {name: 'Submit'}));
    await waitFor(() => expect(mocks.submit).toHaveBeenCalled());
    expect(mocks.save.mock.calls[0][0].data.startDate).toBe('2026-09-12');
    expect(mocks.save.mock.calls[0][0].data.metadata.completionDate).not.toBe('2026-09-12');
  });
  it('renders approved HHA evidence read-only after reload', () => {
    mocks.log.approvedNotes = [{id: 'approved', metadata: {description: 'Approved care'}}];
    render(<HhaServiceActivityLogPage />);
    expect(screen.getByDisplayValue('Approved care')).toHaveAttribute('readonly');
    expect(screen.getByRole('button', {name: 'Submitted'})).toBeDisabled();
  });
});

it('focuses the exact backend field error beside its row', async () => {
  mocks.log.notes = [{id: 'row', startDate: '2026-09-12', metadata: {strategies: 'Goal', units: '1', activities: 'Walk', location: 'Park', notes: ''}}];
  mocks.submit.mockImplementation(() => ({unwrap: async () => {throw {status: 422, data: {fieldErrors: [{noteId: 'row', field: 'metadata.notes', code: 'required'}]}};}}));
  render(<ActivitiesLogTemplate title="Activities" />);
  fireEvent.click(screen.getByRole('button', {name: 'Submit'}));
  await screen.findByText('Enter a valid activity notes for row 1.');
  await waitFor(() => expect(screen.getAllByRole('textbox', {name: "Notes Related to Today's Activities & Progress Toward Outcome(s)"})[0]).toHaveFocus());
});
it('retries uncertain HHA submission without resaving possibly locked evidence', async () => {
  mocks.submit.mockImplementationOnce(() => ({unwrap: async () => {throw {status: 'FETCH_ERROR'};}})).mockImplementation(() => ({unwrap: async () => undefined}));
  render(<HhaServiceActivityLogPage />);
  fireEvent.change(screen.getByRole('textbox', {name: 'Activity'}), {target: {value: 'Care completed'}});
  fireEvent.click(screen.getByRole('button', {name: 'Submit'}));
  await screen.findByText('Submission could not be confirmed. Submit again to retry safely before editing.');
  const firstKey = mocks.submit.mock.calls[0][0].operationId;
  fireEvent.click(screen.getByRole('button', {name: 'Submit'}));
  await waitFor(() => expect(mocks.submit).toHaveBeenCalledTimes(2));
  expect(mocks.submit.mock.calls[1][0].operationId).toBe(firstKey);
  expect(mocks.save).toHaveBeenCalledTimes(1);
});

it('leaves another HHA draft editable after submitting only the selected row', async () => {
  mocks.log.notes = [{id: 'first', startDate: '2026-09-12', metadata: {description: 'First care'}}, {id: 'second', startDate: '2026-09-12', metadata: {description: 'Other draft'}}];
  render(<HhaServiceActivityLogPage />);
  expect(screen.getByText('Other draft')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', {name: 'Submit'}));
  await waitFor(() => expect(mocks.submit).toHaveBeenCalledWith(expect.objectContaining({logNoteIds: ['first']})));
  fireEvent.click(screen.getByRole('button', {name: 'Edit draft'}));
  await waitFor(() => expect(screen.getByRole('textbox', {name: 'Activity'})).toHaveValue('Other draft'));
  expect(screen.getByRole('textbox', {name: 'Activity'})).not.toHaveAttribute('readonly');
});

import CommunityBasedPage from './community-based';
import { noteServiceDate, noteTimedFields, noteEndDate } from '@/lib/notes/noteTypes';
import {format} from 'date-fns';
it('preserves civil dates for strict and legacy midnight values in any browser zone', () => {
  expect(format(noteServiceDate('2026-09-12T00:00:00.000Z')!, 'yyyy-MM-dd')).toBe('2026-09-12');
  expect(format(noteServiceDate('2026-09-12')!, 'yyyy-MM-dd')).toBe('2026-09-12');
  expect(noteServiceDate('2026-09-12T05:00:00Z')).toBeUndefined();
  expect(noteServiceDate('2026-02-30')).toBeUndefined();
});
it('displays agency-local timed fields and preserves existing instants when only text changes', async () => {
  mocks.log.timezone = 'America/New_York'; mocks.log.shiftId = 'shift';
  mocks.log.notes = [{id: 'timed', startDate: '2026-09-13T03:00:00.000Z', endDate: '2026-09-13T05:00:00.000Z', metadata: {activity: 'Original activity', description: 'Progress'}}];
  render(<CommunityBasedPage />);
  expect(screen.getAllByLabelText('Time')[0]).toHaveValue('23:00');
  expect(screen.getAllByLabelText('Time')[1]).toHaveValue('01:00');
  fireEvent.change(screen.getByDisplayValue('Original activity'), {target: {value: 'Updated activity'}});
  await waitFor(() => expect(mocks.save).toHaveBeenCalled());
  expect(mocks.save.mock.calls[0][0].data).toMatchObject({startDate: '2026-09-13T03:00:00.000Z', endDate: '2026-09-13T05:00:00.000Z'});
  expect(format(noteTimedFields('2026-09-13T03:00:00Z', 'America/New_York').date!, 'yyyy-MM-dd')).toBe('2026-09-12');
});
it('advances end dates only for confirmed overnight shifts and saves positive SE hours', async () => {
  const date = noteServiceDate('2026-09-12')!;
  expect(noteEndDate(date, '23:00', '01:00', ['2026-09-12'])).toBe('2026-09-12');
  expect(noteEndDate(date, '23:00', '01:00', ['2026-09-12', '2026-09-13'])).toBe('2026-09-13');
  mocks.log.serviceDates = ['2026-09-12', '2026-09-13'];
  mocks.log.notes = [{id: 'night', startDate: '2026-09-12T00:00:00Z', metadata: {whatWasDone: 'Night support', noOfHoursStart: '23:00', noOfHoursEnd: '01:00', noOfHoursTotal: '2'}}];
  render(<SupportedEmploymentPrePage />);
  fireEvent.change(screen.getByDisplayValue('Night support'), {target: {value: 'Updated night support'}});
  await waitFor(() => expect(mocks.save).toHaveBeenCalled());
  expect(mocks.save.mock.calls[0][0].data).toMatchObject({startDate: '2026-09-12', endDate: '2026-09-13', metadata: {noOfHoursTotal: '2'}});
});
it('shows persisted completion attribution and date on locked personal-care evidence', () => {
  mocks.log.approvedNotes = [{id: 'approved', startDate: '2026-09-12', metadata: {checkedActivities: ['Medication reminders'], completedBy: 'Previous worker', completionDate: '2026-09-12'}}];
  render(<PersonalCareNoteForm activityLogId="log" />);
  expect(screen.getByText('Previous worker')).toBeInTheDocument();
  expect(screen.getByText('September 12, 2026')).toBeInTheDocument();
});
it('preserves exact timed instants when a narrative autosave fails and Submit retries it', async () => {
  mocks.log.timezone = 'America/New_York'; mocks.log.shiftId = 'shift';
  const dates = {startDate: '2026-11-01T05:15:30.000Z', endDate: '2026-11-01T06:45:15.000Z'};
  mocks.log.notes = [{id: 'timed', ...dates, metadata: {activity: 'Original activity', description: 'Progress'}}];
  mocks.save.mockImplementationOnce(() => ({unwrap: async () => {throw new Error('Offline');}})).mockImplementation(() => ({unwrap: async () => ({data: {id: 'timed'}})}));
  render(<CommunityBasedPage />);
  fireEvent.change(screen.getByDisplayValue('Original activity'), {target: {value: 'Preserved narrative'}});
  await waitFor(() => expect(mocks.save).toHaveBeenCalledTimes(1));
  fireEvent.click(screen.getByRole('button', {name: 'Submit'}));
  await waitFor(() => expect(mocks.submit).toHaveBeenCalled());
  expect(mocks.save).toHaveBeenCalledTimes(2);
  expect(mocks.save.mock.calls[1][0].data).toMatchObject({...dates, metadata: {activity: 'Preserved narrative'}});
});
