import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { agencyCareApi } from "@/lib/api/agencyCare";
import { useActiveConversation } from "./CareConversations";

vi.mock("@/lib/api/agencyCare", () => ({
  agencyCareApi: { messages: vi.fn() },
}));
vi.mock("./AgencyCareLayout", () => ({ useAgencyCare: vi.fn() }));
let visibility: "visible" | "hidden" = "visible";
const message = {
  id: "m1",
  sequence: 12,
  text: "Shared care response",
  senderUid: "partner",
  senderAgencyKey: "external:p",
  createdAt: "2026-10-07",
};
beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  visibility = "visible";
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => visibility,
  });
  vi.mocked(agencyCareApi.messages).mockResolvedValue({
    items: [message],
    nextCursor: null,
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

it("uses a five-second incremental foreground poll and aborts an in-flight request when hidden", async () => {
  const { result } = renderHook(() =>
    useActiveConversation("uid|agency|client", "conversation", "external:p"),
  );
  await flush();
  expect(result.current.items).toEqual([message]);
  vi.mocked(agencyCareApi.messages).mockImplementationOnce(
    () => new Promise(() => {}),
  );
  await act(async () => {
    await vi.advanceTimersByTimeAsync(5000);
  });
  expect(agencyCareApi.messages).toHaveBeenLastCalledWith(
    "conversation",
    expect.objectContaining({ afterSequence: 12, agencyKey: "external:p" }),
  );
  const signal = vi.mocked(agencyCareApi.messages).mock.calls.at(-1)![1]!
    .signal;
  visibility = "hidden";
  act(() => document.dispatchEvent(new Event("visibilitychange")));
  expect(signal?.aborted).toBe(true);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(10_000);
  });
  expect(agencyCareApi.messages).toHaveBeenCalledTimes(2);
});

it("starts no hidden request and clears the previous conversation before a scoped late response", async () => {
  visibility = "hidden";
  const { result, rerender } = renderHook(
    ({ id }) => useActiveConversation("uid|agency|client", id, "external:p"),
    { initialProps: { id: "first" } },
  );
  await flush();
  expect(agencyCareApi.messages).not.toHaveBeenCalled();
  let finish!: (value: { items: (typeof message)[]; nextCursor: null }) => void;
  vi.mocked(agencyCareApi.messages).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  visibility = "visible";
  act(() => document.dispatchEvent(new Event("visibilitychange")));
  rerender({ id: "second" });
  expect(result.current.items).toEqual([]);
  await flush();
  await act(async () =>
    finish({ items: [{ ...message, id: "late-first" }], nextCursor: null }),
  );
  expect(result.current.items).toEqual([message]);
});

it("loads the notification's historical message and resumes latest polling after leaving the anchor", async () => {
  const { result, rerender } = renderHook(
    ({ anchor }) =>
      useActiveConversation(
        "uid|agency|client",
        "conversation",
        "external:p",
        anchor,
      ),
    { initialProps: { anchor: "m1" } },
  );
  await flush();
  expect(agencyCareApi.messages).toHaveBeenLastCalledWith(
    "conversation",
    expect.objectContaining({ message: "m1", agencyKey: "external:p" }),
  );
  expect(result.current.history).toBe(true);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(15_000);
  });
  expect(agencyCareApi.messages).toHaveBeenCalledTimes(1);
  rerender({ anchor: "" });
  expect(result.current.items).toEqual([]);
  await flush();
  expect(result.current.history).toBe(false);
  expect(agencyCareApi.messages).toHaveBeenLastCalledWith(
    "conversation",
    expect.not.objectContaining({ message: "m1" }),
  );
});

it("clears content when the referenced message is no longer accessible", async () => {
  vi.mocked(agencyCareApi.messages).mockRejectedValueOnce({
    response: { status: 404 },
  });
  const { result } = renderHook(() =>
    useActiveConversation(
      "uid|agency|client",
      "conversation",
      "external:p",
      "removed",
    ),
  );
  await flush();
  expect(result.current.items).toEqual([]);
  expect(result.current.loading).toBe(false);
  expect(result.current.error).toBe(
    "This item is unavailable with your current access.",
  );
  expect(result.current.history).toBe(true);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(15_000);
  });
  expect(agencyCareApi.messages).toHaveBeenCalledTimes(1);
});

it("returns to the latest bounded window after a failed incremental poll", async () => {
  const { result } = renderHook(() =>
    useActiveConversation("uid|agency|client", "conversation", "external:p"),
  );
  await flush();
  vi.mocked(agencyCareApi.messages).mockRejectedValueOnce({
    response: { status: 503 },
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(5000);
  });
  expect(result.current.items).toEqual([]);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(5000);
  });
  expect(
    vi.mocked(agencyCareApi.messages).mock.calls.at(-1)![1],
  ).not.toHaveProperty("afterSequence");
  expect(result.current.items).toEqual([message]);
});
