import {act, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {beforeEach, expect, it, vi} from 'vitest';
import {ClientCompetencyPanel} from './ClientCompetencyPanel';
import {getClientCompetencies, saveClientCompetency, type CompetencyDTO} from '@/lib/api/client-needs';

const context = vi.hoisted(() => ({scope: 'owner:agency:staging'}));
vi.mock('@/hooks/useAssignmentReview', () => ({useAssignmentReviewScope: () => context.scope}));
vi.mock('@/lib/api/client-needs', () => ({getClientCompetencies: vi.fn(), saveClientCompetency: vi.fn()}));
vi.mock('@/pages/agency/trainings/reviewTrainingsModal', () => ({default: ({open, readOnly, onSelectCertificate}: any) => open ? <button onClick={() => {expect(readOnly).toBe(true); onSelectCertificate({trainingId: 'training-a', certificateId: 'a'.repeat(64)});}}>Pick accepted certificate</button> : null}));
const scope = {clientId: 'client-a', agencyId: 'agency-a', program: 'ddd' as const, employeeId: 'employee-a'};
const ready: CompetencyDTO = {coverage: 'complete', canVerify: true, needsRevision: 2, items: [
  {requirementKey: 'medication_support', state: 'not_recorded', reviewRevision: 0},
  {requirementKey: 'medical_acuity', state: 'not_required', reviewRevision: 0},
  {requirementKey: 'behavioral_acuity', state: 'needs_not_recorded', reviewRevision: 0},
]};
beforeEach(() => {vi.resetAllMocks(); context.scope = 'owner:agency:staging'; vi.mocked(getClientCompetencies).mockResolvedValue(structuredClone(ready));});

async function editVerification() {
  fireEvent.click(await screen.findByRole('button', {name: 'Record verification for Medication support'}));
  fireEvent.change(screen.getByLabelText('Verification basis'), {target: {value: 'Reviewed for this client'}});
  fireEvent.click(screen.getByRole('button', {name: 'Choose completion certificate'}));
  fireEvent.click(screen.getByRole('button', {name: 'Pick accepted certificate'}));
}
it('uses scoped revisions and adopts a saved row without reloading or submitting assignments', async () => {
  vi.mocked(saveClientCompetency).mockResolvedValue({needsRevision: 2, item: {...ready.items[0], state: 'verified', reviewRevision: 1}});
  render(<><button>Save assignment</button><ClientCompetencyPanel {...scope} /></>);
  await editVerification();
  fireEvent.click(screen.getByRole('button', {name: 'Save verification'}));
  await screen.findByText('Verification recorded');
  expect(saveClientCompetency).toHaveBeenCalledWith({clientId: 'client-a', agencyId: 'agency-a', program: 'ddd'}, 'employee-a', 'medication_support', {expectedNeedsRevision: 2, expectedReviewRevision: 0, result: 'verified', basis: 'Reviewed for this client', trainingId: 'training-a', certificateId: 'a'.repeat(64)});
  expect(getClientCompetencies).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', {name: 'Save assignment'})).not.toBeDisabled();
});
it('hides evidence and editing when access is restricted or read-only', async () => {
  vi.mocked(getClientCompetencies).mockResolvedValueOnce({coverage: 'restricted', canVerify: false}).mockResolvedValue({...ready, canVerify: false});
  const view = render(<ClientCompetencyPanel {...scope} />);
  await screen.findByText('Training records are restricted.');
  expect(screen.queryByText('Medication support')).toBeNull();
  view.rerender(<ClientCompetencyPanel {...scope} employeeId="employee-b" />);
  await screen.findByText('Medication support');
  expect(screen.queryByRole('button', {name: /Record verification/})).toBeNull();
});
it('retains basis, clears evidence and requires explicit reload after a conflict', async () => {
  vi.mocked(saveClientCompetency).mockRejectedValue({response: {status: 409, data: {code: 'TRAINING_EVIDENCE_CHANGED'}}});
  render(<ClientCompetencyPanel {...scope} />);
  await editVerification();
  fireEvent.click(screen.getByRole('button', {name: 'Save verification'}));
  await screen.findByRole('button', {name: 'Reload competency records'});
  expect(screen.getByText('Certificate changed. Reload and review the current records before saving.')).toBeVisible();
  expect(screen.getByLabelText('Verification basis')).toHaveValue('Reviewed for this client');
  expect(screen.getByRole('button', {name: 'Save verification'})).toBeDisabled();
  expect(screen.queryByText('Completion certificate selected.')).toBeNull();
  fireEvent.click(screen.getByRole('button', {name: 'Reload competency records'}));
  await waitFor(() => expect(getClientCompetencies).toHaveBeenCalledTimes(2));
  expect(screen.getByRole('button', {name: 'Save verification'})).toBeDisabled();
});
it('ignores late writes and clears private drafts when authority changes', async () => {
  let finish!: (value: any) => void;
  vi.mocked(saveClientCompetency).mockImplementation(() => new Promise(resolve => {finish = resolve;}));
  const view = render(<ClientCompetencyPanel {...scope} />);
  await editVerification();
  fireEvent.click(screen.getByRole('button', {name: 'Save verification'}));
  context.scope = 'other-actor:agency:staging';
  vi.mocked(getClientCompetencies).mockResolvedValue({coverage: 'restricted', canVerify: false});
  view.rerender(<ClientCompetencyPanel {...scope} />);
  await screen.findByText('Training records are restricted.');
  await act(async () => finish({needsRevision: 2, item: {...ready.items[0], state: 'verified', reviewRevision: 1}}));
  expect(screen.queryByText('Verification recorded')).toBeNull();
  expect(screen.queryByLabelText('Verification basis')).toBeNull();
});
it('keeps basis on service failure and sends no evidence for a not-verified review', async () => {
  vi.mocked(saveClientCompetency).mockRejectedValue({response: {status: 503}});
  render(<ClientCompetencyPanel {...scope} />);
  fireEvent.click(await screen.findByRole('button', {name: 'Record not verified for Medication support'}));
  fireEvent.change(screen.getByLabelText('Verification basis'), {target: {value: 'Evidence does not address client needs'}});
  fireEvent.click(screen.getByRole('button', {name: 'Save verification'}));
  await screen.findByText('Verification could not be saved. Try again.');
  expect(screen.getByLabelText('Verification basis')).toHaveValue('Evidence does not address client needs');
  expect(saveClientCompetency).toHaveBeenCalledWith(expect.anything(), 'employee-a', 'medication_support', {expectedNeedsRevision: 2, expectedReviewRevision: 0, result: 'not_verified', basis: 'Evidence does not address client needs'});
});
it('explains rejected validity without discarding the selected certificate or demanding a reload', async () => {
  vi.mocked(saveClientCompetency).mockRejectedValue({response: {status: 400, data: {code: 'INVALID_COMPETENCY_VALIDITY'}}});
  render(<ClientCompetencyPanel {...scope} />);
  await editVerification();
  fireEvent.click(screen.getByRole('button', {name: 'Save verification'}));
  await screen.findByText("Choose a validity date after today in the agency's time zone, or leave it empty if no date was recorded.");
  expect(screen.getByText('Completion certificate selected.')).toBeVisible();
  expect(screen.getByLabelText('Verification basis')).toHaveValue('Reviewed for this client');
  expect(screen.queryByRole('button', {name: 'Reload competency records'})).toBeNull();
});
