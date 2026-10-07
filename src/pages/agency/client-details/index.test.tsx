import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const api = vi.hoisted(() => ({ mode: 'ddd', search: 'tab=documents', setSearch: vi.fn(), load: vi.fn(), user: { uid: 'owner', userType: 'agency', agencyId: 'agency-1', profile: { agencyScope: 'selected', agencyIds: ['agency-1'], status: 'active', agencyModes: ['ddd'], isActive: true } } }));
vi.mock('react-router', () => ({ useParams: () => ({ clientId: 'client-1' }), useNavigate: () => vi.fn(), useSearchParams: () => [new URLSearchParams(api.search), api.setSearch] }));
vi.mock('@/utils/auth', () => ({ useAuth: () => ({ user: api.user }) }));
vi.mock('@/features/agency-care/AgencyCareHome', () => ({ AgencyCareClientEntry: ({ clientId, program }: { clientId: string; program: string }) => <div>Care workspace for {clientId} {program}</div> }));
vi.mock('@/features/agency-care/AgencyCareSourcePublications', () => ({ AgencyCareSourcePublications: ({ clientId, program }: { clientId: string; program: string }) => <div>Published care documents for {clientId} {program}</div> }));
vi.mock('@/hooks/useEffectiveAgencyMode', () => ({ useEffectiveAgencyMode: () => api.mode }));
vi.mock('@/lib/api/clients', () => ({ getAgencyClientById: api.load, getClientById: api.load, updateClient: vi.fn() }));
vi.mock('@/pages/shared/client-details/tabs/ActivityTab', () => ({ ActivityTab: () => null }));
vi.mock('@/pages/shared/client-details/tabs/ProfileTab', () => ({ ProfileTab: () => null }));
vi.mock('@/pages/agency/client-details/tabs/ServicesTab', () => ({ ServicesTab: () => <p>Saved assignment context</p> }));
vi.mock('@/pages/agency/client-details/tabs/FamilyPortalTab', () => ({ FamilyPortalTab: () => null }));
vi.mock('@/pages/super-admin/clients-directory/client-details/SuperAdminClientActivityShifts', () => ({ default: () => null }));
vi.mock('@/pages/super-admin/clients-directory/client-details/tabs/ServicesTab', () => ({ ServicesTab: () => <p>Saved assignment context</p> }));
vi.mock('@/pages/super-admin/clients-directory/client-details/components/UploadClientDocumentModal', () => ({ UploadClientDocumentModal: () => null }));
vi.mock('@/pages/agency/client-details/components/UploadClientDocumentModal', () => ({ UploadClientDocumentModal: ({ isOpen, initialDocumentKey, onComplete }: { isOpen: boolean; initialDocumentKey?: string; onComplete: () => void }) => isOpen ? <button onClick={onComplete}>Save {initialDocumentKey}</button> : null }));
import ClientDetailsPage from './index';
import SuperAdminClientDetailsPage from '@/pages/super-admin/clients-directory/client-details';
beforeEach(() => { vi.stubEnv('VITE_AGENCY_CARE_ENABLED', 'false'); api.mode = 'ddd'; api.search = 'tab=documents'; api.setSearch.mockReset(); api.load.mockReset(); api.user.userType = 'agency'; api.user.profile.agencyIds = ['agency-1']; api.user.profile.agencyModes = ['ddd']; vi.stubGlobal('scrollTo', vi.fn()); });
afterEach(() => vi.unstubAllEnvs());
describe('client page document save', () => {
  it('uses the detail response once and forces a refresh only after metadata save completes', async () => {
    vi.stubGlobal('scrollTo', vi.fn());
    const value = { id: 'client-1', type: 'ddd', documents: [], documentChecklist: { state: 'ready', evaluatedAt: '2026-09-16T12:00:00Z', timezone: 'UTC', localDate: '2026-09-16', groups: [{ program: 'ddd', rows: [{ key: 'isp', status: 'not_uploaded', reasonCode: null, entries: [] }] }] } };
    api.load.mockResolvedValue(value);
    render(<ClientDetailsPage />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Documents' })).toBeInTheDocument());
    expect(await screen.findByText('Published care documents for client-1 ddd')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Documents' }));
    expect(api.load).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Upload' })); expect(api.load).toHaveBeenCalledTimes(1);
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Save isp' })));
    expect(api.load).toHaveBeenCalledTimes(2); expect(api.load.mock.calls[0][1].mode).toBe('ddd');
  });
  it('clears the previous super-admin client immediately when allowed agencies change', async () => {
    api.user.userType = 'super_admin';
    api.load.mockResolvedValueOnce({ id: 'client-1', firstName: 'Previous Client', type: 'ddd', documents: [] }).mockReturnValue(new Promise(() => {}));
    const { rerender } = render(<SuperAdminClientDetailsPage />);
    await waitFor(() => expect(screen.getByText('Previous Client')).toBeInTheDocument());
    api.user.profile.agencyIds = ['agency-2']; rerender(<SuperAdminClientDetailsPage />);
    expect(screen.queryByText('Previous Client')).not.toBeInTheDocument();
    expect(screen.getByText('Loading document checklist…')).toBeInTheDocument();
    expect(api.load).toHaveBeenCalledTimes(2);
  });
  it('clears a staff snapshot when explicit program grants are revoked', async () => {
    api.user.userType = 'agency_staff';
    api.load.mockResolvedValueOnce({ id: 'client-1', firstName: 'Previous Client', type: 'ddd', documents: [] }).mockReturnValue(new Promise(() => {}));
    const { rerender } = render(<ClientDetailsPage />);
    await waitFor(() => expect(screen.getByText('Previous Client')).toBeInTheDocument());
    api.user.profile.agencyModes = []; rerender(<ClientDetailsPage />);
    expect(screen.queryByText('Previous Client')).not.toBeInTheDocument();
    expect(api.load).toHaveBeenCalledTimes(2);
  });
});

it('restores an allowlisted services tab from navigation and reload', async () => {
  api.load.mockResolvedValue({id:'client-1',type:'ddd',documents:[]});
  const {rerender}=render(<ClientDetailsPage/>);
  await screen.findByRole('button',{name:'Documents'});
  api.search='tab=services';rerender(<ClientDetailsPage/>);
  expect(await screen.findByText('Saved assignment context')).toBeInTheDocument();
  api.search='tab=documents';rerender(<ClientDetailsPage/>);
  expect(screen.queryByText('Saved assignment context')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Services'}));
  expect(api.setSearch.mock.calls.at(-1)?.[0].get('tab')).toBe('services');
});

it.each(['ddd', 'hha'])('keeps %s care entry and source publications available with a stale false flag', async program => {
  api.mode = program;
  api.user.profile.agencyModes = [program];
  api.load.mockResolvedValue({ id: 'client-1', type: program, documents: [] });
  render(<ClientDetailsPage />);
  expect(await screen.findByText(`Published care documents for client-1 ${program}`)).toBeVisible();
  expect(await screen.findByText(`Care workspace for client-1 ${program}`)).toBeVisible();
});
