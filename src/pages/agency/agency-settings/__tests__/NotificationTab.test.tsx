import {act, fireEvent, render, screen} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import type {DocumentComplianceSettings} from '@/pages/agency/compliance-alerts/apiTypes';
const mocks = vi.hoisted(() => ({query: vi.fn(), update: vi.fn(), refetch: vi.fn(), userType: 'agency', data: {state: 'disabled', timezone: 'America/New_York', canEnable: true} as DocumentComplianceSettings, error: false}));
vi.mock('@/utils/auth', () => ({useAuth: () => ({user: {uid: 'owner', agencyId: 'agency', userType: mocks.userType}})}));
vi.mock('@/pages/shared/settings/NotificationPreferencesTab', () => ({default: () => <div>Notification preferences</div>}));
vi.mock('@/pages/agency/compliance-alerts/api', () => ({useGetDocumentComplianceSettingsQuery: mocks.query, useUpdateDocumentComplianceSettingsMutation: () => [mocks.update, {isLoading: false}]}));
import AgencyNotificationTab from '../components/NotificationTab';
beforeEach(() => {
  vi.useFakeTimers(); vi.clearAllMocks(); mocks.userType = 'agency'; mocks.error = false;
  mocks.data = {state: 'disabled', timezone: 'America/New_York', canEnable: true};
  mocks.query.mockImplementation(() => ({data: mocks.data, isLoading: false, isFetching: false, isError: mocks.error, refetch: mocks.refetch}));
  mocks.update.mockImplementation(({enabled}: {enabled: boolean}) => ({unwrap: async () => {
    mocks.data = {...mocks.data, state: enabled ? 'baselining' : 'paused'};
    return mocks.data;
  }}));
});
afterEach(() => vi.useRealTimers());
describe('agency document monitoring settings', () => {
  it('retains shared preferences without exposing owner controls or requests to staff', () => {
    mocks.userType = 'agency_staff'; render(<AgencyNotificationTab />);
    expect(screen.getByText('Notification preferences')).toBeInTheDocument();
    expect(screen.queryByText('Document expiry monitoring')).not.toBeInTheDocument();
    expect(mocks.query).not.toHaveBeenCalled();
  });
  it('enables existing agencies and shows bounded setup progress without a backlog', async () => {
    render(<AgencyNotificationTab />);
    fireEvent.click(screen.getByRole('button', {name: 'Enable document expiry monitoring'}));
    await act(async () => {});
    expect(mocks.update).toHaveBeenCalledWith({enabled: true});
    expect(screen.getByText('Setting up document monitoring')).toBeInTheDocument();
    expect(screen.getByText(/without sending a backlog of alerts/)).toBeInTheDocument();
    expect(mocks.query).toHaveBeenLastCalledWith({viewerId: 'owner', agencyId: 'agency'}, expect.objectContaining({pollingInterval: 5000, skipPollingIfUnfocused: true}));
    await act(() => vi.advanceTimersByTimeAsync(60_000));
    expect(mocks.query).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({pollingInterval: 0}));
    fireEvent.click(screen.getByRole('button', {name: 'Refresh'}));
    expect(mocks.refetch).toHaveBeenCalledTimes(1);
  });
  it('preserves the deadline across tab changes and stops after setup completes', async () => {
    mocks.data = {...mocks.data, state: 'baselining'};
    const {rerender, unmount} = render(<AgencyNotificationTab active />);
    await act(() => vi.advanceTimersByTimeAsync(30_000));
    rerender(<AgencyNotificationTab active={false} />);
    expect(mocks.query).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({skip: true, pollingInterval: 0}));
    await act(() => vi.advanceTimersByTimeAsync(30_000));
    rerender(<AgencyNotificationTab active />);
    expect(screen.getByRole('button', {name: 'Refresh'})).toBeInTheDocument();
    mocks.data = {...mocks.data, state: 'active'}; rerender(<AgencyNotificationTab active />);
    expect(screen.getByText('Document expiry monitoring is enabled')).toBeInTheDocument();
    expect(mocks.query).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({pollingInterval: 0}));
    unmount();
  });
  it('offers Pause and Resume using the authorized setting mutation', async () => {
    mocks.data = {...mocks.data, state: 'active'};
    const {rerender} = render(<AgencyNotificationTab />);
    fireEvent.click(screen.getByRole('button', {name: 'Pause'})); await act(async () => {});
    rerender(<AgencyNotificationTab />);
    expect(mocks.update).toHaveBeenLastCalledWith({enabled: false});
    fireEvent.click(screen.getByRole('button', {name: 'Resume'})); await act(async () => {});
    expect(mocks.update).toHaveBeenLastCalledWith({enabled: true});
  });
  it('blocks enabling without an agency timezone and honestly retries load errors', () => {
    mocks.data = {...mocks.data, timezone: null, canEnable: false};
    const {rerender} = render(<AgencyNotificationTab />);
    expect(screen.getByRole('button', {name: 'Enable document expiry monitoring'})).toBeDisabled();
    expect(screen.getByText(/Set a valid agency timezone in Agency Information/)).toBeInTheDocument();
    mocks.error = true; rerender(<AgencyNotificationTab />);
    fireEvent.click(screen.getByRole('button', {name: 'Retry'}));
    expect(mocks.refetch).toHaveBeenCalledTimes(1);
  });
});
