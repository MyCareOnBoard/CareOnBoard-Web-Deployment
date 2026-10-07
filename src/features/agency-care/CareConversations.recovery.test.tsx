import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  agencyCareApi,
  type CareMessage,
  type CarePage,
} from "@/lib/api/agencyCare";
import { useActiveConversation } from "./CareConversations";

vi.mock("@/lib/api/agencyCare", () => ({
  agencyCareApi: { messages: vi.fn() },
}));
vi.mock("./AgencyCareLayout", () => ({ useAgencyCare: vi.fn() }));

const latest: CareMessage = {
  id: "latest",
  sequence: 12,
  text: "Latest care response",
  senderUid: "partner",
  senderAgencyKey: "external:p",
  createdAt: "2026-10-07",
};
const earlier = { ...latest, id: "earlier", sequence: 8 };
let visibility: "visible" | "hidden" = "visible";

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  visibility = "visible";
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => visibility,
  });
  vi.mocked(agencyCareApi.messages).mockResolvedValue({
    items: [latest],
    nextCursor: "latest-cursor",
  });
});
afterEach(() => {
  vi.useRealTimers();
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    value: "visible",
  });
});
const flush = async () => {
  await act(async () => {
    await Promise.resolve();
  });
};
const changeVisibility = (value: typeof visibility) => {
  visibility = value;
  act(() => document.dispatchEvent(new Event("visibilitychange")));
};

it.each([false, true])(
  "restores the completed page after a hidden history request (already viewing history: %s)",
  async (alreadyHistory) => {
    const { result } = renderHook(() =>
      useActiveConversation("uid|agency|client", "conversation", "external:p"),
    );
    await flush();
    if (alreadyHistory) {
      vi.mocked(agencyCareApi.messages).mockResolvedValueOnce({
        items: [earlier],
        nextCursor: "earlier-cursor",
      });
      await act(async () => result.current.older());
    }
    const completedItems = alreadyHistory ? [earlier] : [latest];
    const completedCursor = alreadyHistory ? "earlier-cursor" : "latest-cursor";
    let finish!: (value: CarePage<CareMessage>) => void;
    vi.mocked(agencyCareApi.messages).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    act(() => void result.current.older());
    const signal = vi.mocked(agencyCareApi.messages).mock.calls.at(-1)![1]!
      .signal;
    expect(result.current.loading).toBe(true);

    changeVisibility("hidden");
    expect(signal?.aborted).toBe(true);
    expect(result.current.loading).toBe(false);
    expect(result.current.items).toEqual(completedItems);
    expect(result.current.cursor).toBe(completedCursor);
    expect(result.current.history).toBe(alreadyHistory);
    expect(result.current.error).toBeUndefined();

    const incoming = { ...latest, id: "incoming", sequence: 13 };
    vi.mocked(agencyCareApi.messages).mockResolvedValue({
      items: [incoming],
      nextCursor: null,
    });
    changeVisibility("visible");
    await flush();
    expect(result.current.items).toEqual(
      alreadyHistory ? [earlier] : [latest, incoming],
    );
    await act(async () => {
      finish({
        items: [{ ...latest, id: "cancelled", sequence: 2 }],
        nextCursor: null,
      });
    });
    expect(result.current.items).toEqual(
      alreadyHistory ? [earlier] : [latest, incoming],
    );
    expect(result.current.loading).toBe(false);
    expect(result.current.history).toBe(alreadyHistory);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(result.current.items).toEqual(
      alreadyHistory ? [earlier] : [latest, incoming],
    );
  },
);

it.each(["thread", "scope", "reload"] as const)(
  "does not restore or accept an old history request after %s changes",
  async (change) => {
    const { result, rerender } = renderHook(
      ({ scope, id }) => useActiveConversation(scope, id, "external:p"),
      { initialProps: { scope: "uid|agency|client", id: "first" } },
    );
    await flush();
    let finishOlder!: (value: CarePage<CareMessage>) => void;
    vi.mocked(agencyCareApi.messages).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishOlder = resolve;
        }),
    );
    act(() => void result.current.older());
    const signal = vi.mocked(agencyCareApi.messages).mock.calls.at(-1)![1]!
      .signal;
    let finishLatest!: (value: CarePage<CareMessage>) => void;
    vi.mocked(agencyCareApi.messages).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishLatest = resolve;
        }),
    );
    if (change === "reload") act(() => result.current.reload());
    else
      rerender({
        scope: change === "scope" ? "uid|new-agency|client" : "uid|agency|client",
        id: change === "thread" ? "second" : "first",
      });
    expect(signal?.aborted).toBe(true);
    expect(result.current.items).toEqual([]);
    expect(result.current.loading).toBe(true);
    expect(result.current.history).toBe(false);
    await act(async () => {
      finishOlder({ items: [earlier], nextCursor: "old-cursor" });
    });
    expect(result.current.items).toEqual([]);
    expect(result.current.loading).toBe(true);
    const current = { ...latest, id: "current" };
    await act(async () => {
      finishLatest({ items: [current], nextCursor: null });
    });
    expect(result.current.items).toEqual([current]);
    expect(result.current.loading).toBe(false);
    expect(result.current.history).toBe(false);
  },
);
