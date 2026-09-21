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

describe('focused dashboard trainings', () => {
    it('shows a layout skeleton initially and keeps rows during refresh', () => {
        const {rerender} = render(<DashboardTrainings {...props} trainings={[]} loading/>);
        expect(screen.getByRole('status', {name: 'Loading trainings'})).toBeInTheDocument();
        expect(screen.queryByText('No trainings assigned yet.')).not.toBeInTheDocument();
        rerender(<DashboardTrainings {...props} trainings={[training('Course')]} loading/>);
        expect(screen.getByRole('button', {name: /Course, Upcoming/})).toBeVisible();
        expect(screen.getByRole('status', {name: 'Loading trainings'})).toBeInTheDocument();
    });

    it('puts urgent courses first and preserves drafts across grouped rows', () => {
        render(<DashboardTrainings {...props} trainings={[
            training('Later', {dueDateKey: '2026-12-28'}),
            training('Urgent', {deadlineState: 'overdue', dueDateKey: '2026-09-01'}),
            training('Pending', {reviewState: 'awaiting_review'}),
            training('Accepted', {deadlineState: 'satisfied'}),
        ]}/>);
        const rows = screen.getAllByRole('button').filter(button => button.hasAttribute('aria-expanded'));
        expect(rows[0]).toHaveTextContent('Urgent');
        const draft = screen.getByRole('textbox', {name: 'Certificate for Urgent'});
        fireEvent.change(draft, {target: {value: 'draft.pdf'}});
        fireEvent.click(rows[0]);
        expect(draft).not.toBeVisible();
        fireEvent.click(rows[0]);
        expect(draft).toHaveValue('draft.pdf');
        expect(screen.getByRole('heading', {name: 'In review1'})).toBeVisible();
        fireEvent.click(screen.getByRole('heading', {name: 'In review1'}).closest('summary')!);
        fireEvent.click(screen.getByRole('button', {name: /Pending, Upcoming/}));
        expect(screen.getByRole('button', {name: /Pending, Upcoming/})).toBeVisible();
        expect(draft).not.toBeVisible();
        fireEvent.click(rows[0]);
        expect(draft).toBeVisible();
        expect(draft).toHaveValue('draft.pdf');
        expect(screen.getByRole('heading', {name: 'Approved1'})).toBeVisible();
        fireEvent.click(screen.getByRole('heading', {name: 'Approved1'}).closest('summary')!);
        expect(screen.getByRole('button', {name: /Accepted, Accepted/})).toBeVisible();
    });

    it('collapses status groups without losing an upload draft', () => {
        render(<DashboardTrainings {...props} trainings={[training('Urgent', {deadlineState: 'overdue'}), training('Later')]}/>);
        const draft = screen.getByRole('textbox', {name: 'Certificate for Urgent'});
        fireEvent.change(draft, {target: {value: 'certificate.pdf'}});
        const summary = screen.getByRole('heading', {name: 'Overdue1'}).closest('summary')!;
        const group = summary.closest('details')!;
        expect(group.open).toBe(true);
        fireEvent.click(summary);
        expect(group.open).toBe(false);
        expect(draft).not.toBeVisible();
        expect(summary).toBeVisible();
        fireEvent.click(summary);
        expect(group.open).toBe(true);
        expect(draft).toHaveValue('certificate.pdf');
        expect(draft).toBeVisible();
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
