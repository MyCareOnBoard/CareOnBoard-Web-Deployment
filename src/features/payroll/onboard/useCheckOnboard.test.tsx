import { describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCheckOnboard } from "./useCheckOnboard";
import * as loader from "./loadCheckOnboard";

describe("useCheckOnboard", () => {
  it("opens exactly the fresh session and treats SDK event data only as a refetch hint", async () => {
    const close = vi.fn(); const open = vi.fn(); let options: { onEvent: (name: string, data: unknown) => void } | undefined; const create = vi.fn((input: typeof options) => { options = input; return { close, open }; }); const refetch = vi.fn();
    vi.spyOn(loader, "loadCheckOnboard").mockResolvedValue({ create });
    const { result } = renderHook(() => useCheckOnboard(refetch));
    await act(() => result.current.open("https://session.example/one"));
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ link: "https://session.example/one" })); expect(open).toHaveBeenCalledOnce();
    options?.onEvent("check-onboard-app-completed", { untrusted: true }); expect(refetch).toHaveBeenCalledOnce();
    act(() => result.current.close()); expect(close).toHaveBeenCalledOnce();
  });
  it("closes an expired session without opening it", async () => {
    const create = vi.fn(); vi.spyOn(loader, "loadCheckOnboard").mockResolvedValue({ create });
    const { result } = renderHook(() => useCheckOnboard(vi.fn()));
    await expect(act(() => result.current.open("https://session.example/one", new Date(0).toISOString()))).rejects.toThrow(/fresh/i);
    expect(create).not.toHaveBeenCalled();
  });
  it("rejects an invalid expiry rather than opening indefinitely", async () => {
    const create = vi.fn(); vi.spyOn(loader, "loadCheckOnboard").mockResolvedValue({ create }); const { result } = renderHook(() => useCheckOnboard(vi.fn()));
    await expect(act(() => result.current.open("https://session.example/one", "invalid"))).rejects.toThrow(/fresh/i); expect(create).not.toHaveBeenCalled();
  });
  it("closes the handler at expiry and restores the invoker callback", async () => {
    vi.useFakeTimers(); const close = vi.fn(); const open = vi.fn(); vi.spyOn(loader, "loadCheckOnboard").mockResolvedValue({ create: vi.fn(() => ({ close, open })) }); const restored = vi.fn(); const { result } = renderHook(() => useCheckOnboard(vi.fn(), restored));
    await act(() => result.current.open("https://session.example/one", new Date(Date.now() + 100).toISOString())); await act(() => vi.advanceTimersByTimeAsync(100)); expect(close).toHaveBeenCalledOnce(); expect(restored).toHaveBeenCalledOnce(); vi.useRealTimers();
  });
  it("restores focus only once when close synchronously reenters the SDK callback", async () => {
    const restored = vi.fn(); let options: { onClose: () => void } | undefined;
    const close = vi.fn(() => options?.onClose());
    vi.spyOn(loader, "loadCheckOnboard").mockResolvedValue({ create: vi.fn((input) => { options = input; return { close, open: vi.fn() }; }) });
    const { result } = renderHook(() => useCheckOnboard(vi.fn(), restored));
    await act(() => result.current.open("https://session.example/one")); act(() => result.current.close());
    expect(close).toHaveBeenCalledOnce(); expect(restored).toHaveBeenCalledOnce();
  });
  it("does not restore focus while replacing an existing SDK handler", async () => {
    const restored = vi.fn(); const firstClose = vi.fn(); let firstOptions: { onClose: () => void } | undefined;
    vi.spyOn(loader, "loadCheckOnboard").mockResolvedValue({ create: vi.fn((input) => {
      if (!firstOptions) { firstOptions = input; return { close: firstClose.mockImplementation(() => firstOptions?.onClose()), open: vi.fn() }; }
      return { close: vi.fn(), open: vi.fn() };
    }) });
    const { result } = renderHook(() => useCheckOnboard(vi.fn(), restored));
    await act(() => result.current.open("https://session.example/first")); await act(() => result.current.open("https://session.example/second"));
    expect(firstClose).toHaveBeenCalledOnce(); expect(restored).not.toHaveBeenCalled();
  });
  it("closes the active handler when the hook unmounts", async () => {
    const close = vi.fn(); vi.spyOn(loader, "loadCheckOnboard").mockResolvedValue({ create: vi.fn(() => ({ close, open: vi.fn() })) });
    const { result, unmount } = renderHook(() => useCheckOnboard(vi.fn())); await act(() => result.current.open("https://session.example/one")); unmount();
    expect(close).toHaveBeenCalledOnce();
  });
});
