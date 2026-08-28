import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { usePayrollRunCommand } from "./usePayrollRunCommand";

const transport = vi.hoisted(() => ({
  run: vi.fn(),
  offCycle: vi.fn(),
  operation: vi.fn(),
  watch: vi.fn(),
}));

vi.mock("../api/payrollRunCommands", () => ({
  useRunPayrollRunCommandMutation: () => [transport.run],
  useCreateOffCyclePayrollRunMutation: () => [transport.offCycle],
}));
vi.mock("../../api/agencyPayrollEndpoints", () => ({
  useLazyGetAgencyPayrollOperationQuery: () => [transport.operation],
}));
vi.mock("../../operations/PayrollOperationProvider", () => ({
  usePayrollOperations: () => ({ watch: transport.watch }),
}));

const scope = { audience: "agency" as const, actorUid: "actor-1", agencyId: "agency-1", mode: "ddd" as const };
const command = (idempotencyKey: string) => ({
  ...scope,
  runId: "run-1",
  command: "request_preview" as const,
  expectedProjectionRevision: 7,
  expectedActiveRevisionId: "revision-1",
  idempotencyKey,
});

function installFrameQueue() {
  let sequence = 0;
  const callbacks = new Map<number, FrameRequestCallback>();
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
    sequence += 1;
    callbacks.set(sequence, callback);
    return sequence;
  });
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => { callbacks.delete(id); });
  return {
    flush() {
      const pending = [...callbacks.values()];
      callbacks.clear();
      pending.forEach((callback) => callback(performance.now()));
    },
  };
}

