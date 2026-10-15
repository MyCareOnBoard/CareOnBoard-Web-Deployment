import {fireEvent, render, screen} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import DashboardDocuments, {type DashboardDocument} from './DashboardDocuments';

const item = (type: string, patch: Partial<DashboardDocument> = {}): DashboardDocument =>
    ({type, label: type, fileUrl: 'https://example.com/document.pdf', status: 'Current', id: type, ...patch});
const props = {loading: false, error: false, onRetry: vi.fn(), onUpload: vi.fn(), onView: vi.fn()};
// Radix's TabsTrigger activates on mousedown (and keyboard/focus), not click — see
// @radix-ui/react-tabs's TabsTrigger implementation.
const activateTab = (tab: HTMLElement) => fireEvent.mouseDown(tab, {button: 0});

describe('grouped dashboard documents', () => {
    it('prioritizes issues and shows the first group tab by default', () => {
        render(<DashboardDocuments {...props} documents={[item('Photo ID'), item('Resume', {fileUrl: '', status: 'Not uploaded'}), item('License', {status: 'expired', expiryLabel: 'Sep 1, 2026'})]}/>);
        const tabs = screen.getAllByRole('tab');
        expect(tabs.map(tab => tab.textContent)).toEqual(['Needs attention 1', 'Not uploaded 1', 'Current 1']);
        expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
        expect(tabs[1]).toHaveAttribute('aria-selected', 'false');
        fireEvent.click(screen.getByRole('button', {name: 'Replace License'}));
        expect(props.onUpload).toHaveBeenCalledWith('License');
        fireEvent.click(screen.getByRole('button', {name: 'View License'}));
        expect(props.onView).toHaveBeenCalledWith('https://example.com/document.pdf');
        activateTab(tabs[1]);
        fireEvent.click(screen.getByRole('button', {name: 'Upload Resume'}));
        expect(props.onUpload).toHaveBeenCalledWith('Resume');
    });

    it('offers both View and Replace for a document needing review', () => {
        const onUpload = vi.fn();
        render(<DashboardDocuments {...props} onUpload={onUpload} documents={[item('Diploma', {status: 'Needs review', reasonCode: 'missing_expiry_date', expiryLabel: 'Sep 1, 2026'})]}/>);
        expect(screen.getByRole('button', {name: 'View Diploma'})).toBeVisible();
        expect(screen.getByText('No expiry date is recorded. Ask your agency to confirm whether one is required.')).toBeVisible();
        fireEvent.click(screen.getByRole('button', {name: 'Replace Diploma'}));
        expect(onUpload).toHaveBeenCalledWith('Diploma');
    });
    it('shows all documents without pagination and focuses a linked document', () => {
        const documents = Array.from({length: 7}, (_, index) => item('Document ' + index));
        render(<DashboardDocuments {...props} documents={documents} focusDocumentId="Document 6"/>);
        expect(screen.getAllByRole('button', {name: /^View Document/})).toHaveLength(7);
        expect(screen.queryByRole('navigation', {name: 'Document pages'})).not.toBeInTheDocument();
        expect(screen.getByRole('button', {name: 'View Document 6'})).toBeVisible();
        expect(document.activeElement).toHaveAttribute('id', 'staff-document-Document 6');
    });

    it('distinguishes loading, failure, and unassessed uploaded records', () => {
        const {rerender} = render(<DashboardDocuments {...props} documents={[]} loading/>);
        expect(screen.getByRole('status', {name: 'Loading documents'})).toBeVisible();
        rerender(<DashboardDocuments {...props} documents={[]} error/>);
        fireEvent.click(screen.getByRole('button', {name: 'Retry documents'}));
        expect(props.onRetry).toHaveBeenCalledOnce();
        rerender(<DashboardDocuments {...props} documents={[item('Diploma', {status: 'Updating expiry status…'})]}/>);
        expect(screen.getByRole('tab', {name: 'Checking status 1'})).toBeVisible();
        expect(screen.queryByRole('tab', {name: 'Current 1'})).not.toBeInTheDocument();
    });
});
