import { renderHook, act } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { useScMonitoringRefresh } from './useScMonitoringRefresh';
test('focus refresh is coalesced and its request is canceled on source change', async () => {
  let signal: AbortSignal | undefined;
  const refresh = vi.fn((value: AbortSignal) => { signal = value; return new Promise<void>(() => {}); });
  const { unmount } = renderHook(() => useScMonitoringRefresh({ scopeKey: 'a:c:u', timezone: 'UTC', refresh, enabled: true }));
  act(() => { window.dispatchEvent(new Event('focus')); window.dispatchEvent(new Event('focus')); });
  expect(refresh).toHaveBeenCalledTimes(1);
  unmount(); expect(signal?.aborted).toBe(true);
});
