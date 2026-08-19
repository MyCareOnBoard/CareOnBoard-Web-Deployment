import { describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { PayrollOperationProvider, usePayrollOperations } from "./PayrollOperationProvider";
import type { PayrollOperation } from "../model/types";
describe("PayrollOperationProvider", () => {
  it("waits for an authoritative terminal state after three running polls", async () => {
    vi.useFakeTimers();
    const poll = vi.fn()
      .mockResolvedValueOnce({ operationId: "op", state: "running", resourceType: "company", pollAfterMs: 1 })
      .mockResolvedValueOnce({ operationId: "op", state: "running", resourceType: "company", pollAfterMs: 1 })
      .mockResolvedValueOnce({ operationId: "op", state: "running", resourceType: "company", pollAfterMs: 1 })
      .mockResolvedValueOnce({ operationId: "op", state: "succeeded", resourceType: "company", pollAfterMs: null });
    const settled = vi.fn();
    const wrapper = ({ children }: { children: React.ReactNode }) => <PayrollOperationProvider>{children}</PayrollOperationProvider>;
    const { result } = renderHook(() => usePayrollOperations(), { wrapper });
    act(() => { result.current.watch({ audience: "agency", actorUid: "u", agencyId: "a" }, "op", poll, settled); });
    await act(async () => { await vi.advanceTimersByTimeAsync(3); });
    expect(poll).toHaveBeenCalledTimes(4);
    expect(settled).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });
  it("does not poll while the document is hidden and resumes when visible", async () => {
    vi.useFakeTimers(); let visibility = "hidden"; Object.defineProperty(document, "visibilityState", { configurable: true, get: () => visibility }); const poll = vi.fn().mockResolvedValue({ operationId: "op", state: "succeeded", resourceType: "company", pollAfterMs: null } satisfies PayrollOperation);
    const wrapper = ({ children }: { children: React.ReactNode }) => <PayrollOperationProvider>{children}</PayrollOperationProvider>; const { result } = renderHook(() => usePayrollOperations(), { wrapper }); act(() => { result.current.watch({ audience: "agency", actorUid: "u", agencyId: "a" }, "op", poll); }); expect(poll).not.toHaveBeenCalled(); visibility = "visible"; act(() => document.dispatchEvent(new Event("visibilitychange"))); await Promise.resolve(); expect(poll).toHaveBeenCalledOnce(); vi.useRealTimers();
  });
  it("stops after a terminal backend state", async () => {
    vi.useFakeTimers(); const poll = vi.fn().mockResolvedValue({ operationId: "op", state: "succeeded", resourceType: "company", pollAfterMs: null } satisfies PayrollOperation); const settled = vi.fn();
    const wrapper = ({ children }: { children: React.ReactNode }) => <PayrollOperationProvider>{children}</PayrollOperationProvider>; const { result } = renderHook(() => usePayrollOperations(), { wrapper }); act(() => { result.current.watch({ audience: "agency", actorUid: "u", agencyId: "a" }, "op", poll, settled); }); await Promise.resolve(); await vi.runAllTimersAsync(); expect(poll).toHaveBeenCalledOnce(); expect(settled).toHaveBeenCalledOnce(); vi.useRealTimers();
  });
  it("backs off consecutive polling errors through the cap before a later terminal response", async () => {
    vi.useFakeTimers();
    const poll = vi.fn()
      .mockRejectedValueOnce(new Error("first"))
      .mockRejectedValueOnce(new Error("second"))
      .mockRejectedValueOnce(new Error("third"))
      .mockRejectedValueOnce(new Error("fourth"))
      .mockRejectedValueOnce(new Error("fifth"))
      .mockRejectedValueOnce(new Error("sixth"))
      .mockResolvedValueOnce({ operationId: "op", state: "succeeded", resourceType: "company", pollAfterMs: null });
    const settled = vi.fn();
    const wrapper = ({ children }: { children: React.ReactNode }) => <PayrollOperationProvider>{children}</PayrollOperationProvider>;
    const { result } = renderHook(() => usePayrollOperations(), { wrapper });
    act(() => { result.current.watch({ audience: "agency", actorUid: "u", agencyId: "a" }, "op", poll, settled); });
    await act(async () => { await Promise.resolve(); });
    expect(settled).not.toHaveBeenCalled();
    for (const [delay, calls] of [[1000, 2], [2000, 3], [4000, 4], [8000, 5], [16000, 6], [30000, 7]] as const) {
      await act(async () => { await vi.advanceTimersByTimeAsync(delay - 1); });
      expect(poll).toHaveBeenCalledTimes(calls - 1);
      await act(async () => { await vi.advanceTimersByTimeAsync(1); });
      expect(poll).toHaveBeenCalledTimes(calls);
    }
    expect(settled).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });
  it("resets error backoff after a successful nonterminal poll", async () => {
    vi.useFakeTimers();
    const poll = vi.fn()
      .mockRejectedValueOnce(new Error("first"))
      .mockResolvedValueOnce({ operationId: "op", state: "running", resourceType: "company", pollAfterMs: 7 })
      .mockRejectedValueOnce(new Error("after-success"))
      .mockResolvedValueOnce({ operationId: "op", state: "succeeded", resourceType: "company", pollAfterMs: null });
    const settled = vi.fn();
    const wrapper = ({ children }: { children: React.ReactNode }) => <PayrollOperationProvider>{children}</PayrollOperationProvider>;
    const { result } = renderHook(() => usePayrollOperations(), { wrapper });
    act(() => { result.current.watch({ audience: "agency", actorUid: "u", agencyId: "a" }, "op", poll, settled); });
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    await act(async () => { await vi.advanceTimersByTimeAsync(7); });
    await act(async () => { await vi.advanceTimersByTimeAsync(999); });
    expect(poll).toHaveBeenCalledTimes(3);
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(poll).toHaveBeenCalledTimes(4);
    expect(settled).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });
  it("clears a scheduled poll before visible resume so one chain reaches terminal", async () => {
    vi.useFakeTimers();
    let visibility = "visible";
    let resolveTerminal!: (operation: PayrollOperation) => void;
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => visibility });
    const poll = vi.fn()
      .mockResolvedValueOnce({ operationId: "op", state: "running", resourceType: "company", pollAfterMs: 1000 })
      .mockResolvedValueOnce({ operationId: "op", state: "running", resourceType: "company", pollAfterMs: 1000 })
      .mockImplementationOnce(() => new Promise<PayrollOperation>((resolve) => { resolveTerminal = resolve; }));
    const settled = vi.fn();
    const wrapper = ({ children }: { children: React.ReactNode }) => <PayrollOperationProvider>{children}</PayrollOperationProvider>;
    const { result } = renderHook(() => usePayrollOperations(), { wrapper });
    act(() => { result.current.watch({ audience: "agency", actorUid: "u", agencyId: "a" }, "op", poll, settled); });
    await act(async () => { await Promise.resolve(); });
    visibility = "hidden";
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    visibility = "visible";
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    await act(async () => { await Promise.resolve(); });
    expect(poll).toHaveBeenCalledTimes(2);
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(poll).toHaveBeenCalledTimes(3);
    await act(async () => { resolveTerminal({ operationId: "op", state: "succeeded", resourceType: "company", pollAfterMs: null }); });
    expect(settled).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });
  it("ignores visible resume while an operation poll is in flight", async () => {
    let resolvePoll!: (operation: PayrollOperation) => void;
    let visibility = "visible";
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => visibility });
    const poll = vi.fn(() => new Promise<PayrollOperation>((resolve) => { resolvePoll = resolve; }));
    const settled = vi.fn();
    const wrapper = ({ children }: { children: React.ReactNode }) => <PayrollOperationProvider>{children}</PayrollOperationProvider>;
    const { result } = renderHook(() => usePayrollOperations(), { wrapper });
    act(() => { result.current.watch({ audience: "agency", actorUid: "u", agencyId: "a" }, "op", poll, settled); });
    visibility = "hidden";
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    visibility = "visible";
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    expect(poll).toHaveBeenCalledOnce();
    await act(async () => { resolvePoll({ operationId: "op", state: "succeeded", resourceType: "company", pollAfterMs: null }); });
    expect(settled).toHaveBeenCalledOnce();
  });
  it("ignores a late terminal result after the same operation is replaced", async () => {
    let resolveFirst!: (value: PayrollOperation) => void; const first = vi.fn(() => new Promise<PayrollOperation>((resolve) => { resolveFirst = resolve; })); const second = vi.fn().mockResolvedValue({ operationId: "op", state: "running", resourceType: "company", pollAfterMs: 1000 } satisfies PayrollOperation); const firstSettled = vi.fn(); const secondSettled = vi.fn();
    const wrapper = ({ children }: { children: React.ReactNode }) => <PayrollOperationProvider>{children}</PayrollOperationProvider>; const { result } = renderHook(() => usePayrollOperations(), { wrapper });
    act(() => { result.current.watch({ audience: "agency", actorUid: "u", agencyId: "a" }, "op", first, firstSettled); result.current.watch({ audience: "agency", actorUid: "u", agencyId: "a" }, "op", second, secondSettled); });
    await act(async () => { resolveFirst({ operationId: "op", state: "succeeded", resourceType: "company", pollAfterMs: null } satisfies PayrollOperation); });
    expect(firstSettled).not.toHaveBeenCalled(); expect(secondSettled).not.toHaveBeenCalled();
  });
});
