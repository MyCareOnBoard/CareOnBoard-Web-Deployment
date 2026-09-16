import {act, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import type {ReactNode} from 'react';
import {ClientFormWizard} from './ClientFormWizard';
import {createInitialAddClientFormData} from './types/formData';
import {getClientNeeds, saveClientNeeds, type NeedsDTO} from '@/lib/api/client-needs';

const ordinarySave = vi.hoisted(() => vi.fn().mockResolvedValue({success: true, clientId: 'client-a'}));
vi.mock('./hooks/useClientSave', () => ({useClientSave: () => ({saveClient: ordinarySave, isSaving: false, setErrorMessage: vi.fn()})}));
vi.mock('@/utils/auth', () => ({useAuth: () => ({user: {uid: 'owner', userType: 'agency', agencyId: 'agency-a'}})}));
vi.mock('@/hooks/useEffectiveAgencyMode', () => ({useEffectiveAgencyMode: () => 'ddd'}));
vi.mock('@/lib/api/client-needs', () => ({getClientNeeds: vi.fn(), saveClientNeeds: vi.fn(), reviewClientAenf: vi.fn()}));
vi.mock('@/components/AssignmentReviewRoster', () => ({AssignmentReviewRosterProvider: ({children}: {children: ReactNode}) => children, rosterAssignmentsChanged: () => false}));
// Keep the real wizard, form-state hook, footer and needs panel; omit unrelated stage fields.
vi.mock('./stages/Stage1ClientIdentityAndContact', () => ({Stage1ClientIdentityAndContact: ({footer}: {footer: ReactNode}) => footer}));
vi.mock('./stages/Stage2GuardianAndFunding', () => ({Stage2GuardianAndFunding: ({footer}: {footer: ReactNode}) => footer}));
vi.mock('./stages/Stage3HealthcareAndDocuments', () => ({Stage3HealthcareAndDocuments: ({footer, needsPanel}: {footer: ReactNode; needsPanel: ReactNode}) => <form onSubmit={event => event.preventDefault()}>{needsPanel}{footer}</form>}));
vi.mock('./stages/Stage4EvvAndVisitConfig', () => ({Stage4EvvAndVisitConfig: ({footer}: {footer: ReactNode}) => footer}));
vi.mock('./stages/Stage5StaffAssignmentAndRestrictions', () => ({Stage5StaffAssignmentAndRestrictions: () => null}));
vi.mock('./stages/Stage6GoalsAndEmergency', () => ({Stage6GoalsAndEmergency: () => null}));
vi.mock('./stages/Stage7SystemAiAndAudit', () => ({Stage7SystemAiAndAudit: () => null}));

describe('wizard needs integration', () => {
  it('keeps ordinary Save/Next usable during needs save and preserves the parent draft across steps', async () => {
    const dto: NeedsDTO = {state: 'ready', canEdit: true, revision: 0, updatedAt: null, updatedBy: null,
      answers: {medicationSupport: 'unknown', medicationSupportDescription: null, medicalAcuity: 'unknown', behavioralAcuity: 'unknown', aenfApplicability: 'unknown', aenfBasis: null},
      aenf: {state: 'applicability_not_recorded', count: 0, reviewRevision: 0}};
    vi.mocked(getClientNeeds).mockResolvedValue(dto);
    let finish!: (value: NeedsDTO) => void;
    vi.mocked(saveClientNeeds).mockImplementation(() => new Promise(resolve => {finish = resolve;}));
    const initial = createInitialAddClientFormData(); initial.agencyId = 'agency-a';
    const view = render(<ClientFormWizard clientId="client-a" isEditMode initialFormData={initial} config={{showAgencySelection: false, onSuccessNavigate: () => '/clients'}} />);
    const declare = () => fireEvent.click(screen.getByRole('checkbox'));
    declare(); fireEvent.click(screen.getByRole('button', {name: 'Next'}));
    declare(); fireEvent.click(screen.getByRole('button', {name: 'Next'}));
    await screen.findByRole('button', {name: 'Save needs'});
    fireEvent.change(view.container.querySelector('select')!, {target: {value: 'yes'}});
    fireEvent.change(screen.getByLabelText('Medication support description'), {target: {value: 'Wizard private draft'}});
    declare(); fireEvent.click(screen.getByRole('button', {name: 'Save needs'}));
    expect(screen.getByRole('button', {name: 'Next'})).not.toBeDisabled();
    fireEvent.click(screen.getByRole('button', {name: 'Save Progress'}));
    await waitFor(() => expect(ordinarySave).toHaveBeenCalledOnce());
    expect(ordinarySave.mock.calls[0][0]).not.toHaveProperty('needsDraft');
    fireEvent.click(screen.getByRole('button', {name: 'Next'}));
    fireEvent.click(screen.getByRole('button', {name: 'Previous'}));
    await screen.findByRole('button', {name: 'Save needs'});
    expect(screen.getByLabelText('Medication support description')).toHaveValue('Wizard private draft');
    await act(async () => finish({...dto, revision: 1}));
    expect(screen.getByLabelText('Medication support description')).toHaveValue('Wizard private draft');
    expect(screen.queryByText('Needs saved.')).toBeNull();
  });
});
