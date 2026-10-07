import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { hasCapability, useScopedRequest, useScopedMutation } from "./hooks";

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
    act(() => result.current.reset());
    await act(async () => {
      await result.current.run(async (operationId) => {
        ids.push(operationId);
        return "receipt";
      });
    });
    expect(ids[1]).toBe(ids[0]);
  });
  it("does not infer a capability from a role, a missing projection, or another capability", () => {
    expect(hasCapability(undefined, "review")).toBe(false);
    expect(hasCapability({ capabilities: ["view", "submit"] }, "review")).toBe(
      false,
    );
    expect(hasCapability({ capabilities: ["review"] }, "review")).toBe(true);
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
      save = result.current.run(async (_operationId, signal) => {
        expect(signal.aborted).toBe(false);
        return pending.promise;
      });
    });
    rerender({ scope: "user|external:two|mary" });
    await act(async () => {
      pending.resolve("saved");
      if (await save) onSaved();
    });
    expect(onSaved).not.toHaveBeenCalled();
    expect(result.current.saving).toBe(false);
  });
});
