import { beforeEach, expect, it, vi } from 'vitest';
import axiosClient from '@/lib/axios';
import { getDocumentReviews, markDocumentReviewed, getDocumentReviewEvents } from './sc-document-reviews';

vi.mock('@/lib/axios', () => ({ default: { get: vi.fn(), post: vi.fn() } }));
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(axiosClient.get).mockResolvedValue({ data: { success: true, data: {} } });
  vi.mocked(axiosClient.post).mockResolvedValue({ data: { success: true, data: {} } });
});

it('uses SC and read-only agency paths with encoded client and document references', async () => {
  const signal = new AbortController().signal;
  await getDocumentReviews('a/b', false, signal);
  await getDocumentReviews('a/b', true, signal);
  await getDocumentReviewEvents('a/b', 'file/ref', true, 'cursor', signal);
  expect(axiosClient.get).toHaveBeenNthCalledWith(1, '/employeePortal/sc-monitoring/clients/a%2Fb/document-reviews', { signal });
  expect(axiosClient.get).toHaveBeenNthCalledWith(2, '/clientManagement/a%2Fb/monitoring/document-reviews', { signal });
  expect(axiosClient.get).toHaveBeenNthCalledWith(3, '/clientManagement/a%2Fb/monitoring/document-reviews/file%2Fref/events', { params: { cursor: 'cursor' }, signal });
});

it('sends only the expected revision when recording an SC review', async () => {
  const signal = new AbortController().signal;
  await markDocumentReviewed('client', 'file', 7, signal);
  expect(axiosClient.post).toHaveBeenCalledWith('/employeePortal/sc-monitoring/clients/client/document-reviews/file/review', { expectedRevision: 7 }, { signal });
});

it('rejects unsuccessful overview and review envelopes', async () => {
  vi.mocked(axiosClient.get).mockResolvedValueOnce({ data: { success: false, error: 'Read unavailable' } });
  vi.mocked(axiosClient.post).mockResolvedValueOnce({ data: { success: false, error: 'Review unavailable' } });
  await expect(getDocumentReviews('client')).rejects.toThrow('Read unavailable');
  await expect(markDocumentReviewed('client', 'file', 0)).rejects.toThrow('Review unavailable');
});
