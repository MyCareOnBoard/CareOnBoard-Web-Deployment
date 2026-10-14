import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, expect, it, vi } from 'vitest';
import DocumentReviewsPanel from './DocumentReviewsPanel';
import * as api from '@/lib/api/sc-document-reviews';

const authScope = vi.hoisted(() => ({ value: 'agency:user' }));
vi.mock('@/hooks/useAssignmentReview', () => ({ useAssignmentReviewScope: () => authScope.value }));
vi.mock('@/lib/api/sc-document-reviews', () => ({ getDocumentReviews: vi.fn(), markDocumentReviewed: vi.fn(), getDocumentReviewEvents: vi.fn() }));
const item: api.DocumentReviewItem = { reference: 'isp-file', title: 'ISP', fileName: 'plan.pdf', url: 'https://files.example/plan.pdf', category: 'ISP', intervalDays: 30,
  status: 'needs_first_review', lastReviewedAt: null, reviewedByName: null, nextReviewDueDate: null, revision: 0 };
const overview: api.DocumentReviewOverview = { enabled: true, remindersEnabled: true, timezone: 'UTC', items: [item] };
const reviewed: api.DocumentReviewItem = { ...item, status: 'upcoming', lastReviewedAt: '2026-10-14T12:00:00Z', reviewedByName: 'Taylor', nextReviewDueDate: '2026-11-13', revision: 1 };
const renderPanel = (props: React.ComponentProps<typeof DocumentReviewsPanel> = { clientId: 'c' }, query = '') => render(<MemoryRouter initialEntries={['/monitoring' + query]}><DocumentReviewsPanel {...props} /></MemoryRouter>);
const deferred = <T,>() => { let resolve!: (value: T) => void; let reject!: (error: unknown) => void; const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; }); return { promise, resolve, reject }; };
beforeEach(() => {
  vi.clearAllMocks(); authScope.value = 'agency:user';
  vi.mocked(api.getDocumentReviews).mockResolvedValue(overview);
  vi.mocked(api.markDocumentReviewed).mockResolvedValue(reviewed);
  vi.mocked(api.getDocumentReviewEvents).mockResolvedValue({ items: [], nextCursor: null });
});

it('shows loading, then a concise disabled schedule message', async () => {
  const pending = deferred<api.DocumentReviewOverview>();
  vi.mocked(api.getDocumentReviews).mockReturnValueOnce(pending.promise);
  renderPanel();
  expect(screen.getByRole('status', { name: 'Loading document reviews' })).toBeInTheDocument();
  await act(async () => pending.resolve({ ...overview, enabled: false }));
  expect(await screen.findByText(/Document review schedules are off/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Mark ISP reviewed' })).not.toBeInTheDocument();
});

it('shows an empty state and retries failed reads', async () => {
  vi.mocked(api.getDocumentReviews).mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce({ ...overview, items: [] });
  renderPanel();
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not load document reviews.');
  await userEvent.click(screen.getByRole('button', { name: 'Retry document reviews' }));
  expect(await screen.findByText('No uploaded documents are available for review.')).toBeInTheDocument();
});

it('records only an explicit review and refreshes the server dates and workspace', async () => {
  const onReviewed = vi.fn();
  vi.mocked(api.getDocumentReviews).mockResolvedValueOnce(overview).mockResolvedValue({ ...overview, items: [reviewed] });
  renderPanel({ clientId: 'c', onReviewed });
  expect(await screen.findByText('First review needed')).toBeInTheDocument();
  expect(screen.getByText('Review now')).toBeInTheDocument();
  expect(api.markDocumentReviewed).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole('button', { name: 'Mark ISP reviewed' }));
  await waitFor(() => expect(api.markDocumentReviewed).toHaveBeenCalledWith('c', 'isp-file', 0, expect.any(AbortSignal)));
  expect(await screen.findByText('ISP: review recorded.')).toBeInTheDocument();
  expect(await screen.findByText('Nov 13, 2026')).toBeInTheDocument();
  expect(screen.getByText(/Taylor/)).toBeInTheDocument();
  expect(onReviewed).toHaveBeenCalledTimes(1);
  expect(api.getDocumentReviews).toHaveBeenCalledTimes(2);
});

it('previews the current file without marking it reviewed', async () => {
  renderPanel();
  await userEvent.click(await screen.findByRole('button', { name: 'Preview ISP' }));
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  expect(screen.getByTitle('ISP preview')).toHaveAttribute('src', 'https://files.example/plan.pdf#toolbar=0&navpanes=0');
  expect(api.markDocumentReviewed).not.toHaveBeenCalled();
});

it('keeps agency reviews read-only while permitting history and preview', async () => {
  renderPanel({ clientId: 'c', agencyView: true });
  await screen.findByText('First review needed');
  expect(api.getDocumentReviews).toHaveBeenCalledWith('c', true, expect.any(AbortSignal));
  expect(screen.getByText('Read-only')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Mark ISP reviewed' })).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Review history for ISP' }));
  expect(await screen.findByText('No reviews recorded for this file.')).toBeInTheDocument();
  expect(api.getDocumentReviewEvents).toHaveBeenCalledWith('c', 'isp-file', true, undefined, expect.any(AbortSignal));
  expect(api.markDocumentReviewed).not.toHaveBeenCalled();
});

