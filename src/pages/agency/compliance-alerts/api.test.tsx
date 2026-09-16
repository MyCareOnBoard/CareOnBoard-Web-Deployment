import {act, renderHook} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
vi.mock('@/lib/baseQuery', () => ({customBaseQuery: vi.fn()}));
import {useComplianceDateRefresh} from './api';
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-16T03:59:45Z'));
  Object.defineProperty(document, 'visibilityState', {configurable: true, value: 'visible'});
});
afterEach(() => vi.useRealTimers());
describe('agency date freshness for empty issue pages', () => {
  it('refreshes an empty New York page at local midnight, not UTC midnight', async () => {
    const response = {items: [], timezone: 'America/New_York', localDate: '2026-09-15'};
    const refresh = vi.fn();
    const {unmount} = renderHook(() => useComplianceDateRefresh(response.timezone, refresh, response.localDate));
    expect(refresh).not.toHaveBeenCalled();
    await act(() => vi.advanceTimersByTimeAsync(30_000));
    expect(refresh).toHaveBeenCalledTimes(1);
    unmount();
    await act(() => vi.advanceTimersByTimeAsync(86_400_000));
    expect(refresh).toHaveBeenCalledTimes(1);
  });
  it('defers midnight refresh while hidden until the view becomes visible', async () => {
    Object.defineProperty(document, 'visibilityState', {configurable: true, value: 'hidden'});
    const refresh = vi.fn();
    renderHook(() => useComplianceDateRefresh('America/New_York', refresh, '2026-09-15'));
    await act(() => vi.advanceTimersByTimeAsync(30_000));
    expect(refresh).not.toHaveBeenCalled();
    Object.defineProperty(document, 'visibilityState', {configurable: true, value: 'visible'});
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
