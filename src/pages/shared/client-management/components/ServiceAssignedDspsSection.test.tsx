import {clientToFormData} from "../utils/clientToFormData";
import {formDataToApiPayload} from "../utils/formDataToApiPayload";
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {beforeEach, expect, it, vi} from 'vitest';
import {MedicationRequirementQuestion, ServiceAssignedDspsSection} from './ServiceAssignedDspsSection';
import {AssignmentReviewRosterProvider} from '@/components/AssignmentReviewRoster';
import {getAssignmentDecision} from '@/lib/api/assignment-decision';
import {getClientCompetencies} from '@/lib/api/client-needs';

vi.mock('@/utils/auth', () => ({useAuth: () => ({user: {uid: 'admin', userType: 'super_admin'}})}));
vi.mock('@/hooks/useEffectiveAgencyMode', () => ({useEffectiveAgencyMode: () => 'ddd', agencyModeToApplicantType: (mode: string) => mode === 'hha' ? 'hha' : 'dsp'}));
vi.mock('@/pages/agency/trainings/reviewTrainingsModal', () => ({default: () => null}));
vi.mock('@/lib/api/assignment-decision', async original => ({...await original<object>(), getAssignmentDecision: vi.fn(() => new Promise(() => {}))}));
vi.mock('@/lib/api/client-needs', () => ({getClientCompetencies: vi.fn(() => new Promise(() => {}))}));
vi.mock('@/lib/api/employees', () => ({searchEmployees: vi.fn()}));
const row = {id: 'service', startDate: '2026-09-01', endDate: '2026-10-01'};
const staff = [{id: 'staff-a', name: 'Ada'}, {id: 'staff-b', name: 'Grace'}];
beforeEach(() => {vi.clearAllMocks(); vi.mocked(getAssignmentDecision).mockReset().mockImplementation(() => new Promise(() => {}));});

it.each(['ddd', 'hha'] as const)('reviews only the selected staff in the explicit %s agency', async program => {
  render(<AssignmentReviewRosterProvider agencyId="selected-agency" clientId="client" program={program} savedRows={[row]}>
    <ServiceAssignedDspsSection isEditing reviewRow={row} assignedDsps={staff} onChange={vi.fn()} />
  </AssignmentReviewRosterProvider>);
  expect(getAssignmentDecision).not.toHaveBeenCalled();
  expect(getClientCompetencies).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', {name: 'Review assignment for Ada'}));
  await waitFor(() => expect(getAssignmentDecision).toHaveBeenCalledTimes(1));
  expect(getClientCompetencies).not.toHaveBeenCalled();
  expect(getAssignmentDecision).toHaveBeenLastCalledWith(expect.objectContaining({agencyId: 'selected-agency', clientId: 'client', input: expect.objectContaining({program, kind: 'service_roster', serviceRowKey: 'service', employeeId: 'staff-a', roster: expect.any(Object)})}), expect.any(AbortSignal));
  fireEvent.click(screen.getByRole('button', {name: 'Add Caregiver'}));
  fireEvent.change(screen.getByPlaceholderText('Search staff by name (2+ characters)'), {target: {value: 'x'}});
  expect(getAssignmentDecision).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', {name: 'Review assignment for Grace'}));
  await waitFor(() => expect(getAssignmentDecision).toHaveBeenCalledTimes(2));
  expect(getClientCompetencies).not.toHaveBeenCalled();
  expect(screen.getAllByRole('region', {name: 'Assignment checks'})).toHaveLength(1);
});

it.each([undefined, {...row, startDate: '2026-09-02'}])('previews unsaved rows and changed source dates', async changedRow => {
  render(<AssignmentReviewRosterProvider agencyId="agency" clientId="client" program="hha" savedRows={changedRow ? [row] : []}>
    <ServiceAssignedDspsSection isEditing reviewRow={changedRow || row} assignedDsps={staff} />
  </AssignmentReviewRosterProvider>);
  fireEvent.click(screen.getByRole('button', {name: 'Review assignment for Ada'}));
  await waitFor(() => expect(getAssignmentDecision).toHaveBeenCalledTimes(1));
  expect(getAssignmentDecision).toHaveBeenCalledWith(expect.objectContaining({input: expect.objectContaining({roster: expect.objectContaining({startDate: changedRow?.startDate || row.startDate})})}), expect.any(AbortSignal));
});

