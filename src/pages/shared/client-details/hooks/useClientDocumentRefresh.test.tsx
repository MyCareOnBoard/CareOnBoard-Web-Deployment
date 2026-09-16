import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Client } from '@/lib/api/clients';
import { useClientDocumentRefresh } from './useClientDocumentRefresh';

const client = (id: string) => ({ id, documents: [] } as unknown as Client);
const deferred = () => { let resolve!: (value: Client) => void; let reject!: (value: unknown) => void; const promise = new Promise<Client>((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
afterEach(() => vi.restoreAllMocks());
describe('client document refresh', () => {
  it('loads once, refreshes only an active tab after 60 seconds and coalesces focus requests', async () => {
    let now = 0; vi.spyOn(Date, 'now').mockImplementation(() => now);
    const next = deferred(); const load = vi.fn().mockResolvedValueOnce(client('a')).mockReturnValue(next.promise);
    const { result, rerender } = renderHook(({ active }) => useClientDocumentRefresh({ requestKey: 'a', enabled: true, documentsActive: active, load }), { initialProps: { active: false } });
    await waitFor(() => expect(result.current.client).not.toBeNull());
    expect(load).toHaveBeenCalledTimes(1);
    now = 59000; rerender({ active: true }); act(() => window.dispatchEvent(new Event('focus'))); expect(load).toHaveBeenCalledTimes(1);
    now = 60000; act(() => { window.dispatchEvent(new Event('focus')); window.dispatchEvent(new Event('focus')); }); expect(load).toHaveBeenCalledTimes(2);
    await act(async () => next.resolve(client('a')));
    rerender({ active: false }); now = 120000; act(() => window.dispatchEvent(new Event('focus'))); expect(load).toHaveBeenCalledTimes(2);
  });
  it('forced saves supersede old responses and context changes never show the previous client', async () => {
    const first = deferred(), second = deferred(), third = deferred();
    const load = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise).mockReturnValueOnce(third.promise);
    const { result, rerender, unmount } = renderHook(({ key }) => useClientDocumentRefresh({ requestKey: key, enabled: true, documentsActive: true, load }), { initialProps: { key: 'env:a:ddd' } });
    act(() => { void result.current.refresh(true); });
    expect(load.mock.calls[0][0].aborted).toBe(true);
    await act(async () => second.resolve(client('new')));
    await act(async () => first.resolve(client('old')));
    expect(result.current.client).toEqual(client('new'));
    rerender({ key: 'env:b:hha' }); expect(result.current.client).toBeNull();
    unmount(); expect(load.mock.calls[2][0].aborted).toBe(true);
  });
  it('retains transient failures, clears revoked access, and ignores obsolete errors', async () => {
    const old = deferred(); const load = vi.fn().mockResolvedValueOnce(client('a')).mockRejectedValueOnce(new Error('offline')).mockReturnValueOnce(old.promise).mockRejectedValueOnce({ response: { status: 403 } });
    const { result } = renderHook(() => useClientDocumentRefresh({ requestKey: 'a', enabled: true, documentsActive: false, load }));
    await waitFor(() => expect(result.current.client).not.toBeNull());
    await act(async () => result.current.refresh(true)); expect(result.current.client).not.toBeNull(); expect(result.current.error).not.toBeNull();
    act(() => { void result.current.refresh(true); });
    await act(async () => result.current.refresh(true)); expect(result.current.client).toBeNull();
    await act(async () => old.reject(new Error('stale'))); expect(result.current.error).not.toBe('stale');
  });
});
