import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {expect, it, vi} from 'vitest';
import type {ReactNode} from 'react';
import {ClientFormWizard} from './ClientFormWizard';
import {createEmptyOutcome, createInitialAddClientFormData} from './types/formData';
const save = vi.hoisted(() => vi.fn());
vi.mock('./hooks/useClientSave', async importOriginal => ({...await importOriginal<typeof import('./hooks/useClientSave')>(), useClientSave: () => ({saveClient: save, isSaving: false, setErrorMessage: vi.fn()})}));
vi.mock('@/utils/auth', () => ({useAuth: () => ({user: {uid: 'owner', userType: 'agency', agencyId: 'a'}})}));
vi.mock('@/hooks/useEffectiveAgencyMode', () => ({useEffectiveAgencyMode: () => 'ddd'}));
vi.mock('@/components/AssignmentReviewRoster', async importOriginal => ({...await importOriginal<typeof import('@/components/AssignmentReviewRoster')>(), rosterSubmissionBlocked: () => false, AssignmentReviewRosterProvider: ({children}: {children: ReactNode}) => children}));
vi.mock('./stages/Stage1ClientIdentityAndContact', () => ({Stage1ClientIdentityAndContact: ({footer}: {footer: ReactNode}) => footer}));
vi.mock('./stages/Stage2GuardianAndFunding', () => ({Stage2GuardianAndFunding: ({footer, formData}: {footer: ReactNode; formData: ReturnType<typeof createInitialAddClientFormData>}) => <><p>{formData.stage2.outcomes[0]?.services[0]?.assignedDsps?.map(d => d.name).join(', ')}</p>{footer}</>}));
vi.mock('./stages/Stage3HealthcareAndDocuments', () => ({Stage3HealthcareAndDocuments: () => null}));
vi.mock('./stages/Stage4EvvAndVisitConfig', () => ({Stage4EvvAndVisitConfig: () => null}));
vi.mock('./stages/Stage5StaffAssignmentAndRestrictions', () => ({Stage5StaffAssignmentAndRestrictions: () => null}));
vi.mock('./stages/Stage6GoalsAndEmergency', () => ({Stage6GoalsAndEmergency: () => null}));
vi.mock('./stages/Stage7SystemAiAndAudit', () => ({Stage7SystemAiAndAudit: () => null}));
it('explicitly saves assignment-free, retains selected staff, then uses the saved client ID on the next human save', async () => {
  save.mockResolvedValueOnce({success: false, assignmentError: {code: 'ASSIGNMENT_ACKNOWLEDGMENT_REQUIRED', saveClientFirst: true}})
    .mockResolvedValueOnce({success: true, clientId: 'saved-client'})
    .mockResolvedValueOnce({success: true, clientId: 'saved-client', assignmentDecisions: {}});
  const initial = createInitialAddClientFormData(); initial.agencyId = 'a';
  const outcome = createEmptyOutcome(); outcome.services[0].assignedDsps = [{id: 'staff', name: 'Selected staff'}]; initial.stage2.outcomes = [outcome];
  render(<ClientFormWizard initialFormData={initial} config={{showAgencySelection: false, supportedClientTypes: ['ddd'], onSuccessNavigate: () => '/clients'}} />);
  fireEvent.click(await screen.findByRole('checkbox'));
  fireEvent.click(screen.getByRole('button', {name: 'Save Progress'}));
  fireEvent.click(await screen.findByRole('button', {name: 'Save client without assignments'}));
  await screen.findByText('Selected staff');
  expect(save).toHaveBeenCalledTimes(2);
  expect(save.mock.calls[1][0].stage2.outcomes[0].services[0].assignedDsps).toEqual([]);
  expect(initial.stage2.outcomes[0].services[0].assignedDsps).toHaveLength(1);
  expect(screen.getByText(/Selected staff are not yet assigned/)).toBeInTheDocument();
  if (!(screen.getByRole('checkbox') as HTMLInputElement).checked) fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByRole('button', {name: 'Save Progress'}));
  await waitFor(() => expect(save).toHaveBeenCalledTimes(3));
  expect(save.mock.calls[2][2]).toBe('saved-client');
  expect(save.mock.calls[2][0].stage2.outcomes[0].services[0].assignedDsps).toHaveLength(1);
});
