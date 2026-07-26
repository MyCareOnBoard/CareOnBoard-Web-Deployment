import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authUser: { uid: "user-a" } as any,
  subscriptions: [] as Array<{
    next: (snapshot: any) => void;
    error: (error: Error) => void;
  }>,
}));

vi.mock("@/utils/auth", () => ({
  useAuth: () => ({ user: mocks.authUser }),
}));

vi.mock("../firebase", () => ({
  db: {},
}));

vi.mock("firebase/firestore", () => {
  class Timestamp {
    toDate() {
      return new Date(0);
    }
  }

  return {
    Timestamp,
    collection: vi.fn(() => ({})),
    query: vi.fn((...parts: unknown[]) => parts),
    where: vi.fn(() => ({})),
    orderBy: vi.fn(() => ({})),
    limit: vi.fn(() => ({})),
    startAfter: vi.fn(() => ({})),
    doc: vi.fn(() => ({})),
    getDocs: vi.fn(),
    onSnapshot: vi.fn((
      _query: unknown,
      _options: unknown,
      next: (snapshot: any) => void,
      error: (caught: Error) => void,
    ) => {
      mocks.subscriptions.push({ next, error });
      return vi.fn();
    }),
  };
});

import { useConversations } from "./useMessaging";

function conversationSnapshot(id: string, ownerUid: string) {
  return {
    docs: [{
      id,
      data: () => ({
        participantIds: [ownerUid],
        unreadCount: { [ownerUid]: 1 },
        createdAt: "2026-07-26T00:00:00.000Z",
        updatedAt: "2026-07-26T00:00:00.000Z",
      }),
    }],
  };
}

describe("useConversations auth scope", () => {
  beforeEach(() => {
    mocks.authUser = { uid: "user-a" };
    mocks.subscriptions.length = 0;
  });

  it("hides user A conversations synchronously when auth changes to user B", () => {
    const { result, rerender } = renderHook(() =>
      useConversations({ limit: 50 }));

    act(() => {
      mocks.subscriptions[0].next(conversationSnapshot(
        "user-a-conversation",
        "user-a",
      ));
    });
    expect(result.current.conversations.map(({ id }) => id)).toEqual([
      "user-a-conversation",
    ]);

    mocks.authUser = { uid: "user-b" };
    rerender();

    expect(result.current.conversations).toEqual([]);
    expect(result.current.loading).toBe(true);

    act(() => {
      mocks.subscriptions[0].next(conversationSnapshot(
        "stale-user-a-conversation",
        "user-a",
      ));
    });
    expect(result.current.conversations).toEqual([]);

    act(() => {
      mocks.subscriptions[1].next(conversationSnapshot(
        "user-b-conversation",
        "user-b",
      ));
    });
    expect(result.current.conversations.map(({ id }) => id)).toEqual([
      "user-b-conversation",
    ]);
  });

  it("does not re-expose user A conversations when user B's snapshot fails", () => {
    const { result, rerender } = renderHook(() =>
      useConversations({ limit: 50 }));

    act(() => {
      mocks.subscriptions[0].next(conversationSnapshot(
        "user-a-conversation",
        "user-a",
      ));
    });
    expect(result.current.conversations).toHaveLength(1);

    mocks.authUser = { uid: "user-b" };
    rerender();

    act(() => {
      mocks.subscriptions[1].error(new Error("User B subscription failed"));
    });

    expect(result.current.conversations).toEqual([]);
    expect(result.current.hasMore).toBe(false);
    expect(result.current.error?.message).toBe("User B subscription failed");
  });
});
