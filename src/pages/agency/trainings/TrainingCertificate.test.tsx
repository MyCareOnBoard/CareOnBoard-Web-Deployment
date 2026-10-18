import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import TrainingCertificate from './TrainingCertificate';

const requests = vi.hoisted(() => ({get: vi.fn(), post: vi.fn()}));
vi.mock('@/lib/axios', () => ({default: requests}));
vi.mock('@/components/documents/DocumentPreviewModal', () => ({DocumentPreviewModal: (props: any) => props.open
    ? <div><span>{props.url}</span><span>{props.fileName}</span><button onClick={() => props.onOpenChange(false)}>Close preview</button></div> : null}));
const training = {id: 'one', name: 'CPR', timeFrame: '30 days', assignedDsp: 'employee-1', trainingType: 'manual', completedAt: null,
    status: 'Not Completed', approved: false, requiresCertificate: true};

beforeEach(() => {
    vi.clearAllMocks();
    URL.createObjectURL = vi.fn(() => 'blob:certificate');
    URL.revokeObjectURL = vi.fn();
});

describe('private training certificate', () => {
    it('keeps dashboard submission disabled until a valid certificate is selected', async () => {
        requests.post.mockResolvedValue({data: {certificateId: 'new', approved: false, status: 'Awaiting Review'}});
        const uploaded = vi.fn();
        render(<TrainingCertificate training={training} dashboard onUploaded={uploaded}/>);
        const submit = screen.getByRole('button', {name: 'Submit for review'});
        expect(submit).toBeDisabled();
        fireEvent.change(screen.getByLabelText('Upload completion certificate'), {target: {files: [new File(['pdf'], 'completion.pdf', {type: 'application/pdf'})]}});
        expect(screen.getByText('completion.pdf')).toBeVisible();
        expect(submit).toBeEnabled();
        fireEvent.click(submit);
        await waitFor(() => expect(uploaded).toHaveBeenCalledWith(expect.objectContaining({approved: false})));
        expect(submit).toBeDisabled();
    });

    it('also requires completion date for a policy certificate in the dashboard', () => {
        render(<TrainingCertificate training={{...training, source: 'policy', policyContextState: 'current'}} dashboard onUploaded={vi.fn()}/>);
        fireEvent.change(screen.getByLabelText('Upload completion certificate'), {target: {files: [new File(['pdf'], 'completion.pdf', {type: 'application/pdf'})]}});
        expect(screen.getByRole('button', {name: 'Submit for review'})).toBeDisabled();
        expect(requests.post).not.toHaveBeenCalled();
    });

    it('keeps expiry and review warnings when the timeline supplies the status heading', () => {
        render(<TrainingCertificate training={{...training, source:'policy', policyContextState:'current', deadlineState:'expired', effectiveExpiryDateKey:'2026-09-01', reviewState:'changes_requested', reviewReason:'Upload a legible certificate.'}} showPolicySummary={false}/>);
        expect(screen.queryByText('Automatically assigned')).not.toBeInTheDocument();
        expect(screen.getByText('Calculated renewal date: 2026-09-01')).toBeInTheDocument();
        expect(screen.getByText('Changes requested: Upload a legible certificate.')).toBeInTheDocument();
    });
    it('retries the same file with the same request ID and reports the saved certificate', async () => {
        const result = {certificateId: 'certificate-1', certificateName: 'completion.pdf', status: 'Completed', approved: true, completedAt: '2026-09-16'};
        requests.post.mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce({data: result});
        const uploaded = vi.fn();
        render(<TrainingCertificate training={training} onUploaded={uploaded}/>);
        const file = new File(['certificate'], 'completion.pdf', {type: 'application/pdf'});
        fireEvent.change(screen.getByLabelText('Upload completion certificate'), {target: {files: [file]}});
        fireEvent.click(screen.getByRole('button', {name: 'Submit certificate'}));
        await screen.findByRole('alert');
        fireEvent.click(screen.getByRole('button', {name: 'Submit certificate'}));
        await waitFor(() => expect(uploaded).toHaveBeenCalledWith(result));
        expect(requests.post.mock.calls[0][0]).toBe('/employees/trainings/one/certificate');
        expect(requests.post.mock.calls[0][1].get('requestId')).toBe(requests.post.mock.calls[1][1].get('requestId'));
        expect(requests.post.mock.calls[0][1].get('file')).toBe(file);
    });

    it('rejects unsupported and oversized uploads before making a request', () => {
        render(<TrainingCertificate training={training} onUploaded={vi.fn()}/>);
        const input = screen.getByLabelText('Upload completion certificate');
        fireEvent.change(input, {target: {files: [new File(['unsafe'], 'certificate.svg', {type: 'image/svg+xml'})]}});
        expect(screen.getByRole('alert')).toHaveTextContent('up to 10 MB');
        const oversized = new File(['large'], 'certificate.pdf', {type: 'application/pdf'});
        Object.defineProperty(oversized, 'size', {value: 10 * 1024 * 1024 + 1});
        fireEvent.change(input, {target: {files: [oversized]}});
        expect(screen.queryByRole('button', {name: 'Submit certificate'})).not.toBeInTheDocument();
        expect(requests.post).not.toHaveBeenCalled();
    });

    it('fetches authenticated bytes and revokes the preview on close or replacement', async () => {
        requests.get.mockResolvedValue({data: new Blob(['certificate'])});
        const {rerender, unmount} = render(<TrainingCertificate training={{...training, certificateId: 'cert-1', certificateName: 'completion.pdf'}}/>);
        fireEvent.click(screen.getByRole('button', {name: 'View certificate'}));
        await screen.findByText('blob:certificate');
        expect(requests.get).toHaveBeenCalledWith('/employees/trainings/one/certificate', expect.objectContaining({params: {certificateId: 'cert-1'}, responseType: 'blob'}));
        fireEvent.click(screen.getByRole('button', {name: 'Close preview'}));
        expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
        fireEvent.click(screen.getByRole('button', {name: 'View certificate'}));
        await screen.findByText('blob:certificate');
        rerender(<TrainingCertificate training={{...training, certificateId: 'cert-2', certificateName: 'replacement.png'}}/>);
        await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2));
        unmount();
        expect(URL.revokeObjectURL).toHaveBeenCalledTimes(3);
    });

    it.each([
        ['a PDF', '%PDF-1.7 rest', 'application/pdf', 'scan.pdf'],
        ['a PNG', '\x89PNG\r\n\x1a\n', 'image/png', 'scan.png'],
    ])('previews %s served as a generic download by its file signature', async (_label, bytes, type, fileName) => {
        requests.get.mockResolvedValue({data: new Blob([Uint8Array.from(bytes, c => c.charCodeAt(0))], {type: 'application/octet-stream'})});
        render(<TrainingCertificate training={{...training, certificateId: 'cert-1', certificateName: 'scan'}}/>);
        fireEvent.click(screen.getByRole('button', {name: 'View certificate'}));
        await screen.findByText(fileName);
        expect((vi.mocked(URL.createObjectURL).mock.calls[0][0] as Blob).type).toBe(type);
    });

    it('never previews other content types such as HTML', async () => {
        requests.get.mockResolvedValue({data: new Blob(['<script>alert(1)</script>'], {type: 'text/html'})});
        render(<TrainingCertificate training={{...training, certificateId: 'cert-1', certificateName: 'scan.html'}}/>);
        fireEvent.click(screen.getByRole('button', {name: 'View certificate'}));
        await screen.findByText('scan.pdf');
        expect((vi.mocked(URL.createObjectURL).mock.calls[0][0] as Blob).type).toBe('application/pdf');
    });
});
