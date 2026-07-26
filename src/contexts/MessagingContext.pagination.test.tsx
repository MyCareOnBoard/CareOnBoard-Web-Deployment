import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authUser: {
    uid: "super-1",
    userType: "super_admin",
    profile: { accessList: ["Corporate Support"] },
  } as any,
  baseConversationData: {
    success: true,
    conversations: [],
    count: 0,
    pagination: {
      limit: 50,
      count: 0,
      scanned: 200,
      hasMore: true,
      nextCursor: "conversation-cursor-200",
    },
  } as any,
  refetchConversations: vi.fn(),
  triggerConversations: vi.fn(),
  triggerContacts: vi.fn(),
  toast: vi.fn(),
  getConversations: vi.fn(),
  firestoreConversations: [] as any[],
  firestoreHasMore: false,
  firestoreLoadMore: vi.fn(),
  changedScopeDataReady: true,
}));

vi.mock("@/utils/auth", () => ({
  useAuth: () => ({ user: mocks.authUser }),
}));
vi.mock("@/lib/hooks/useMessaging", () => ({
  useConversations: () => ({
    conversations: mocks.firestoreConversations,
    loading: false,
    error: null,
    hasMore: mocks.firestoreHasMore,
    loadMore: mocks.firestoreLoadMore,
  }),
  useConversation: () => ({ conversation: null, loading: false, error: null }),
  useConversationMessages: () => ({ messages: [], loading: false, error: null }),
}));
vi.mock("@/lib/hooks/usePresence", () => ({
  usePresenceManager: vi.fn(),
  useMultiplePresence: () => ({ presenceMap: {} }),
}));
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mocks.toast }),
}));
vi.mock("@/lib/api/userMessaging", () => ({
  useGetContactsQuery: () => ({ data: { data: [] }, refetch: vi.fn() }),
  useLazyGetContactsQuery: () => [mocks.triggerContacts],
  useLazyGetConversationsQuery: () => [mocks.triggerConversations],
  useCreateConversationMutation: () => [vi.fn()],
  useSendMessageMutation: () => [vi.fn()],
  useMarkMessagesAsReadMutation: () => [vi.fn()],
  useLeaveConversationMutation: () => [vi.fn()],
  useGetConversationsQuery: mocks.getConversations,
  useGetConversationByIdQuery: () => ({
    data: undefined,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useGetMessagesQuery: () => ({
    data: undefined,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

import { MessagingProvider, useMessaging } from "./MessagingContext";

function conversation(id: string, unreadCount = 0) {
  return {
    id,
    type: "direct" as const,
    participantIds: ["super-1", "employee-a"],
    participants: [],
    unreadCount,
    createdAt: "2026-07-26T00:00:00.000Z",
    updatedAt: "2026-07-26T00:00:00.000Z",
    createdBy: "super-1",
  };
}

function triggerResult<T>(data: T) {
  return {
    unwrap: vi.fn().mockResolvedValue(data),
    unsubscribe: vi.fn(),
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

function PaginationProbe() {
  const messaging = useMessaging() as any;
  return (
    <>
      <div data-testid="conversation-ids">
        {messaging.conversations.map(({ id }: { id: string }) => id).join(",")}
      </div>
      <div data-testid="conversation-cursor">
        {messaging.conversationPagination?.nextCursor || "none"}
      </div>
      <div data-testid="contact-ids">
        {(messaging.contacts || []).map(({ uid }: { uid: string }) => uid).join(",")}
      </div>
      <div data-testid="contact-cursor">
        {messaging.contactPagination?.nextCursor || "none"}
      </div>
      <div data-testid="conversation-loading-more">
        {messaging.conversationPagination?.isLoadingMore ? "loading" : "idle"}
      </div>
      <div data-testid="messaging-error">
        {messaging.error?.message || "none"}
      </div>
      <button onClick={() => void messaging.loadMoreConversations()}>
        More conversations
      </button>
      <button onClick={() => void messaging.getContacts({ search: "Late" })}>
        Search contacts
      </button>
      <button onClick={() => void messaging.loadMoreContacts()}>
        More contacts
      </button>
      <button onClick={() => messaging.setConversationQuery({
        search: "Changed",
        scopeKey: "staff-scope",
      })}>
        Change conversation scope
      </button>
    </>
  );
}

describe("MessagingProvider cursor continuation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authUser = {
      uid: "super-1",
      userType: "super_admin",
      profile: { accessList: ["Corporate Support"] },
    };
    mocks.firestoreConversations = [];
    mocks.firestoreHasMore = false;
    mocks.changedScopeDataReady = true;
    mocks.baseConversationData = {
      success: true,
      conversations: [conversation("initial-conversation")],
      count: 1,
      pagination: {
        limit: 50,
        count: 0,
        scanned: 200,
        hasMore: true,
        nextCursor: "conversation-cursor-200",
      },
    };
    mocks.getConversations.mockImplementation((params: any) => ({
      data: mocks.baseConversationData,
      currentData: params.search === "Changed" && !mocks.changedScopeDataReady
        ? undefined
        : mocks.baseConversationData,
      isLoading: false,
      error: null,
      refetch: mocks.refetchConversations,
    }));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("loads a match after a 200-row scan and polling preserves the loaded cursor", async () => {
    vi.useFakeTimers();
    mocks.triggerConversations.mockReturnValue(triggerResult({
      success: true,
      conversations: [
        conversation("late-conversation"),
        conversation("late-conversation", 2),
      ],
      count: 2,
      pagination: {
        limit: 50,
        count: 1,
        scanned: 150,
        hasMore: true,
        nextCursor: "conversation-cursor-350",
      },
    }));
    mocks.refetchConversations.mockResolvedValue({
      data: {
        success: true,
        conversations: [conversation("fresh-conversation", 2)],
        count: 1,
        pagination: {
          limit: 50,
          count: 1,
          scanned: 200,
          hasMore: true,
          nextCursor: "new-first-window-cursor",
        },
      },
    });

    render(<MessagingProvider><PaginationProbe /></MessagingProvider>);

    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByTestId("conversation-cursor")).toHaveTextContent(
      "conversation-cursor-200",
    );
    await act(async () => {
      const loadMore = screen.getByRole("button", { name: "More conversations" });
      fireEvent.click(loadMore);
      fireEvent.click(loadMore);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByTestId("conversation-ids")).toHaveTextContent(
      /^initial-conversation,late-conversation$/,
    );
    expect(mocks.triggerConversations).toHaveBeenCalledWith({
      cursor: "conversation-cursor-200",
      limit: 50,
      scopeKey: expect.stringContaining("super-1"),
    }, false);

    await act(async () => {
      vi.advanceTimersByTime(15_000);
      await Promise.resolve();
    });

    expect(screen.getByTestId("conversation-ids")).toHaveTextContent(
      "fresh-conversation,initial-conversation,late-conversation",
    );
    expect(screen.getByTestId("conversation-cursor")).toHaveTextContent(
      "conversation-cursor-350",
    );
    expect(mocks.triggerConversations).toHaveBeenCalledTimes(1);
  });

  it("continues a sparse contact search with its current cursor", async () => {
    mocks.triggerContacts
      .mockReturnValueOnce(triggerResult({
        success: true,
        data: [],
        count: 0,
        pagination: {
          limit: 50,
          count: 0,
          scanned: 200,
          hasMore: true,
          nextCursor: "contact-cursor-200",
        },
      }))
      .mockReturnValueOnce(triggerResult({
        success: true,
        data: [{
          id: "late-contact",
          uid: "late-contact",
          name: "Late Contact",
          email: "late@example.test",
          role: "Agency Staff",
          isActive: true,
        }],
        count: 1,
        pagination: {
          limit: 50,
          count: 1,
          scanned: 75,
          hasMore: false,
          nextCursor: null,
        },
      }));

    render(<MessagingProvider><PaginationProbe /></MessagingProvider>);

    fireEvent.click(screen.getByRole("button", { name: "Search contacts" }));
    await waitFor(() => {
      expect(screen.getByTestId("contact-cursor")).toHaveTextContent(
        "contact-cursor-200",
      );
    });
    fireEvent.click(screen.getByRole("button", { name: "More contacts" }));
    await waitFor(() => {
      expect(screen.getByTestId("contact-ids")).toHaveTextContent("late-contact");
    });

    expect(mocks.triggerContacts).toHaveBeenNthCalledWith(1, {
      limit: 50,
      scopeKey: expect.stringContaining("super-1"),
      search: "Late",
    }, false);
    expect(mocks.triggerContacts).toHaveBeenNthCalledWith(2, {
      cursor: "contact-cursor-200",
      limit: 50,
      scopeKey: expect.stringContaining("super-1"),
      search: "Late",
    }, false);
  });

  it("resets conversation data and cursors when search or UI scope changes", async () => {
    const view = render(
      <MessagingProvider><PaginationProbe /></MessagingProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("conversation-cursor")).toHaveTextContent(
        "conversation-cursor-200",
      );
    });
    mocks.baseConversationData = {
      success: true,
      conversations: [conversation("changed-scope-conversation")],
      count: 1,
      pagination: {
        limit: 50,
        count: 1,
        scanned: 40,
        hasMore: true,
        nextCursor: "changed-scope-cursor",
      },
    };
    mocks.changedScopeDataReady = false;

    fireEvent.click(screen.getByRole("button", {
      name: "Change conversation scope",
    }));

    expect(screen.getByTestId("conversation-ids")).toBeEmptyDOMElement();
    expect(screen.getByTestId("conversation-cursor")).toHaveTextContent("none");

    mocks.changedScopeDataReady = true;
    view.rerender(<MessagingProvider><PaginationProbe /></MessagingProvider>);

    await waitFor(() => {
      expect(screen.getByTestId("conversation-ids")).toHaveTextContent(
        /^changed-scope-conversation$/,
      );
      expect(screen.getByTestId("conversation-cursor")).toHaveTextContent(
        "changed-scope-cursor",
      );
    });
    expect(mocks.getConversations).toHaveBeenLastCalledWith(
      expect.objectContaining({
        limit: 50,
        search: "Changed",
        scopeKey: expect.stringContaining("staff-scope"),
      }),
      { skip: false },
    );
  });

  it("does not let an old-scope request unlock or overwrite a newer load", async () => {
    const oldScopeLoad = deferred<any>();
    const newScopeLoad = deferred<any>();
    mocks.triggerConversations
      .mockReturnValueOnce({
        unwrap: () => oldScopeLoad.promise,
        unsubscribe: vi.fn(),
      })
      .mockReturnValueOnce({
        unwrap: () => newScopeLoad.promise,
        unsubscribe: vi.fn(),
      });

    render(<MessagingProvider><PaginationProbe /></MessagingProvider>);
    await waitFor(() => {
      expect(screen.getByTestId("conversation-cursor")).toHaveTextContent(
        "conversation-cursor-200",
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "More conversations" }));
    expect(screen.getByTestId("conversation-loading-more")).toHaveTextContent(
      "loading",
    );

    mocks.baseConversationData = {
      success: true,
      conversations: [conversation("changed-scope-conversation")],
      count: 1,
      pagination: {
        limit: 50,
        count: 1,
        scanned: 50,
        hasMore: true,
        nextCursor: "changed-scope-cursor",
      },
    };
    fireEvent.click(screen.getByRole("button", {
      name: "Change conversation scope",
    }));
    await waitFor(() => {
      expect(screen.getByTestId("conversation-cursor")).toHaveTextContent(
        "changed-scope-cursor",
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "More conversations" }));
    expect(mocks.triggerConversations).toHaveBeenCalledTimes(2);

    await act(async () => {
      oldScopeLoad.resolve({
        success: true,
        conversations: [conversation("stale-old-scope-conversation")],
        pagination: { hasMore: false, nextCursor: null },
      });
      await oldScopeLoad.promise;
    });

    expect(screen.getByTestId("conversation-loading-more")).toHaveTextContent(
      "loading",
    );
    fireEvent.click(screen.getByRole("button", { name: "More conversations" }));
    expect(mocks.triggerConversations).toHaveBeenCalledTimes(2);

    await act(async () => {
      newScopeLoad.resolve({
        success: true,
        conversations: [conversation("new-scope-late-conversation")],
        pagination: { hasMore: false, nextCursor: null },
      });
      await newScopeLoad.promise;
    });
    expect(screen.getByTestId("conversation-ids")).toHaveTextContent(
      /^changed-scope-conversation,new-scope-late-conversation$/,
    );
  });

  it("surfaces non-super-admin continuation failures", async () => {
    mocks.authUser = {
      uid: "staff-1",
      userType: "agency_staff",
      agencyId: "agency-1",
      profile: { accessList: [] },
    };
    mocks.firestoreHasMore = true;
    mocks.firestoreLoadMore.mockRejectedValue(
      new Error("Firestore continuation failed"),
    );

    render(<MessagingProvider><PaginationProbe /></MessagingProvider>);
    fireEvent.click(screen.getByRole("button", { name: "More conversations" }));

    await waitFor(() => {
      expect(screen.getByTestId("messaging-error")).toHaveTextContent(
        "Firestore continuation failed",
      );
    });
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({
      description: "Firestore continuation failed",
      variant: "destructive",
    }));
  });
});
