import {clientToFormData} from "../utils/clientToFormData";
import {formDataToApiPayload} from "../utils/formDataToApiPayload";
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {beforeEach, expect, it, vi} from 'vitest';
import {MedicationRequirementQuestion, ServiceAssignedDspsSection} from './ServiceAssignedDspsSection';
import {AssignmentReviewRosterProvider} from '@/components/AssignmentReviewRoster';
import {getAssignmentReview} from '@/lib/api/assignment-review';
import {getClientCompetencies} from '@/lib/api/client-needs';

vi.mock('@/utils/auth', () => ({useAuth: () => ({user: {uid: 'admin', userType: 'super_admin'}})}));
vi.mock('@/hooks/useEffectiveAgencyMode', () => ({useEffectiveAgencyMode: () => 'ddd', agencyModeToApplicantType: (mode: string) => mode === 'hha' ? 'hha' : 'dsp'}));
vi.mock('@/pages/agency/trainings/reviewTrainingsModal', () => ({default: () => null}));
vi.mock('@/lib/api/assignment-review', async original => ({...await original<object>(), getAssignmentReview: vi.fn(() => new Promise(() => {}))}));
vi.mock('@/lib/api/client-needs', () => ({getClientCompetencies: vi.fn(() => new Promise(() => {}))}));
vi.mock('@/lib/api/employees', () => ({searchEmployees: vi.fn()}));
const row = {id: 'service', startDate: '2026-09-01', endDate: '2026-10-01'};
const staff = [{id: 'staff-a', name: 'Ada'}, {id: 'staff-b', name: 'Grace'}];
beforeEach(() => vi.clearAllMocks());

it.each(['ddd', 'hha'] as const)('reviews only the selected staff in the explicit %s agency', async program => {
  render(<AssignmentReviewRosterProvider agencyId="selected-agency" clientId="client" program={program} savedRows={[row]}>
    <ServiceAssignedDspsSection isEditing reviewRow={row} assignedDsps={staff} onChange={vi.fn()} />
  </AssignmentReviewRosterProvider>);
  expect(getAssignmentReview).not.toHaveBeenCalled();
  expect(getClientCompetencies).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', {name: 'Review assignment for Ada'}));
  await waitFor(() => expect(getAssignmentReview).toHaveBeenCalledTimes(1));
  expect(getClientCompetencies).toHaveBeenCalledTimes(1);
  expect(getClientCompetencies).toHaveBeenLastCalledWith({agencyId: 'selected-agency', clientId: 'client', program}, 'staff-a', expect.any(AbortSignal));
  expect(getAssignmentReview).toHaveBeenLastCalledWith(expect.objectContaining({agencyId: 'selected-agency', clientId: 'client', input: {program, kind: 'service_roster', serviceRowKey: 'service', employeeId: 'staff-a'}}), expect.any(AbortSignal));
  fireEvent.click(screen.getByRole('button', {name: 'Add Caregiver'}));
  fireEvent.change(screen.getByPlaceholderText('Search staff by name (2+ characters)'), {target: {value: 'x'}});
  expect(getAssignmentReview).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', {name: 'Review assignment for Grace'}));
  await waitFor(() => expect(getAssignmentReview).toHaveBeenCalledTimes(2));
  expect(getClientCompetencies).toHaveBeenCalledTimes(2);
  expect(screen.getAllByRole('region', {name: 'Client competency'})).toHaveLength(1);
  expect(screen.getAllByRole('region', {name: 'Assignment review'})).toHaveLength(1);
});

it.each([undefined, {...row, startDate: '2026-09-02'}])('does not query unsaved rows or changed source dates', changedRow => {
  render(<AssignmentReviewRosterProvider agencyId="agency" clientId="client" program="hha" savedRows={changedRow ? [row] : []}>
    <ServiceAssignedDspsSection isEditing reviewRow={changedRow || row} assignedDsps={staff} />
  </AssignmentReviewRosterProvider>);
  fireEvent.click(screen.getByRole('button', {name: 'Review assignment for Ada'}));
  expect(screen.getByText('Save these changes to review the assignment records.')).toBeVisible();
  expect(getAssignmentReview).not.toHaveBeenCalled();
});

