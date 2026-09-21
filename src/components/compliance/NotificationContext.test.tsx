import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { NotificationContext } from './NotificationContext';
const mocks = vi.hoisted(() => ({ query: vi.fn(), result: { currentData: undefined as any, isFetching: false, error: undefined, refetch: vi.fn() } }));
vi.mock('@/pages/agency/compliance-alerts/api', () => ({ useGetComplianceNotificationContextQuery: (...args: any[]) => { mocks.query(...args); return mocks.result; } }));
vi.mock('@/hooks/useAssignmentReview', () => ({ useAssignmentReviewScope: () => 'scope' }));
vi.mock('@/utils/auth', () => ({ useAuth: () => ({ user: { uid: 'viewer', agencyId: 'agency' } }) }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
it('does not load ordinary records and rejects cross-record notification context', () => {
    const view = render(<NotificationContext expectedClientId="client"/>);
    expect(mocks.query).not.toHaveBeenCalled();
    mocks.result.currentData = { kind: 'assignment_warning', state: 'recorded', clientId: 'other', program: 'hha', reasons: [], acknowledgmentReason: 'private reason' };
    view.rerender(<NotificationContext notificationId="notice" expectedClientId="client"/>);
    expect(screen.getByText('This notification does not match this record.')).toBeInTheDocument();
    expect(screen.queryByText('private reason')).not.toBeInTheDocument();
});
it('shows saved acknowledgment as historical, not current clearance', () => {
    mocks.result.currentData = { kind: 'assignment_warning', state: 'recorded', clientId: 'client', program: 'hha', reasons: [{ label: 'Staff training', code: 'missing' }], acknowledgmentReason: 'Agency reviewed the warning' };
    render(<NotificationContext notificationId="notice" expectedClientId="client"/>);
    expect(screen.getByText('Agency reviewed the warning')).toBeInTheDocument();
    expect(screen.getByText(/saved assignment record/)).toBeInTheDocument();
});
