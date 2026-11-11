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

const mocks = vi.hoisted(() => ({log: {} as any, save: vi.fn(), submit: vi.fn(), navigate: vi.fn()}));
vi.mock('react-router', () => ({useLocation: () => ({search: '?id=log'}), useNavigate: () => mocks.navigate, Link: ({to, children, ...rest}: any) => <a href={to} {...rest}>{children}</a>}));
vi.mock('@/utils/auth', () => ({useAuth: () => ({user: {fullName: 'Aide'}})}));
vi.mock('@/pages/userPanel/notes/api', () => ({
  useGetSingleActivityLogQuery: () => ({data: mocks.log, isLoading: false}),
  useCreateOrUpdateActivityLogMutation: () => [mocks.save, {isLoading: false}],
  useSubmitActivityLogNotesMutation: () => [mocks.submit, {isLoading: false}],
  useUpdateActivityLogMutation: () => [() => ({unwrap: async () => undefined})],
  useGetMyNotesQuery: () => ({data: undefined}),
  useGetNoteCommentsQuery: () => ({data: []}),
  useGetNoteHistoryQuery: () => ({data: [], isLoading: false}),
  useAddNoteCommentMutation: () => [vi.fn(), {isLoading: false}],
  useResolveNoteCommentMutation: () => [vi.fn(), {isLoading: false}],
}));
vi.mock('@/contexts/VoiceRecordingContext', () => ({
  VoiceRecordingProvider: ({children}: any) => children,
  useVoiceRecording: () => ({startRecording: vi.fn(), registerActiveTarget: vi.fn(), isRecording: false, isActiveField: () => false}),
  useVoiceSessionActions: () => ({acceptSession: vi.fn(), cancelSession: vi.fn(), recordingUi: {}}),
}));
vi.mock('@/components/VoiceInputButton', () => ({default: () => null}));
vi.mock('@/components/ContentEditableCell', () => ({default: ({value, onChange, readOnly, fieldName, fieldKey}: any) => <div data-note-field={fieldKey}><textarea aria-label={fieldName} value={value ?? ''} readOnly={readOnly} onChange={e => onChange(e.target.value)} /></div>}));
vi.mock('@/components/TimePicker', () => ({default: ({value, onChange, disabled}: any) => <input aria-label="Time" value={value} disabled={disabled} onChange={e => onChange(e.target.value)} />}));
import ActivitiesLogTemplate from '@/components/ActivitiesLogTemplate';
import HhaServiceActivityLogPage from './hha-service-activity-log';
import PersonalCareNoteForm from './hha-personal-care/PersonalCareNoteForm';
import SupportedEmploymentPrePage from './supported-employment-pre';
afterEach(cleanup);
/** Fills the required HHA choices and opens the review drawer. */
function reviewHha(description?: string) {
  if (description !== undefined) fireEvent.change(screen.getByRole('textbox', {name: 'Describe the day'}), {target: {value: description}});
  fireEvent.click(screen.getByRole('radio', {name: 'Fully engaged'}));
  fireEvent.click(screen.getByRole('checkbox', {name: /I confirm this note is accurate/}));
  fireEvent.click(screen.getByRole('button', {name: 'Review and submit'}));
}
beforeEach(() => {
  mocks.navigate.mockReset();
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
    fireEvent.change(screen.getByRole('textbox', {name: 'Strategies addressed'}), {target: {value: 'Updated strategy'}});
    await waitFor(() => expect(mocks.save).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('checkbox', {name: /I confirm this log is accurate/}));
    fireEvent.click(screen.getByRole('button', {name: 'Review and submit'}));
    fireEvent.click(await screen.findByRole('button', {name: 'Submit note'}));
    expect(mocks.submit).not.toHaveBeenCalled();
    await act(async () => {resolve({data: {id: 'new-row'}});});
    await waitFor(() => expect(mocks.submit).toHaveBeenCalledWith(expect.objectContaining({logNoteIds: ['new-row'], operationId: expect.any(String)})));
  });
  it('preserves shared activity input and never submits when save fails', async () => {
    mocks.log.notes = [{id: 'row', startDate: '2026-09-12', metadata: {strategies: 'Before'}}];
    mocks.save.mockImplementation(() => ({unwrap: async () => {throw new Error('Offline');}}));
    render(<ActivitiesLogTemplate title="Activities" />);
    fireEvent.change(screen.getByRole('textbox', {name: 'Strategies addressed'}), {target: {value: 'Keep this draft'}});
    await act(async () => {});
    fireEvent.click(screen.getByRole('button', {name: 'Save draft'}));
    await act(async () => {});
    expect(mocks.submit).not.toHaveBeenCalled();
    expect(screen.getByRole('textbox', {name: 'Strategies addressed'})).toHaveValue('Keep this draft');
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
    reviewHha('Assisted with activities');
    fireEvent.click(await screen.findByRole('button', {name: 'Submit note'}));
    await waitFor(() => expect(mocks.submit).toHaveBeenCalled());
    expect(mocks.save.mock.calls.at(-1)![0].data).toMatchObject({startDate: '2026-09-12', endDate: '2026-09-12', metadata: {description: 'Assisted with activities', response: 'Fully engaged', confirmed: true}});
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith('/user-panel/notes', {state: {submittedNote: expect.objectContaining({activityLogId: 'log'})}}));
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
    expect(screen.queryByRole('button', {name: 'Review and submit'})).not.toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Download PDF'})).toBeInTheDocument();
  });
});