it('resolves an older HHA authorization using its saved service and dates without persisting review identity', async () => {
  const data = clientToFormData({id: 'client', type: 'hha', hhaAuthorizations: [{serviceCode: 'T1019', startDate: '2026-09-01', endDate: '2026-10-01', staffRate: '20', payType: 'hourly', assignedDsps: staff}]});
  const legacy = data.stage2.hhaAuthorizations![0];
  const key = JSON.stringify(['hha', 't1019', '2026-09-01', '2026-10-01']);
  expect(legacy.reviewSourceRowKey).toBe(key);
  render(<AssignmentReviewRosterProvider agencyId="agency" clientId="client" program="hha" savedRows={[legacy]}><ServiceAssignedDspsSection isEditing reviewRow={legacy} assignedDsps={staff} /></AssignmentReviewRosterProvider>);
  fireEvent.click(screen.getByRole('button', {name: 'Review assignment for Ada'}));
  await waitFor(() => expect(getAssignmentReview).toHaveBeenCalledTimes(1));
  expect(getAssignmentReview).toHaveBeenCalledWith(expect.objectContaining({requestServiceRowKey: key}), expect.any(AbortSignal));
  const payload = formDataToApiPayload(data, false, true);
  expect(payload.hhaAuthorizations![0]).not.toHaveProperty('reviewSourceRowKey');
});

it('does not automatically preview when saving creates the client identity', () => {
  const ui = (clientId?: string) => <AssignmentReviewRosterProvider agencyId="agency" clientId={clientId} program="hha" savedRows={[row]}><ServiceAssignedDspsSection isEditing reviewRow={row} assignedDsps={staff} /></AssignmentReviewRosterProvider>;
  const view = render(ui());
  fireEvent.click(screen.getByRole('button', {name: 'Review assignment for Ada'}));
  expect(screen.getByText('Save these changes to review the assignment records.')).toBeVisible();
  view.rerender(ui('created-client'));
  expect(getAssignmentReview).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', {name: 'Review assignment for Ada'}));
  expect(getAssignmentReview).toHaveBeenCalledTimes(1);
});

it.each(['ddd', 'hha'] as const)('asks only when medication is on, and both answers assign staff in %s', async program => {
  const {useState} = await import('react');
  const {searchEmployees} = await import('@/lib/api/employees');
  vi.mocked(searchEmployees).mockResolvedValue([{id: 'staff-a', fullName: 'Ada'}, {id: 'staff-b', fullName: 'Grace'}] as Awaited<ReturnType<typeof searchEmployees>>);
  function Harness() {
    const [settings, setSettings] = useState({underMedication: false, trainingRequired: false});
    const [assigned, setAssigned] = useState<Array<{id: string; name: string}>>([]);
    return <AssignmentReviewRosterProvider agencyId="agency" program={program} savedRows={[]} medication={{value: settings, onChange: setSettings, showQuestion: true}}>
      <MedicationRequirementQuestion />
      <ServiceAssignedDspsSection isEditing reviewRow={row} assignedDsps={assigned} onChange={setAssigned} />
      <output data-testid="settings">{JSON.stringify(settings)}</output>
    </AssignmentReviewRosterProvider>;
  }
  render(<Harness />);
  const pick = async (name: string) => {
    fireEvent.click(screen.getByRole('button', {name: 'Add Caregiver'}));
    fireEvent.change(screen.getByPlaceholderText('Search staff by name (2+ characters)'), {target: {value: name}});
    fireEvent.click(await screen.findByRole('button', {name}));
  };
  await pick('Ada');
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(screen.getByRole('button', {name: 'Remove Ada from this service'})).toBeVisible();
  fireEvent.click(screen.getByRole('button', {name: 'Remove Ada from this service'}));
  fireEvent.click(screen.getByRole('switch', {name: 'Is this client under medication?'}));
  await pick('Ada');
  expect(screen.getByRole('dialog')).toHaveTextContent('Medication Training Required');
  expect(screen.queryByRole('button', {name: 'Remove Ada from this service'})).toBeNull();
  fireEvent.click(screen.getByRole('button', {name: 'No'}));
  expect(screen.getByRole('button', {name: 'Remove Ada from this service'})).toBeVisible();
  expect(screen.getByTestId('settings')).toHaveTextContent('{"underMedication":true,"trainingRequired":false}');
  // No does not switch off the medication answer: the next selection still asks.
  await pick('Grace');
  expect(screen.getByRole('dialog')).toBeVisible();
  fireEvent.click(screen.getByRole('button', {name: 'Yes'}));
  expect(screen.getByRole('button', {name: 'Remove Grace from this service'})).toBeVisible();
  expect(screen.getByTestId('settings')).toHaveTextContent('{"underMedication":true,"trainingRequired":true}');
  fireEvent.click(screen.getByRole('switch', {name: 'Is this client under medication?'}));
  expect(screen.getByTestId('settings')).toHaveTextContent('{"underMedication":false,"trainingRequired":false}');
});