it('uses server status and disables actions on unavailable or unscheduled files', async () => {
  vi.mocked(api.getDocumentReviews).mockResolvedValue({ ...overview, items: [{ ...reviewed, status: 'overdue' },
    { ...item, reference: 'missing', title: 'PA', category: 'PA', url: null, status: 'unavailable' },
    { ...item, reference: 'disabled', title: 'Assessment', category: 'Assessment', status: 'disabled', intervalDays: null }] });
  renderPanel();
  expect(await screen.findByText('Overdue')).toBeInTheDocument();
  expect(screen.getByText('Nov 13, 2026')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Mark PA reviewed' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Preview PA' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Mark Assessment reviewed' })).not.toBeInTheDocument();
});

it('prevents duplicate submissions and keeps the current row when a save fails', async () => {
  const pending = deferred<api.DocumentReviewItem>();
  vi.mocked(api.markDocumentReviewed).mockReturnValueOnce(pending.promise);
  renderPanel();
  const button = await screen.findByRole('button', { name: 'Mark ISP reviewed' });
  await userEvent.dblClick(button);
  expect(api.markDocumentReviewed).toHaveBeenCalledTimes(1);
  expect(button).toBeDisabled();
  await act(async () => pending.resolve(reviewed));
  await waitFor(() => expect(button).toBeEnabled());
  vi.mocked(api.markDocumentReviewed).mockRejectedValueOnce(new Error('network'));
  await userEvent.click(button);
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not record this review.');
  expect(screen.getByRole('button', { name: 'Preview ISP' })).toBeInTheDocument();
});

it('refreshes a replaced file on conflict without retrying the old review', async () => {
  const replacement = { ...item, reference: 'new-isp-file', fileName: 'replacement.pdf' };
  vi.mocked(api.getDocumentReviews).mockResolvedValueOnce(overview).mockResolvedValue({ ...overview, items: [replacement] });
  vi.mocked(api.markDocumentReviewed).mockRejectedValueOnce(Object.assign(new Error('changed'), { isAxiosError: true, response: { status: 409 } }));
  renderPanel();
  await userEvent.click(await screen.findByRole('button', { name: 'Mark ISP reviewed' }));
  expect(await screen.findByText(/This document changed/)).toBeInTheDocument();
  expect(await screen.findByText(/replacement.pdf/)).toBeInTheDocument();
  expect(screen.getByText('Not yet reviewed')).toBeInTheDocument();
  expect(api.markDocumentReviewed).toHaveBeenCalledTimes(1);
  await userEvent.click(screen.getByRole('button', { name: 'Mark ISP reviewed' }));
  expect(api.markDocumentReviewed).toHaveBeenNthCalledWith(2, 'c', 'new-isp-file', 0, expect.any(AbortSignal));
});

it('loads and retries paginated history only when the SC opens it', async () => {
  vi.mocked(api.getDocumentReviewEvents).mockResolvedValueOnce({ items: [{ eventId: 'new', reviewerName: 'Taylor', reviewedAt: '2026-10-14T12:00:00Z', revision: 2 }], nextCursor: 'older' })
    .mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce({ items: [{ eventId: 'old', reviewerName: 'Morgan', reviewedAt: '2026-09-14T12:00:00Z', revision: 1 }], nextCursor: null });
  renderPanel();
  await screen.findByText('First review needed');
  expect(api.getDocumentReviewEvents).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole('button', { name: 'Review history for ISP' }));
  expect(await screen.findByText('Taylor')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Load older reviews' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not load review history.');
  await userEvent.click(screen.getByRole('button', { name: 'Retry review history' }));
  expect(await screen.findByText('Morgan')).toBeInTheDocument();
  expect(api.getDocumentReviewEvents).toHaveBeenNthCalledWith(3, 'c', 'isp-file', false, 'older', expect.any(AbortSignal));
});