it('focuses the exact backend field error beside its row', async () => {
  mocks.log.notes = [{id: 'row', startDate: '2026-09-12', metadata: {strategies: 'Goal', units: '1', activities: 'Walk', location: 'Park', notes: 'Too short'}}];
  mocks.submit.mockImplementation(() => ({unwrap: async () => {throw {status: 422, data: {fieldErrors: [{noteId: 'row', field: 'metadata.notes', code: 'required'}]}};}}));
  render(<ActivitiesLogTemplate title="Activities" />);
  fireEvent.click(screen.getByRole('checkbox', {name: /I confirm this log is accurate/}));
  fireEvent.click(screen.getByRole('button', {name: 'Review and submit'}));
  fireEvent.click(await screen.findByRole('button', {name: 'Submit note'}));
  await screen.findByText('Enter a valid activity notes for row 1.');
  await waitFor(() => expect(screen.getByRole('textbox', {name: 'How they took part'})).toHaveFocus());
});
it('retries uncertain HHA submission without resaving possibly locked evidence', async () => {
  mocks.submit.mockImplementationOnce(() => ({unwrap: async () => {throw {status: 'FETCH_ERROR'};}})).mockImplementation(() => ({unwrap: async () => undefined}));
  render(<HhaServiceActivityLogPage />);
  fireEvent.change(screen.getByRole('textbox', {name: 'Describe the day'}), {target: {value: 'Care completed'}});
  reviewHha();
  fireEvent.click(await screen.findByRole('button', {name: 'Submit note'}));
  await screen.findByText('Submission could not be confirmed. Submit again to retry safely before editing.');
  const firstKey = mocks.submit.mock.calls[0][0].operationId;
  const saves = mocks.save.mock.calls.length;
  fireEvent.click(screen.getByRole('button', {name: 'Submit note'}));
  await waitFor(() => expect(mocks.submit).toHaveBeenCalledTimes(2));
  expect(mocks.submit.mock.calls[1][0].operationId).toBe(firstKey);
  expect(mocks.save).toHaveBeenCalledTimes(saves);
});

it('leaves another HHA draft editable after submitting only the selected row', async () => {
  mocks.log.notes = [{id: 'first', startDate: '2026-09-12', metadata: {description: 'First care'}}, {id: 'second', startDate: '2026-09-12', metadata: {description: 'Other draft'}}];
  render(<HhaServiceActivityLogPage />);
  expect(screen.getByText('Other draft')).toBeInTheDocument();
  reviewHha();
  fireEvent.click(await screen.findByRole('button', {name: 'Submit note'}));
  await waitFor(() => expect(mocks.submit).toHaveBeenCalledWith(expect.objectContaining({logNoteIds: ['first']})));
});