describe("usePayrollRunCommand", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    transport.watch.mockReturnValue(vi.fn());
    transport.operation.mockReturnValue({ unwrap: vi.fn().mockResolvedValue({
      operationId: "op-1", state: "succeeded", resourceType: "payroll_run", pollAfterMs: null,
    }) });
  });
  afterEach(() => { vi.restoreAllMocks(); });

  it("coalesces a rapid duplicate command into one accepted operation and begins authoritative polling", async () => {
    let resolve!: (value: unknown) => void;
    const accepted = new Promise((done) => { resolve = done; });
    transport.run.mockReturnValue({ unwrap: () => accepted });
    const { result } = renderHook(() => usePayrollRunCommand(scope));

    let first!: Promise<unknown>;
    let second!: Promise<unknown>;
    act(() => {
      first = result.current.runCommand(command("intent-1"));
      second = result.current.runCommand(command("intent-1"));
    });
    expect(transport.run).toHaveBeenCalledOnce();
    expect(result.current.activeIntent).toBe("request_preview");

    await act(async () => {
      resolve({ operationId: "op-1", state: "accepted", resourceType: "payroll_run", pollAfterMs: 250 });
      await Promise.all([first, second]);
    });
    expect(transport.watch).toHaveBeenCalledOnce();
    expect(transport.watch.mock.calls[0][0]).toEqual(scope);
    expect(transport.watch.mock.calls[0][1]).toBe("op-1");
    expect(result.current.activeIntent).toBe("request_preview");
    act(() => { transport.watch.mock.calls[0][3]({ operationId: "op-1", state: "succeeded", resourceType: "payroll_run", pollAfterMs: null }); });
    expect(result.current.activeIntent).toBeNull();
  });

  it("requests one refresh only when an accepted operation later reaches terminal state", async () => {
    const frames = installFrameQueue();
    const onAsyncTerminal = vi.fn();
    transport.run.mockReturnValue({ unwrap: vi.fn().mockResolvedValue({
      operationId: "op-1", state: "accepted", resourceType: "payroll_run", pollAfterMs: 250,
    }) });
    const { result } = renderHook(() => usePayrollRunCommand(scope, onAsyncTerminal));

    await act(async () => { await result.current.runCommand(command("intent-1")); });
    expect(onAsyncTerminal).not.toHaveBeenCalled();
    act(() => {
      transport.watch.mock.calls[0][3]({
        operationId: "op-1", state: "succeeded", resourceType: "payroll_run", pollAfterMs: null,
      });
    });
    expect(onAsyncTerminal).not.toHaveBeenCalled();
    act(() => { frames.flush(); });
    expect(onAsyncTerminal).toHaveBeenCalledOnce();

    transport.run.mockReturnValue({ unwrap: vi.fn().mockResolvedValue({
      operationId: "op-2", state: "succeeded", resourceType: "payroll_run", pollAfterMs: null,
    }) });
    await act(async () => { await result.current.runCommand(command("intent-2")); });
    expect(onAsyncTerminal).toHaveBeenCalledOnce();
  });

  it("cancels a queued terminal refresh when the command scope changes before the next frame", async () => {
    const frames = installFrameQueue();
    const onAsyncTerminal = vi.fn();
    transport.run.mockReturnValue({ unwrap: vi.fn().mockResolvedValue({
      operationId: "op-1", state: "accepted", resourceType: "payroll_run", pollAfterMs: 250,
    }) });
    const { result, rerender } = renderHook(
      ({ agencyId }) => usePayrollRunCommand({ ...scope, agencyId }, onAsyncTerminal),
      { initialProps: { agencyId: "agency-1" } },
    );

    await act(async () => { await result.current.runCommand(command("intent-1")); });
    act(() => {
      transport.watch.mock.calls[0][3]({
        operationId: "op-1", state: "succeeded", resourceType: "payroll_run", pollAfterMs: null,
      });
    });
    rerender({ agencyId: "agency-2" });
    act(() => { frames.flush(); });
    expect(onAsyncTerminal).not.toHaveBeenCalled();
    expect(window.cancelAnimationFrame).toHaveBeenCalled();
  });

  it("maps typed stale errors without discarding safe UI state and permits a new-key retry", async () => {
    transport.run
      .mockReturnValueOnce({ unwrap: vi.fn().mockRejectedValue({ status: 409, data: { code: "PROJECTION_STALE" } }) })
      .mockReturnValueOnce({ unwrap: vi.fn().mockResolvedValue({
        operationId: "op-2", state: "accepted", resourceType: "payroll_run", pollAfterMs: 250,
      }) });
    const { result } = renderHook(() => usePayrollRunCommand(scope));

    await act(async () => {
      await expect(result.current.runCommand(command("intent-1"))).rejects.toMatchObject({
        code: "PROJECTION_STALE",
        refreshRequired: true,
      });
    });
    expect(result.current.error?.code).toBe("PROJECTION_STALE");
    expect(result.current.activeIntent).toBeNull();

    await act(async () => {
      await result.current.runCommand(command("intent-2"));
    });
    expect(transport.run).toHaveBeenCalledTimes(2);
    expect(transport.run.mock.calls[1][0].idempotencyKey).toBe("intent-2");
  });

  it("coalesces off-cycle submission separately from run commands", async () => {
    transport.offCycle.mockReturnValue({ unwrap: vi.fn().mockResolvedValue({
      operationId: "op-off", state: "accepted", resourceType: "payroll_run", pollAfterMs: 250,
    }) });
    const { result } = renderHook(() => usePayrollRunCommand(scope));
    const args = {
      ...scope,
      idempotencyKey: "off-cycle-intent",
      requestedPayday: "2026-09-04",
      obligations: [{ obligationId: "obligation-1", expectedVersion: 2 }],
    };

    await act(async () => {
      await Promise.all([result.current.createOffCycleRun(args), result.current.createOffCycleRun(args)]);
    });
    expect(transport.offCycle).toHaveBeenCalledOnce();
  });

  it("drops a late accepted operation after the agency scope changes", async () => {
    let resolve!: (value: unknown) => void;
    transport.run.mockReturnValue({ unwrap: () => new Promise((done) => { resolve = done; }) });
    const { result, rerender } = renderHook(({ agencyId }) => usePayrollRunCommand({ ...scope, agencyId }), { initialProps: { agencyId: "agency-1" } });
    let pending!: Promise<unknown>;
    act(() => { pending = result.current.runCommand(command("intent-old")); });
    rerender({ agencyId: "agency-2" });
    await act(async () => { resolve({ operationId: "op-old", state: "accepted", resourceType: "payroll_run", pollAfterMs: 250 }); await pending; });
    expect(transport.watch).not.toHaveBeenCalled();
    expect(result.current.activeIntent).toBeNull();
  });

  it("drops a late DDD operation and rejects DDD arguments after switching to HHA", async () => {
    let resolve!: (value: unknown) => void;
    transport.run.mockReturnValue({ unwrap: () => new Promise((done) => { resolve = done; }) });
    let mode: "ddd" | "hha" = "ddd";
    const { result, rerender } = renderHook(() => usePayrollRunCommand({ ...scope, mode }));
    let pending!: Promise<unknown>;
    act(() => { pending = result.current.runCommand(command("intent-old")); });

    mode = "hha";
    rerender();
    await act(async () => {
      resolve({ operationId: "op-old", state: "accepted", resourceType: "payroll_run", pollAfterMs: 250 });
      await pending;
    });
    expect(transport.watch).not.toHaveBeenCalled();

    await act(async () => {
      await expect(result.current.runCommand(command("intent-wrong-mode"))).rejects.toMatchObject({ code: "REQUEST_FAILED" });
    });
    expect(transport.run).toHaveBeenCalledOnce();
  });

  it("never renders command state retained by another mode during a cache-warm round trip", async () => {
    transport.run
      .mockReturnValueOnce({ unwrap: () => new Promise<never>(() => undefined) })
      .mockReturnValueOnce({ unwrap: vi.fn().mockRejectedValue({ status: 409, data: { code: "PROJECTION_STALE" } }) });
    let mode: "ddd" | "hha" = "ddd";
    const renders: Array<{ mode: "ddd" | "hha"; activeIntent: string | null; error: string | null }> = [];
    const { result, rerender } = renderHook(() => {
      const state = usePayrollRunCommand({ ...scope, mode });
      renders.push({ mode, activeIntent: state.activeIntent, error: state.error?.code ?? null });
      return state;
    });

    act(() => { void result.current.runCommand(command("intent-ddd")); });
    expect(result.current.activeIntent).toBe("request_preview");

    const hhaRenderStart = renders.length;
    mode = "hha";
    rerender();
    expect(renders.slice(hhaRenderStart)).toEqual(expect.arrayContaining([
      { mode: "hha", activeIntent: null, error: null },
    ]));
    expect(renders.slice(hhaRenderStart).every(({ activeIntent, error }) => activeIntent === null && error === null)).toBe(true);

    await act(async () => {
      await expect(result.current.runCommand({ ...command("intent-hha"), mode: "hha" })).rejects.toMatchObject({
        code: "PROJECTION_STALE",
      });
    });
    expect(result.current.error?.code).toBe("PROJECTION_STALE");

    const dddRenderStart = renders.length;
    mode = "ddd";
    rerender();
    expect(renders.slice(dddRenderStart).every(({ activeIntent, error }) => activeIntent === null && error === null)).toBe(true);
  });
});
