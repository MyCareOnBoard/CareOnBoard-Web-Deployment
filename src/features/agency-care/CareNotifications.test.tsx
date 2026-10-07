import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { agencyCareApi } from "@/lib/api/agencyCare";
import {
  careNotificationDestination,
  useCareNotificationPoll,
} from "./CareNotifications";

vi.mock("@/lib/api/agencyCare", () => ({
  agencyCareApi: { notifications: vi.fn(), readNotification: vi.fn() },
}));
const row = {
  id: "notice",
  title: "Review requested",
  message: "Care item available",
  status: "unread" as const,
  priority: "normal" as const,
  createdAt: "2026-10-07",
};
let visibility: "visible" | "hidden" = "visible";
beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  visibility = "visible";
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => visibility,
  });
  vi.mocked(agencyCareApi.notifications).mockResolvedValue({
    notifications: [row],
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

it("polls once per fifteen seconds only while foreground and clears content on an access denial", async () => {
  const { result } = renderHook(() =>
    useCareNotificationPoll("uid|external:a|1", "external:a"),
  );
  await flush();
  expect(result.current.items).toEqual([row]);
  expect(agencyCareApi.notifications).toHaveBeenCalledWith(
    expect.objectContaining({
      agencyKey: "external:a",
      signal: expect.any(AbortSignal),
    }),
  );
  await act(async () => {
    await vi.advanceTimersByTimeAsync(15_000);
  });
  expect(agencyCareApi.notifications).toHaveBeenCalledTimes(2);
  visibility = "hidden";
  act(() => document.dispatchEvent(new Event("visibilitychange")));
  await act(async () => {
    await vi.advanceTimersByTimeAsync(30_000);
  });
  expect(agencyCareApi.notifications).toHaveBeenCalledTimes(2);
  vi.mocked(agencyCareApi.notifications).mockRejectedValue({
    response: { status: 403 },
  });
  visibility = "visible";
  act(() => document.dispatchEvent(new Event("visibilitychange")));
  await flush();
  expect(result.current.items).toEqual([]);
  expect(result.current.error).toBe(
    "This item is unavailable with your current access.",
  );
});

it("aborts an old organization and rejects its late notification response", async () => {
  let finish!: (value: { notifications: (typeof row)[] }) => void;
  vi.mocked(agencyCareApi.notifications).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const { result, rerender } = renderHook(
    ({ agency }) => useCareNotificationPoll(`uid|${agency}|1`, agency),
    { initialProps: { agency: "external:a" } },
  );
  const oldSignal = vi.mocked(agencyCareApi.notifications).mock.calls[0][0]
    .signal;
  rerender({ agency: "external:b" });
  expect(result.current.items).toEqual([]);
  expect(oldSignal?.aborted).toBe(true);
  await flush();
  await act(async () =>
    finish({ notifications: [{ ...row, id: "old-organization" }] }),
  );
  expect(result.current.items).toEqual([row]);
});

it("uses only care destinations and never redeems an invitation from a notification URL", () => {
  expect(
    careNotificationDestination(
      "/agency-care/networks/n/documents?submission=s",
    ),
  ).toBe("/agency-care/networks/n/documents?submission=s");
  for (const url of [
    "https://other.example/private",
    "//other.example",
    "/employeePortal/private",
    "/agency-care/invitations/token",
    "/agency-care/\\other.example",
  ])
    expect(careNotificationDestination(url)).toBeNull();
});