it('switches to another HHA draft row after saving the open one', async () => {
  mocks.log.notes = [{id: 'first', startDate: '2026-09-12', metadata: {description: 'First care'}}, {id: 'second', startDate: '2026-09-12', metadata: {description: 'Other draft'}}];
  render(<HhaServiceActivityLogPage />);
  fireEvent.click(screen.getByRole('button', {name: 'Edit draft'}));
  await waitFor(() => expect(screen.getByRole('textbox', {name: 'Describe the day'})).toHaveValue('Other draft'));
  expect(mocks.save.mock.calls[0][0].data).toMatchObject({id: 'first', metadata: {description: 'First care'}});
  expect(screen.getByRole('textbox', {name: 'Describe the day'})).not.toBeDisabled();
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
  fireEvent.click(screen.getByRole('button', {name: 'Edit entry 1'}));
  expect(screen.getByLabelText('Start time')).toHaveValue('23:00');
  expect(screen.getByLabelText('End time')).toHaveValue('01:00');
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
  fireEvent.click(screen.getByRole('button', {name: 'Edit entry 1'}));
  fireEvent.change(screen.getByDisplayValue('Original activity'), {target: {value: 'Preserved narrative'}});
  await waitFor(() => expect(mocks.save).toHaveBeenCalledTimes(1));
  fireEvent.click(screen.getByRole('checkbox', {name: /Increasing independence/}));
  fireEvent.click(screen.getByRole('checkbox', {name: /I confirm this log is accurate/}));
  fireEvent.click(screen.getByRole('button', {name: 'Review and submit'}));
  fireEvent.click(await screen.findByRole('button', {name: 'Submit note'}));
  await waitFor(() => expect(mocks.submit).toHaveBeenCalled());
  expect(mocks.save).toHaveBeenCalledTimes(2);
  expect(mocks.save.mock.calls[1][0].data).toMatchObject({...dates, metadata: {activity: 'Preserved narrative'}});
});
it('includes preview content in the operation identity', async () => {
 const {result}=renderHook(useNoteOperation);
 const intent={action:'submit' as const,resourceId:'log',noteIds:['row'],contentKey:'preview-1'};
 const failed=vi.fn(async (_id:string)=>{throw {status:'FETCH_ERROR'};});
 await act(async()=>{await result.current.run(intent,failed).catch(()=>undefined);});
 const retry=vi.fn(async (_id:string)=>undefined);
 await act(async()=>{await result.current.run({...intent,contentKey:'preview-2'},retry);});
 expect(retry.mock.calls[0][0]).not.toBe(failed.mock.calls[0][0]);
});

import PersonalCarePage from './hha-personal-care';
it('lists what blocks a personal care note, then submits it signed', async () => {
  render(<PersonalCarePage />);
  fireEvent.click(screen.getByRole('button', {name: 'Review and submit'}));
  expect(await screen.findByText('3 things to fix before you can submit')).toBeInTheDocument();
  expect(screen.queryByRole('button', {name: 'Submit note'})).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('checkbox', {name: 'Oral care'}));
  fireEvent.change(screen.getByRole('textbox', {name: 'How did the visit go?'}), {target: {value: 'Brushed teeth with prompting.'}});
  fireEvent.click(screen.getByRole('checkbox', {name: /I confirm this note is accurate/}));
  fireEvent.click(screen.getByRole('button', {name: 'Review and submit'}));
  fireEvent.click(await screen.findByRole('button', {name: 'Submit note'}));
  await waitFor(() => expect(mocks.submit).toHaveBeenCalled());
  expect(mocks.save.mock.calls.at(-1)![0].data.metadata).toMatchObject({checkedActivities: ['Oral care'], narrative: 'Brushed teeth with prompting.', confirmed: true, completedBy: 'Aide'});
});
it('shows an approved personal care note read-only and offers a correction request', async () => {
  mocks.log.approvedNotes = [{id: 'approved', startDate: '2026-09-12', metadata: {checkedActivities: ['Oral care'], narrative: 'All done', completedBy: 'Aide', completionDate: '2026-09-12'}}];
  render(<PersonalCarePage />);
  expect(screen.getByText('All done')).toBeInTheDocument();
  expect(screen.queryByRole('checkbox', {name: 'Oral care'})).not.toBeInTheDocument();
  fireEvent.click(screen.getAllByRole('button', {name: 'Request a correction'})[0]);
  expect(await screen.findByRole('textbox', {name: 'What needs to change?'})).toBeInTheDocument();
});
