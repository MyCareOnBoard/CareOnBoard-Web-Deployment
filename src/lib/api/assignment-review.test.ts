import {beforeEach, expect, it, vi} from 'vitest';
import axiosClient from '@/lib/axios';
import {createClient, createClientWithReview, updateClient, updateClientWithReview} from './clients';
import {assignmentReviewMetadata, assignmentSaveMessage, getAssignmentReview, type AssignmentReviewEnvelope} from './assignment-review';
vi.mock('@/lib/axios', () => ({default: {post: vi.fn(), put: vi.fn()}}));
const response = {success: true, data: {id: 'client'}, assignmentReviews: {}, reviewedPairCount: 0, unreviewedPairCount: 0, assignmentReviewCoverage: 'complete' as const};
beforeEach(() => {vi.clearAllMocks(); vi.mocked(axiosClient.post).mockResolvedValue({data: response}); vi.mocked(axiosClient.put).mockResolvedValue({data: response});});
it('preserves legacy resource returns and exposes the envelope with exactly one request per helper', async () => {
  const payload = {firstName: 'Ada', lastName: 'Lovelace'};
  expect(await createClient(payload)).toEqual(response.data);
  expect(axiosClient.post).toHaveBeenCalledTimes(1);
  expect(await createClientWithReview(payload)).toEqual(response);
  expect(axiosClient.post).toHaveBeenCalledTimes(2);
  expect(await updateClient('client', payload, 'agency')).toEqual(response.data);
  expect(axiosClient.put).toHaveBeenCalledTimes(1);
  expect(await updateClientWithReview('client', payload, 'agency')).toEqual(response);
  expect(axiosClient.put).toHaveBeenCalledTimes(2);
  expect(axiosClient.put).toHaveBeenLastCalledWith('/clients/client', payload, {params: {agencyId: 'agency'}});
});
it('retains business errors and treats malformed optional metadata as unavailable', async () => {
  vi.mocked(axiosClient.put).mockResolvedValueOnce({data: {...response, success: false}});
  await expect(updateClient('client', {})).rejects.toThrow('Failed to update client');
  expect(assignmentReviewMetadata({...response, assignmentReviews: {bad: {version: 1, training: {attentionItems: null}}}} as unknown as AssignmentReviewEnvelope)).toBeUndefined();
  expect(assignmentSaveMessage(undefined, false, true)).toBeUndefined();
  expect(assignmentSaveMessage(undefined, true, true)).toBe('Client saved. Some records could not be checked.');
});

it('sends the saved legacy row key without UI-only identity fields', async () => {
  const key = JSON.stringify(['hha', 't1019', '2026-09-01', null]);
  await expect(getAssignmentReview({agencyId: 'agency', clientId: 'client', input: {program: 'hha', kind: 'service_roster', employeeId: 'employee', serviceRowKey: 'local-row'}, requestServiceRowKey: key})).rejects.toThrow('Assignment review unavailable');
  expect(axiosClient.post).toHaveBeenCalledWith('/clients/client/assignment-review', {program: 'hha', kind: 'service_roster', employeeId: 'employee', serviceRowKey: key}, {params: {agencyId: 'agency'}, signal: undefined});
});
