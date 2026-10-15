import {fireEvent, render, screen, within} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import DashboardTrainings, {trainingGroup} from './DashboardTrainings';
import type {TrainingData} from '@/pages/agency/trainings/trainingApi';

const training = (id: string, patch: Partial<TrainingData> = {}): TrainingData => ({
    id, name: id, timeFrame: '', assignedDsp: 'staff', trainingType: 'automatic', completedAt: null,
    status: 'Assigned', approved: false, requiresCertificate: true, source: 'policy',
    policyContextState: 'current', deadlineState: 'upcoming', ...patch,
});
const props = {loading: false, error: false, hasMore: false, assessmentIncomplete: false,
    onLoadMore: vi.fn(), onRetry: vi.fn(),
    renderTraining: (item: TrainingData) => <input aria-label={`Certificate for ${item.name}`}/>,
};
// Radix's TabsTrigger activates on mousedown (and keyboard/focus), not click — see
// @radix-ui/react-tabs's TabsTrigger implementation.
const activateTab = (tab: HTMLElement) => fireEvent.mouseDown(tab, {button: 0});

describe('focused dashboard trainings', () => {
    it('shows a layout skeleton initially and keeps rows during refresh', () => {
        const {rerender} = render(<DashboardTrainings {...props} trainings={[]} loading/>);
        expect(screen.getByRole('status', {name: 'Loading trainings'})).toBeInTheDocument();
        expect(screen.queryByText('No trainings assigned yet.')).not.toBeInTheDocument();
        rerender(<DashboardTrainings {...props} trainings={[training('Course')]} loading/>);
        expect(screen.getByRole('button', {name: /Course, Upcoming/})).toBeVisible();
        expect(screen.getByRole('status', {name: 'Loading trainings'})).toBeInTheDocument();
    });

    it('puts urgent courses first and preserves drafts across grouped tabs', () => {
        render(<DashboardTrainings {...props} trainings={[
            training('Later', {dueDateKey: '2026-12-28'}),
            training('Urgent', {deadlineState: 'overdue', dueDateKey: '2026-09-01'}),
            training('Pending', {reviewState: 'awaiting_review'}),
            training('Accepted', {deadlineState: 'satisfied'}),
        ]}/>);
        // The most urgent group ("Overdue", containing "Urgent") is the active tab by default.
        const tabs = screen.getAllByRole('tab');
        expect(tabs[0]).toHaveTextContent('Overdue');
        expect(tabs[0]).toHaveAttribute('aria-selected', 'true');

        const urgentRow = screen.getByRole('button', {name: /Urgent,/});
        const draft = screen.getByRole('textbox', {name: 'Certificate for Urgent'});
        fireEvent.change(draft, {target: {value: 'draft.pdf'}});
        fireEvent.click(urgentRow);
        expect(draft).not.toBeVisible();
        fireEvent.click(urgentRow);
        expect(draft).toHaveValue('draft.pdf');

        // Switch to the "In review" tab and expand Pending there.
        const reviewTab = screen.getByRole('tab', {name: /In review/});
        activateTab(reviewTab);
        expect(reviewTab).toHaveAttribute('aria-selected', 'true');
        fireEvent.click(screen.getByRole('button', {name: /Pending, Upcoming/}));
        expect(screen.getByRole('button', {name: /Pending, Upcoming/})).toBeVisible();

        // Back on "Overdue", re-expanding Urgent restores the draft — it was hidden, not lost.
        const overdueTab = screen.getByRole('tab', {name: /Overdue/});
        activateTab(overdueTab);
        expect(overdueTab).toHaveAttribute('aria-selected', 'true');
        fireEvent.click(urgentRow);
        expect(draft).toBeVisible();
        expect(draft).toHaveValue('draft.pdf');

        const approvedTab = screen.getByRole('tab', {name: /Approved/});
        activateTab(approvedTab);
        expect(approvedTab).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByRole('button', {name: /Accepted, Accepted/})).toBeVisible();
    });

    it('preserves an upload draft when switching away from its group tab', () => {
        render(<DashboardTrainings {...props} trainings={[training('Urgent', {deadlineState: 'overdue'}), training('Later')]}/>);
        const draft = screen.getByRole('textbox', {name: 'Certificate for Urgent'});
        fireEvent.change(draft, {target: {value: 'certificate.pdf'}});
        const tabs = screen.getAllByRole('tab');
        expect(tabs[0]).toHaveTextContent('Overdue');
        expect(tabs[0]).toHaveAttribute('aria-selected', 'true');

        const upcomingTab = screen.getByRole('tab', {name: /Upcoming/});
        activateTab(upcomingTab);
        expect(upcomingTab).toHaveAttribute('aria-selected', 'true');
        expect(draft).not.toBeVisible();

        const overdueTab = screen.getByRole('tab', {name: /Overdue/});
        activateTab(overdueTab);
        expect(overdueTab).toHaveAttribute('aria-selected', 'true');
        expect(draft).toBeVisible();
        expect(draft).toHaveValue('certificate.pdf');
    });

    it('does not confuse expired accepted evidence or an unassessed policy with approval', () => {
        expect(trainingGroup(training('Expired', {approved: true, deadlineState: 'expired'}))).toBe('Expired');
        expect(trainingGroup(training('Stale', {approved: true, deadlineState: 'satisfied', policyContextState: 'updating'}))).toBe('Updating requirements');
        expect(trainingGroup(training('Rejected', {reviewState: 'changes_requested'}))).toBe('Not approved');
        expect(trainingGroup(training('Before', {deadlineState: 'before_work'}))).toBe('Required before work');
        expect(trainingGroup(training('Overdue review', {deadlineState: 'overdue', reviewState: 'awaiting_review'}))).toBe('Overdue');
        expect(trainingGroup(training('Review', {approved: false, reviewState: 'awaiting_review'}))).toBe('In review');
    });

    it('labels partial counts and provides retry without a misleading empty state', () => {
        const {rerender} = render(<DashboardTrainings {...props} trainings={[training('Course')]} hasMore/>);
        expect(screen.getByText('1 loaded')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', {name: 'Load more trainings'}));
        expect(props.onLoadMore).toHaveBeenCalledOnce();
        rerender(<DashboardTrainings {...props} trainings={[]} error/>);
        fireEvent.click(within(screen.getByRole('alert')).getByRole('button', {name: 'Try again'}));
        expect(props.onRetry).toHaveBeenCalledOnce();
        expect(screen.queryByText('No trainings assigned yet.')).not.toBeInTheDocument();
    });
});
