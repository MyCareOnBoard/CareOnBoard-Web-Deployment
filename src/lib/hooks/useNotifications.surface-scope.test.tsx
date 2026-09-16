import {act, renderHook, waitFor} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
const mocks = vi.hoisted(() => ({get: vi.fn(), patch: vi.fn(), post: vi.fn(), uid: 'employee-1'}));
vi.mock('../axios', () => ({default: mocks}));
vi.mock('@/utils/auth', () => ({useAuth: () => ({user: {uid: mocks.uid}})}));
import {useNotifications} from './useNotifications';
beforeEach(() => {
  vi.clearAllMocks(); mocks.uid = 'employee-1';
  Object.defineProperty(document, 'visibilityState', {configurable: true, value: 'visible'});
  mocks.get.mockResolvedValue({data: {notifications: [{id: 'one', status: 'unread'}]}});
  mocks.patch.mockResolvedValue({}); mocks.post.mockResolvedValue({data: {hasMore: false}});
});
afterEach(() => vi.useRealTimers());
describe('authenticated Care-On-Board notifications', () => {
  it('requests the authorized surface and preserves single read action', async () => {
    const {result} = renderHook(useNotifications);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mocks.get).toHaveBeenCalledWith('/notifications', expect.objectContaining({params: {surface: 'care_on_board', cleared: false, limit: 50}}));
    await act(() => result.current.markAsRead('one'));
    expect(mocks.patch).toHaveBeenCalledWith('/notifications/one/read', {}, expect.objectContaining({signal: expect.any(AbortSignal)}));
  });
  it('continues bounded bulk pages beyond the loaded list', async () => {
    const {result} = renderHook(useNotifications);
    await waitFor(() => expect(result.current.loading).toBe(false));
    mocks.post.mockResolvedValueOnce({data: {hasMore: true, nextCursor: 'next'}}).mockResolvedValueOnce({data: {hasMore: false}});
    await act(() => result.current.clearAll());
    expect(mocks.post).toHaveBeenNthCalledWith(2, '/notifications/clear-all', {}, expect.objectContaining({params: {surface: 'care_on_board', startAfter: 'next'}}));
  });
  it('does not request while hidden and aborts on unmount', async () => {
    vi.useFakeTimers();
    Object.defineProperty(document, 'visibilityState', {configurable: true, value: 'hidden'});
    const {unmount} = renderHook(useNotifications);
    await act(() => vi.advanceTimersByTimeAsync(30_000));
    expect(mocks.get).not.toHaveBeenCalled();
    Object.defineProperty(document, 'visibilityState', {configurable: true, value: 'visible'});
    await act(async () => {document.dispatchEvent(new Event('visibilitychange'));});
    expect(mocks.get).toHaveBeenCalledTimes(1);
    unmount();
    await act(() => vi.advanceTimersByTimeAsync(30_000));
    expect(mocks.get).toHaveBeenCalledTimes(1);
  });
  it('ignores a late response belonging to the previous user', async () => {
    let resolve!: (value: unknown) => void;
    mocks.get.mockReturnValueOnce(new Promise(done => {resolve = done;}));
    const {result, rerender} = renderHook(useNotifications);
    mocks.uid = 'employee-2'; rerender();
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => resolve({data: {notifications: [{id: 'private-old'}]}}));
    expect(result.current.notifications[0].id).toBe('one');
  });
});
