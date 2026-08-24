import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authUser: {
    uid: "user-a",
    userType: "super_admin",
    profile: {
      accessList: ["Corporate Support"],
      agencyScope: "all",
      agencyIds: ["agency-a", "agency-b"],
    },
  } as any,
  getDocs: vi.fn(),
  subscriptions: [] as Array<{
    next: (snapshot: any) => void;
    error: (error: Error) => void;
  }>,
}));

vi.mock("@/utils/auth", () => ({
  useAuth: () => ({ user: mocks.authUser }),
}));

vi.mock("../firebase-firestore", () => ({
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
    getDocs: mocks.getDocs,
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

import {
  useConversation,
  useConversationMessages,
  useConversations,
} from "./useMessaging";

function authUser(
  agencyScope: "all" | "selected",
  agencyIds: string[],
) {
  return {
    uid: "user-a",
    userType: "super_admin",
    profile: {
      accessList: ["Corporate Support"],
      agencyScope,
      agencyIds,
    },
  };
}

function conversationDoc(id: string, ownerUid: string) {
  return {
    id,
    data: () => ({
      participantIds: [ownerUid],
      unreadCount: { [ownerUid]: 1 },
      createdAt: "2026-07-26T00:00:00.000Z",
      updatedAt: "2026-07-26T00:00:00.000Z",
    }),
  };
}

function conversationSnapshot(id: string | string[], ownerUid: string) {
  return {
    docs: (Array.isArray(id) ? id : [id]).map((conversationId) =>
      conversationDoc(conversationId, ownerUid)),
  };
}

function conversationDetailSnapshot(id: string, ownerUid: string) {
  const document = conversationDoc(id, ownerUid);
  return {
    id,
    exists: () => true,
    data: document.data,
  };
}

function messageSnapshot(id: string | string[], ownerUid: string) {
  return {
    docs: (Array.isArray(id) ? id : [id]).map((messageId) => ({
      id: messageId,
      data: () => ({
        conversationId: "conversation-a",
        participantIds: [ownerUid],
        senderId: "other-user",
        content: messageId,
        readBy: {},
        createdAt: "2026-07-26T00:00:00.000Z",
        updatedAt: "2026-07-26T00:00:00.000Z",
      }),
    })),
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

describe("useConversations auth scope", () => {
  beforeEach(() => {
    mocks.authUser = authUser("all", ["agency-a", "agency-b"]);
    mocks.getDocs.mockReset();
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

    mocks.authUser = { ...authUser("all", []), uid: "user-b" };
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

    mocks.authUser = { ...authUser("all", []), uid: "user-b" };
    rerender();

    act(() => {
      mocks.subscriptions[1].error(new Error("User B subscription failed"));
    });

    expect(result.current.conversations).toEqual([]);
    expect(result.current.hasMore).toBe(false);
    expect(result.current.error?.message).toBe("User B subscription failed");
  });

  it("masks the loaded list when the same UID narrows from all agencies to agency A", () => {
    const { result, rerender } = renderHook(() =>
      useConversations({ limit: 50 }));

    act(() => {
      mocks.subscriptions[0].next(conversationSnapshot(
        "all-agencies-conversation",
        "user-a",
      ));
    });
    expect(result.current.conversations).toHaveLength(1);

    mocks.authUser = authUser("selected", ["agency-a"]);
    rerender();

    expect(result.current.conversations).toEqual([]);
    expect(result.current.loading).toBe(true);
    expect(mocks.subscriptions).toHaveLength(2);

    act(() => {
      mocks.subscriptions[0].next(conversationSnapshot(
        "stale-all-agencies-conversation",
        "user-a",
      ));
    });
    expect(result.current.conversations).toEqual([]);

    act(() => {
      mocks.subscriptions[1].next(conversationSnapshot(
        "agency-a-conversation",
        "user-a",
      ));
    });
    expect(result.current.conversations.map(({ id }) => id)).toEqual([
      "agency-a-conversation",
    ]);
  });

  it("preserves the loaded tail and deduplicates continuation rows across first-window snapshots", async () => {
    mocks.getDocs.mockResolvedValue(conversationSnapshot(
      ["window-boundary", "tail-conversation"],
      "user-a",
    ));
    const { result } = renderHook(() => useConversations({ limit: 2 }));

    act(() => {
      mocks.subscriptions[0].next(conversationSnapshot(
        ["head-conversation", "window-boundary"],
        "user-a",
      ));
    });
    await act(async () => {
      await result.current.loadMore();
    });
    expect(result.current.conversations.map(({ id }) => id)).toEqual([
      "head-conversation",
      "window-boundary",
      "tail-conversation",
    ]);

    act(() => {
      mocks.subscriptions[0].next(conversationSnapshot(
        ["fresh-conversation", "head-conversation"],
        "user-a",
      ));
    });
    expect(result.current.conversations.map(({ id }) => id)).toEqual([
      "fresh-conversation",
      "head-conversation",
      "tail-conversation",
    ]);
  });

  it("preserves a loaded tail row after live promotion and later eviction", async () => {
    mocks.getDocs.mockResolvedValue(conversationSnapshot(
      ["tail-c", "tail-d"],
      "user-a",
    ));
    const { result } = renderHook(() => useConversations({ limit: 2 }));

    act(() => {
      mocks.subscriptions[0].next(conversationSnapshot(
        ["live-a", "live-b"],
        "user-a",
      ));
    });
    await act(async () => {
      await result.current.loadMore();
    });

    act(() => {
      mocks.subscriptions[0].next(conversationSnapshot(
        ["tail-c", "live-a"],
        "user-a",
      ));
    });
    expect(result.current.conversations.map(({ id }) => id)).toEqual([
      "tail-c",
      "live-a",
      "tail-d",
    ]);

    act(() => {
      mocks.subscriptions[0].next(conversationSnapshot(
        ["live-e", "live-a"],
        "user-a",
      ));
    });
    expect(result.current.conversations.map(({ id }) => id)).toEqual([
      "live-e",
      "live-a",
      "tail-c",
      "tail-d",
    ]);
  });

  it("allows only one continuation request while a page is in flight", async () => {
    const page = deferred<any>();
    mocks.getDocs.mockReturnValue(page.promise);
    const { result } = renderHook(() => useConversations({ limit: 2 }));

    act(() => {
      mocks.subscriptions[0].next(conversationSnapshot(
        ["head-conversation", "window-boundary"],
        "user-a",
      ));
    });

    let firstLoad!: Promise<void>;
    let secondLoad!: Promise<void>;
    act(() => {
      firstLoad = result.current.loadMore();
      secondLoad = result.current.loadMore();
    });
    expect(mocks.getDocs).toHaveBeenCalledTimes(1);

    await act(async () => {
      page.resolve(conversationSnapshot(["tail-a", "tail-b"], "user-a"));
      await Promise.all([firstLoad, secondLoad]);
    });
  });

  it("rejects a stale continuation result after a same-UID scope change", async () => {
    const oldScopePage = deferred<any>();
    mocks.getDocs.mockReturnValue(oldScopePage.promise);
    const { result, rerender } = renderHook(() =>
      useConversations({ limit: 2 }));

    act(() => {
      mocks.subscriptions[0].next(conversationSnapshot(
        ["all-head", "all-boundary"],
        "user-a",
      ));
    });
    let load!: Promise<void>;
    act(() => {
      load = result.current.loadMore();
    });

    mocks.authUser = authUser("selected", ["agency-b"]);
    rerender();
    expect(result.current.conversations).toEqual([]);

    await act(async () => {
      oldScopePage.resolve(conversationSnapshot(
        ["stale-tail-a", "stale-tail-b"],
        "user-a",
      ));
      await load;
    });
    expect(result.current.conversations).toEqual([]);

    act(() => {
      mocks.subscriptions[1].next(conversationSnapshot(
        "agency-b-conversation",
        "user-a",
      ));
    });
    expect(result.current.conversations.map(({ id }) => id)).toEqual([
      "agency-b-conversation",
    ]);
  });

  it("exposes a continuation failure while preserving the loaded window", async () => {
    mocks.getDocs.mockRejectedValue(new Error("Continuation failed"));
    const { result } = renderHook(() => useConversations({ limit: 2 }));

    act(() => {
      mocks.subscriptions[0].next(conversationSnapshot(
        ["head-conversation", "window-boundary"],
        "user-a",
      ));
    });
    await act(async () => {
      await expect(result.current.loadMore()).rejects.toThrow(
        "Continuation failed",
      );
    });

    expect(result.current.conversations.map(({ id }) => id)).toEqual([
      "head-conversation",
      "window-boundary",
    ]);
    expect(result.current.error?.message).toBe("Continuation failed");
  });

  it("does not let a pending page repopulate after the listener fails", async () => {
    const page = deferred<any>();
    mocks.getDocs.mockReturnValue(page.promise);
    const { result } = renderHook(() => useConversations({ limit: 2 }));

    act(() => {
      mocks.subscriptions[0].next(conversationSnapshot(
        ["live-a", "live-b"],
        "user-a",
      ));
    });
    let load!: Promise<void>;
    act(() => {
      load = result.current.loadMore();
    });
    act(() => {
      mocks.subscriptions[0].error(new Error("Conversation listener failed"));
    });
    expect(result.current.conversations).toEqual([]);
    expect(result.current.error?.message).toBe("Conversation listener failed");

    await act(async () => {
      page.resolve(conversationSnapshot(["stale-c", "stale-d"], "user-a"));
      await load;
    });
    expect(result.current.conversations).toEqual([]);
    expect(result.current.error?.message).toBe("Conversation listener failed");
  });
});

describe("selected Firestore messaging auth scope", () => {
  beforeEach(() => {
    mocks.authUser = authUser("all", ["agency-a", "agency-b"]);
    mocks.getDocs.mockReset();
    mocks.subscriptions.length = 0;
  });

  it("masks selected conversation detail and rejects the old-scope callback", () => {
    const { result, rerender } = renderHook(() =>
      useConversation("conversation-a"));

    act(() => {
      mocks.subscriptions[0].next(conversationDetailSnapshot(
        "all-scope-detail",
        "user-a",
      ));
    });
    expect(result.current.conversation?.id).toBe("all-scope-detail");

    mocks.authUser = authUser("selected", ["agency-a"]);
    rerender();
    expect(result.current.conversation).toBeNull();
    expect(result.current.loading).toBe(true);

    act(() => {
      mocks.subscriptions[0].next(conversationDetailSnapshot(
        "stale-all-scope-detail",
        "user-a",
      ));
    });
    expect(result.current.conversation).toBeNull();

    act(() => {
      mocks.subscriptions[1].next(conversationDetailSnapshot(
        "agency-a-detail",
        "user-a",
      ));
    });
    expect(result.current.conversation?.id).toBe("agency-a-detail");
  });

  it("masks selected messages and rejects the old-scope callback", () => {
    const { result, rerender } = renderHook(() =>
      useConversationMessages("conversation-a"));

    act(() => {
      mocks.subscriptions[0].next(messageSnapshot(
        "all-scope-message",
        "user-a",
      ));
    });
    expect(result.current.messages.map(({ id }) => id)).toEqual([
      "all-scope-message",
    ]);

    mocks.authUser = authUser("selected", ["agency-b"]);
    rerender();
    expect(result.current.messages).toEqual([]);
    expect(result.current.loading).toBe(true);

    act(() => {
      mocks.subscriptions[0].next(messageSnapshot(
        "stale-all-scope-message",
        "user-a",
      ));
    });
    expect(result.current.messages).toEqual([]);

    act(() => {
      mocks.subscriptions[1].next(messageSnapshot(
        "agency-b-message",
        "user-a",
      ));
    });
    expect(result.current.messages.map(({ id }) => id)).toEqual([
      "agency-b-message",
    ]);
  });

  it("does not let a pending message page repopulate after the listener fails", async () => {
    const page = deferred<any>();
    mocks.getDocs.mockReturnValue(page.promise);
    const { result } = renderHook(() =>
      useConversationMessages("conversation-a", { limit: 1 }));

    act(() => {
      mocks.subscriptions[0].next(messageSnapshot("live-message", "user-a"));
    });
    let load!: Promise<void>;
    act(() => {
      load = result.current.loadMore();
    });
    act(() => {
      mocks.subscriptions[0].error(new Error("Message listener failed"));
    });
    expect(result.current.messages).toEqual([]);
    expect(result.current.error?.message).toBe("Message listener failed");

    await act(async () => {
      page.resolve(messageSnapshot("stale-message", "user-a"));
      await load;
    });
    expect(result.current.messages).toEqual([]);
    expect(result.current.error?.message).toBe("Message listener failed");
  });
});
