import { describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { PayrollOperationProvider, usePayrollOperations } from "./PayrollOperationProvider";
import type { PayrollOperation } from "../model/types";
describe("PayrollOperationProvider", () => {
  it("limits a keyed operation to three automatic polls", async () => {
    vi.useFakeTimers(); const poll = vi.fn().mockResolvedValue({ operationId: "op", state: "running", resourceType: "company", pollAfterMs: 1 });
    const wrapper = ({ children }: { children: React.ReactNode }) => <PayrollOperationProvider>{children}</PayrollOperationProvider>;
    const { result } = renderHook(() => usePayrollOperations(), { wrapper }); act(() => { result.current.watch({ audience: "agency", actorUid: "u", agencyId: "a" }, "op", poll); }); await vi.runAllTimersAsync(); expect(poll).toHaveBeenCalledTimes(3); vi.useRealTimers();
  });
  it("does not poll while the document is hidden and resumes when visible", async () => {
    vi.useFakeTimers(); let visibility = "hidden"; Object.defineProperty(document, "visibilityState", { configurable: true, get: () => visibility }); const poll = vi.fn().mockResolvedValue({ operationId: "op", state: "succeeded", resourceType: "company", pollAfterMs: null } satisfies PayrollOperation);
    const wrapper = ({ children }: { children: React.ReactNode }) => <PayrollOperationProvider>{children}</PayrollOperationProvider>; const { result } = renderHook(() => usePayrollOperations(), { wrapper }); act(() => { result.current.watch({ audience: "agency", actorUid: "u", agencyId: "a" }, "op", poll); }); expect(poll).not.toHaveBeenCalled(); visibility = "visible"; act(() => document.dispatchEvent(new Event("visibilitychange"))); await Promise.resolve(); expect(poll).toHaveBeenCalledOnce(); vi.useRealTimers();
  });
  it("stops after a terminal backend state", async () => {
    vi.useFakeTimers(); const poll = vi.fn().mockResolvedValue({ operationId: "op", state: "succeeded", resourceType: "company", pollAfterMs: null } satisfies PayrollOperation); const settled = vi.fn();
    const wrapper = ({ children }: { children: React.ReactNode }) => <PayrollOperationProvider>{children}</PayrollOperationProvider>; const { result } = renderHook(() => usePayrollOperations(), { wrapper }); act(() => { result.current.watch({ audience: "agency", actorUid: "u", agencyId: "a" }, "op", poll, settled); }); await Promise.resolve(); await vi.runAllTimersAsync(); expect(poll).toHaveBeenCalledOnce(); expect(settled).toHaveBeenCalledOnce(); vi.useRealTimers();
  });
  it("settles once when polling errors so callers can refresh authoritatively", async () => {
    const poll = vi.fn().mockRejectedValue(new Error("network")); const settled = vi.fn(); const wrapper = ({ children }: { children: React.ReactNode }) => <PayrollOperationProvider>{children}</PayrollOperationProvider>; const { result } = renderHook(() => usePayrollOperations(), { wrapper }); act(() => { result.current.watch({ audience: "agency", actorUid: "u", agencyId: "a" }, "op", poll, settled); }); await Promise.resolve(); expect(settled).toHaveBeenCalledOnce();
  });
  it("ignores a late terminal result after the same operation is replaced", async () => {
    let resolveFirst!: (value: PayrollOperation) => void; const first = vi.fn(() => new Promise<PayrollOperation>((resolve) => { resolveFirst = resolve; })); const second = vi.fn().mockResolvedValue({ operationId: "op", state: "running", resourceType: "company", pollAfterMs: 1000 } satisfies PayrollOperation); const firstSettled = vi.fn(); const secondSettled = vi.fn();
    const wrapper = ({ children }: { children: React.ReactNode }) => <PayrollOperationProvider>{children}</PayrollOperationProvider>; const { result } = renderHook(() => usePayrollOperations(), { wrapper });
    act(() => { result.current.watch({ audience: "agency", actorUid: "u", agencyId: "a" }, "op", first, firstSettled); result.current.watch({ audience: "agency", actorUid: "u", agencyId: "a" }, "op", second, secondSettled); });
    await act(async () => { resolveFirst({ operationId: "op", state: "succeeded", resourceType: "company", pollAfterMs: null } satisfies PayrollOperation); });
    expect(firstSettled).not.toHaveBeenCalled(); expect(secondSettled).not.toHaveBeenCalled();
  });
});
