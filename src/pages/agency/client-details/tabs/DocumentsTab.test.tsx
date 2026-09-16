import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Client } from '@/lib/api/clients';
import { DocumentsTab } from './DocumentsTab';

const client = { type: 'ddd', documents: [null, { key: 'isp', title: 'Recorded ISP', url: 'https://example.test/isp.pdf', expiryDate: '2000-01-01' }],
  documentChecklist: { state: 'ready', evaluatedAt: '2026-09-16T12:00:00Z', timezone: 'Pacific/Honolulu', localDate: '2000-01-01', groups: [{ program: 'ddd', rows: [{ key: 'isp', status: 'expires_today', reasonCode: null, entries: [{ documentIndex: 1, issuedDate: null, expiryDate: '2000-01-01', status: 'expires_today', reasonCode: null }] }] }] },
} as unknown as Client;
describe('agency document checklist integration', () => {
  it('uses the same server status in checklist and source rows, focuses files, and preserves modal preview', () => {
    render(<DocumentsTab client={client} showChecklist />);
    expect(screen.getAllByText('Expires today')).toHaveLength(2); expect(screen.queryByText('Expired')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'View files' })); expect(screen.getByLabelText('Recorded ISP file 2')).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: 'View' })); expect(screen.getByRole('dialog', { name: 'Recorded ISP' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add Document' })).not.toBeInTheDocument();
  });
  it('survives malformed documents and does not show a positive browser expiry fallback', () => {
    const { rerender } = render(<DocumentsTab client={{ ...client, documents: {} } as Client} showChecklist />);
    expect(screen.getByText('No documents uploaded yet.')).toBeInTheDocument();
    rerender(<DocumentsTab client={{ ...client, documentChecklist: undefined }} showChecklist />);
    expect(screen.getByText('Needs review')).toBeInTheDocument();
    expect(screen.queryByText('Available')).not.toBeInTheDocument();
  });
  it('preserves legacy Form485 activation semantics while refusing unsafe previews', () => {
    const malformed = { type: 'hha', status: 'pending', documents: [{ key: 'form485', url: 'legacy-nonblank-reference', title: {} }] } as unknown as Client;
    render(<DocumentsTab client={malformed} onActivateClient={vi.fn()} />);
    expect(screen.getByText('A signed Form 485 is on file. This client can be activated.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'View' })).not.toBeInTheDocument();
    expect(screen.getByText('Needs review')).toBeInTheDocument();
  });
});