it('focuses the document named by a reminder link', async () => {
  renderPanel({ clientId: 'c' }, '?documentReview=isp-file');
  expect(await screen.findByRole('article', { name: 'ISP review' })).toHaveFocus();
});

it('clears current files and their preview when a history request reveals lost access', async () => {
  const denied = Object.assign(new Error('denied'), { isAxiosError: true, response: { status: 403 } });
  const pending = deferred<api.DocumentReviewEventPage>();
  vi.mocked(api.getDocumentReviews).mockResolvedValueOnce(overview).mockRejectedValueOnce(denied);
  vi.mocked(api.getDocumentReviewEvents).mockReturnValueOnce(pending.promise);
  renderPanel();
  await userEvent.click(await screen.findByRole('button', { name: 'Review history for ISP' }));
  await userEvent.click(screen.getByRole('button', { name: 'Preview ISP' }));
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  await act(async () => pending.reject(denied));
  expect(await screen.findByText('Document reviews are unavailable. Your access may have changed.')).toBeInTheDocument();
  expect(screen.queryByRole('article', { name: 'ISP review' })).not.toBeInTheDocument();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('refreshes open history after recording a review', async () => {
  vi.mocked(api.getDocumentReviews).mockResolvedValueOnce(overview).mockResolvedValue({ ...overview, items: [reviewed] });
  vi.mocked(api.getDocumentReviewEvents).mockResolvedValueOnce({ items: [], nextCursor: null }).mockResolvedValue({ items: [{ eventId: 'review', reviewerName: 'Taylor', reviewedAt: reviewed.lastReviewedAt!, revision: 1 }], nextCursor: null });
  renderPanel();
  await userEvent.click(await screen.findByRole('button', { name: 'Review history for ISP' }));
  await screen.findByText('No reviews recorded for this file.');
  await userEvent.click(screen.getByRole('button', { name: 'Mark ISP reviewed' }));
  expect(await screen.findByText('Taylor')).toBeInTheDocument();
  expect(screen.queryByText('No reviews recorded for this file.')).not.toBeInTheDocument();
  expect(api.getDocumentReviewEvents).toHaveBeenCalledTimes(2);
});

it('refreshes document rules after settings are saved', async () => {
  vi.mocked(api.getDocumentReviews).mockResolvedValueOnce({ ...overview, enabled: false }).mockResolvedValueOnce(overview);
  const { rerender } = renderPanel({ clientId: 'c', agencyView: true, refreshKey: 0 });
  await screen.findByText(/Document review schedules are off/);
  rerender(<MemoryRouter><DocumentReviewsPanel clientId="c" agencyView refreshKey={1} /></MemoryRouter>);
  expect(await screen.findByText('First review needed')).toBeInTheDocument();
  expect(api.getDocumentReviews).toHaveBeenCalledTimes(2);
});

it('ignores a late list response after switching clients', async () => {
  const old = deferred<api.DocumentReviewOverview>();
  vi.mocked(api.getDocumentReviews).mockReturnValueOnce(old.promise).mockResolvedValueOnce({ ...overview, items: [{ ...item, title: 'New client file' }] });
  const { rerender } = renderPanel();
  rerender(<MemoryRouter><DocumentReviewsPanel clientId="new-client" /></MemoryRouter>);
  await screen.findByText('New client file');
  expect(vi.mocked(api.getDocumentReviews).mock.calls[0][2]?.aborted).toBe(true);
  await act(async () => old.resolve(overview));
  expect(screen.queryByRole('heading', { name: 'ISP' })).not.toBeInTheDocument();
  expect(within(screen.getByRole('region', { name: 'Document reviews' })).getByText('New client file')).toBeInTheDocument();
});

it('ignores a pending review after the actor scope changes', async () => {
  const pending = deferred<api.DocumentReviewItem>(); const onReviewed = vi.fn();
  vi.mocked(api.markDocumentReviewed).mockReturnValueOnce(pending.promise);
  const { rerender } = renderPanel({ clientId: 'c', onReviewed });
  await userEvent.click(await screen.findByRole('button', { name: 'Mark ISP reviewed' }));
  authScope.value = 'another-agency:user';
  rerender(<MemoryRouter><DocumentReviewsPanel clientId="c" onReviewed={onReviewed} /></MemoryRouter>);
  await screen.findByRole('button', { name: 'Mark ISP reviewed' });
  expect(vi.mocked(api.markDocumentReviewed).mock.calls[0][3]?.aborted).toBe(true);
  await act(async () => pending.resolve(reviewed));
  expect(onReviewed).not.toHaveBeenCalled();
  expect(screen.queryByText('ISP: review recorded.')).not.toBeInTheDocument();
});
