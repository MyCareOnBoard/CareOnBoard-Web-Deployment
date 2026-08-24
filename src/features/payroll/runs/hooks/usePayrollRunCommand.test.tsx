import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

const scope = { audience: "agency" as const, actorUid: "actor-1", agencyId: "agency-1" };
const command = (idempotencyKey: string) => ({
  ...scope,
  runId: "run-1",
  command: "request_preview" as const,
  expectedProjectionRevision: 7,
  expectedActiveRevisionId: "revision-1",
  idempotencyKey,
});

describe("usePayrollRunCommand", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    transport.watch.mockReturnValue(vi.fn());
    transport.operation.mockReturnValue({ unwrap: vi.fn().mockResolvedValue({
      operationId: "op-1", state: "succeeded", resourceType: "payroll_run", pollAfterMs: null,
    }) });
  });

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
});