it('resolves an older HHA authorization using its saved service and dates without persisting review identity', async () => {
  const data = clientToFormData({id: 'client', type: 'hha', hhaAuthorizations: [{serviceCode: 'T1019', startDate: '2026-09-01', endDate: '2026-10-01', staffRate: '20', payType: 'hourly', assignedDsps: staff}]});
  const legacy = data.stage2.hhaAuthorizations![0];
  const key = JSON.stringify(['hha', 't1019', '2026-09-01', '2026-10-01']);
  expect(legacy.reviewSourceRowKey).toBe(key);
  render(<AssignmentReviewRosterProvider agencyId="agency" clientId="client" program="hha" savedRows={[legacy]}><ServiceAssignedDspsSection isEditing reviewRow={legacy} assignedDsps={staff} /></AssignmentReviewRosterProvider>);
  fireEvent.click(screen.getByRole('button', {name: 'Review assignment for Ada'}));
  await waitFor(() => expect(getAssignmentDecision).toHaveBeenCalledTimes(1));
  expect(getAssignmentDecision).toHaveBeenCalledWith(expect.objectContaining({input: expect.objectContaining({serviceRowKey: legacy.id, roster: expect.objectContaining({serviceCode: 'T1019'})})}), expect.any(AbortSignal));
  const payload = formDataToApiPayload(data, false, true);
  expect(payload.hhaAuthorizations![0]).not.toHaveProperty('reviewSourceRowKey');
});

it('previews staff requirements for a new client without a save', async () => {
 render(<AssignmentReviewRosterProvider agencyId="agency" program="hha" savedRows={[]}><ServiceAssignedDspsSection isEditing reviewRow={row} assignedDsps={staff} /></AssignmentReviewRosterProvider>);
 fireEvent.click(screen.getByRole('button', {name: 'Review assignment for Ada'}));
 await waitFor(() => expect(getAssignmentDecision).toHaveBeenCalledWith(expect.objectContaining({clientId: 'new', input: expect.objectContaining({roster: expect.any(Object)})}), expect.any(AbortSignal)));
 expect(screen.queryByText('Save these changes to review the assignment records.')).not.toBeInTheDocument();
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

it.each(['inactive', 'blocked'] as const)('clears rejected staff and search while keeping the %s reason visible', async state => {
  const {useState} = await import('react');
  const {searchEmployees} = await import('@/lib/api/employees');
  vi.mocked(searchEmployees).mockResolvedValue([{id: 'staff-a', fullName: 'Ada'}] as Awaited<ReturnType<typeof searchEmployees>>);
  vi.mocked(getAssignmentDecision).mockResolvedValue({state: state === 'inactive' ? 'inactive' : 'ready', ...(state === 'blocked' ? {decision: 'BLOCKED' as const, fingerprint: 'a'.repeat(64)} : {}), contextKey: 'pair', policyRevision: 1, evaluatedAt: '2026-09-20T12:00:00Z', findings: state === 'blocked' ? [{ruleId: 'staff_training', ruleVersion: 1, severity: 'mandatory', code: 'missing', message: 'Staff training missing'}] : [], hasRestrictedFindings: false, canAcknowledge: false});
  function Harness() {
    const [assigned, setAssigned] = useState<Array<{id: string; name: string}>>([]);
    return <AssignmentReviewRosterProvider agencyId="agency" program="ddd" savedRows={[]}><ServiceAssignedDspsSection isEditing reviewRow={row} assignedDsps={assigned} onChange={setAssigned} /></AssignmentReviewRosterProvider>;
  }
  render(<Harness />);
  fireEvent.click(screen.getByRole('button', {name: 'Add Caregiver'}));
  fireEvent.change(screen.getByPlaceholderText('Search staff by name (2+ characters)'), {target: {value: 'Ada'}});
  fireEvent.click(await screen.findByRole('button', {name: 'Ada'}));
  await waitFor(() => expect(screen.queryByRole('button', {name: 'Remove Ada from this service'})).not.toBeInTheDocument());
  expect(screen.getByPlaceholderText('Search staff by name (2+ characters)')).toHaveValue('');
  expect(screen.getByText('Staff selection cleared. You can search for another staff member.')).toBeVisible();
  expect(screen.getByText(state === 'inactive' ? 'Blocked · no applicable assignment checks enabled' : 'Staff not selected · requirements not met')).toBeVisible();
  expect(screen.getByPlaceholderText('Search staff by name (2+ characters)')).toBeEnabled();
});
