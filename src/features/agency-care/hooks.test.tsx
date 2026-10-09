import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { hasCapability, useScopedRequest, useScopedMutation } from "./hooks";

const toast = vi.hoisted(() => vi.fn());
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast }) }));
beforeEach(() => toast.mockClear());

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

describe("Agency Care scoped access and requests", () => {
  it("keeps the same command identity when explicitly retrying an unknown save outcome", async () => {
    const ids: string[] = [];
    const { result } = renderHook(() =>
      useScopedMutation("user|agency|client"),
    );
    await act(async () => {
      await result.current.run(async (operationId) => {
        ids.push(operationId);
        throw new Error("Connection ended after send");
      });
    });
    expect(result.current.uncertain).toBe(true);
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: "warning",
        title: "Check the action's status",
      }),
    );
    act(() => result.current.reset());
    await act(async () => {
      await result.current.run(
        async (operationId) => {
          ids.push(operationId);
          return "receipt";
        },
        { title: "Saved" },
      );
    });
    expect(ids[1]).toBe(ids[0]);
    expect(toast).toHaveBeenLastCalledWith({
      title: "Saved",
      variant: "success",
    });
  });
  it("does not infer a capability from a role, a missing projection, or another capability", () => {
    expect(hasCapability(undefined, "review")).toBe(false);
    expect(hasCapability({ capabilities: ["view", "submit"] }, "review")).toBe(
      false,
    );
    expect(hasCapability({ capabilities: ["review"] }, "review")).toBe(true);
  });

  it("preserves an unknown command through rejected reconciliation attempts until confirmed", async () => {
    const ids: string[] = [];
    const { result } = renderHook(() =>
      useScopedMutation("user|agency|client"),
    );
    for (const status of [503, 401, 403, 409]) {
      await act(async () => {
        await result.current.run(async (operationId) => {
          ids.push(operationId);
          throw { response: { status } };
        });
      });
      expect(result.current.uncertain).toBe(true);
      act(() => result.current.reset());
      act(() => result.current.reset());
    }
    await act(async () => {
      expect(
        await result.current.run(async (operationId) => {
          ids.push(operationId);
          return "confirmed receipt";
        }),
      ).toBe("confirmed receipt");
    });
    expect(new Set(ids).size).toBe(1);
    expect(result.current.uncertain).toBe(false);
  });

  it("clears the previous client immediately and ignores a late response after a client switch", async () => {
    const first = deferred<string>();
    const second = deferred<string>();
    const signals: AbortSignal[] = [];
    const { result, rerender } = renderHook(
      ({ client }) =>
        useScopedRequest(client, (signal) => {
          signals.push(signal);
          return client === "john" ? first.promise : second.promise;
        }),
      { initialProps: { client: "john" } },
    );
    rerender({ client: "mary" });
    expect(signals[0].aborted).toBe(true);
    expect(result.current.data).toBeUndefined();
    await act(async () => {
      second.resolve("Mary authorized");
    });
    await waitFor(() => expect(result.current.data).toBe("Mary authorized"));
    await act(async () => {
      first.resolve("John private");
    });
    expect(result.current.data).toBe("Mary authorized");
  });

  it("clears private data after a denied refresh instead of showing stale authorized content", async () => {
    let denied = false;
    const { result } = renderHook(() =>
      useScopedRequest("john", async () => {
        if (denied) throw new Error("Access unavailable");
        return "private content";
      }),
    );
    await waitFor(() => expect(result.current.data).toBe("private content"));
    denied = true;
    act(() => result.current.reload());
    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.data).toBeUndefined();
  });

  it("suppresses a successful late mutation result after switching organization", async () => {
    const pending = deferred<string>();
    const onSaved = vi.fn();
    const { result, rerender } = renderHook(
      ({ scope }) => useScopedMutation(scope),
      { initialProps: { scope: "user|external:one|john" } },
    );
    let save!: Promise<string | undefined>;
    act(() => {
      save = result.current.run(
        async (_operationId, signal) => {
          expect(signal.aborted).toBe(false);
          return pending.promise;
        },
        { title: "Saved" },
      );
    });
    rerender({ scope: "user|external:two|mary" });
    await act(async () => {
      pending.resolve("saved");
      if (await save) onSaved();
    });
    expect(onSaved).not.toHaveBeenCalled();
    expect(result.current.saving).toBe(false);
    expect(toast).not.toHaveBeenCalled();
  });

  it("shows one success toast only after a confirmed action and ignores duplicate clicks", async () => {
    const pending = deferred<string>();
    const action = vi.fn(() => pending.promise);
    const { result } = renderHook(() =>
      useScopedMutation("user|agency|client"),
    );
    let saved!: Promise<string | undefined>;
    act(() => {
      saved = result.current.run(action, {
        title: "Invitation created",
        description: "Delivery is queued.",
      });
    });
    await act(async () => {
      expect(
        await result.current.run(action, { title: "Duplicate" }),
      ).toBeUndefined();
    });
    expect(toast).not.toHaveBeenCalled();
    expect(action).toHaveBeenCalledOnce();
    await act(async () => {
      pending.resolve("receipt");
      await saved;
    });
    expect(toast).toHaveBeenCalledExactlyOnceWith({
      title: "Invitation created",
      description: "Delivery is queued.",
      variant: "success",
    });
  });

  it("uses a destructive toast for a rejected action without exposing backend error details", async () => {
    const { result } = renderHook(() =>
      useScopedMutation("user|agency|client"),
    );
    await act(async () => {
      await result.current.run(
        async () => {
          throw {
            response: {
              status: 409,
              data: { error: "Private backend detail" },
            },
          };
        },
        { title: "Saved" },
      );
    });
    expect(result.current.uncertain).toBe(false);
    expect(toast).toHaveBeenCalledExactlyOnceWith({
      title: "Action could not be completed",
      description: "This record changed. Refresh it before trying again.",
      variant: "destructive",
    });
  });
});
