import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Checklist, ChecklistRow, Client } from '@/lib/api/clients';
import { ClientDocumentChecklist, showClientChecklist } from './ClientDocumentChecklist';

const checklist = (rows: ChecklistRow[]): Extract<Checklist, { state: 'ready' }> => ({ state: 'ready', evaluatedAt: '2026-09-16T12:00:00Z', timezone: 'UTC', localDate: '2026-09-16', groups: [{ program: 'ddd', rows }] });
const missing = (key: ChecklistRow['key']): ChecklistRow => ({ key, status: 'not_uploaded', reasonCode: null, entries: [] });
const props = { refreshing: false, refreshError: null, onRefresh: vi.fn(), onUpload: vi.fn(), onViewFiles: vi.fn() };
describe('client document checklist', () => {
  it('shows all seven program slots with date-specific copy and omits unsupported viewers', () => {
    const data = checklist(['isp', 'pcpt', 'sdr'].map(key => missing(key as ChecklistRow['key'])));
    data.groups.push({ program: 'hha', rows: (['form485', 'poc', 'physicianOrders', 'clinicalAssessment'] as const).map(key => missing(key)) });
    data.groups[0].rows[0] = { ...missing('isp'), status: 'needs_review', reasonCode: 'ambiguous_expiry_date' };
    render(<ClientDocumentChecklist {...props} canUpload={false} client={{ documentChecklist: data }} />);
    expect(screen.getAllByText('No file recorded')).toHaveLength(6); expect(screen.getByText('Check dates')).toBeInTheDocument();
    expect(screen.getByText('Confirm the recorded expiry date.')).toBeInTheDocument();
    expect(showClientChecklist({ servicePrograms: ['sc'] } as Client, 'agency', 'sc')).toBe(false);
    expect(showClientChecklist({ type: 'ddd' } as Client, 'employee')).toBe(false);
  });
  it('shows fixed missing slots and opens their canonical upload types without approval claims', () => {
    render(<ClientDocumentChecklist {...props} canUpload client={{ documents: [], documentChecklist: checklist(['isp', 'pcpt', 'sdr'].map(key => missing(key as ChecklistRow['key']))) }} />);
    expect(screen.getAllByText('No file recorded')).toHaveLength(3);
    fireEvent.click(screen.getAllByRole('button', { name: 'Upload' })[0]); expect(props.onUpload).toHaveBeenCalledWith('isp');
    expect(screen.queryByText('Compliant')).not.toBeInTheDocument();
    expect(screen.getByText(/does not confirm approval/)).toBeInTheDocument();
  });
  it('keeps duplicate warnings and server expiry visible and navigates rather than making another file list', () => {
    const rows: ChecklistRow[] = [{ key: 'isp', status: 'multiple_files', reasonCode: null, entries: [
      { documentIndex: 1, issuedDate: null, expiryDate: '2026-09-15', status: 'expired', reasonCode: null, warningCode: 'invalid_issued_date' },
      { documentIndex: 3, issuedDate: null, expiryDate: null, status: 'needs_review', reasonCode: 'ambiguous_expiry_date' },
    ] }];
    render(<ClientDocumentChecklist {...props} canUpload={false} client={{ documentChecklist: checklist(rows) }} />);
    expect(screen.getByText('2 files recorded. Check which copy applies.')).toBeInTheDocument();
    expect(screen.getByText(/1 expired/)).toBeInTheDocument(); expect(screen.getByText(/2 needing date review/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'View files' })); expect(props.onViewFiles).toHaveBeenCalledWith('isp');
    expect(screen.queryByRole('button', { name: 'Upload' })).not.toBeInTheDocument();
  });
  it('uses neutral on-file styling and separates known malformed data from retryable failures', () => {
    const { rerender } = render(<ClientDocumentChecklist {...props} canUpload={false} client={{ documentChecklist: checklist([{ ...missing('isp'), status: 'on_file_no_expiry' }]) }} />);
    expect(screen.getByText('On file · expiry not recorded')).not.toHaveClass('text-[#0eaf52]');
    rerender(<ClientDocumentChecklist {...props} canUpload={false} client={{ documentChecklist: { ...checklist([]), state: 'unavailable', reasonCode: 'invalid_documents', groups: [] } }} />);
    expect(screen.getByText(/Saved document details need checking/)).toBeInTheDocument(); expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
    rerender(<ClientDocumentChecklist {...props} canUpload={false} client={{}} />); expect(screen.getByText('Document checklist is not available yet.')).toBeInTheDocument();
    rerender(<ClientDocumentChecklist {...props} canUpload={false} refreshError="offline" client={{ documentChecklist: checklist([]) }} />);
    expect(screen.getByText(/Could not refresh. Showing results checked/)).toBeInTheDocument(); expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});
