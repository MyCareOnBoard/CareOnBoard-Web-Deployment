import { act, fireEvent, render, screen } from "@testing-library/react";
import { useEffect } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authUser: {
    uid: "super-1",
    userType: "super_admin",
    profile: {
      accessList: ["Corporate Support"],
      agencyScope: "all",
      agencyIds: ["agency-a", "agency-b"],
    },
  } as any,
  refetchConversations: vi.fn(),
  refetchConversation: vi.fn(),
  refetchMessages: vi.fn(),
  useConversations: vi.fn(() => ({
    conversations: [],
    loading: false,
    error: null,
  })),
  useConversation: vi.fn(() => ({
    conversation: null,
    loading: false,
    error: null,
  })),
  useConversationMessages: vi.fn(() => ({
    messages: [],
    loading: false,
    error: null,
  })),
  getConversations: vi.fn(() => ({
    data: { success: true, conversations: [], count: 0 },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  })),
  conversationListData: {
    success: true,
    conversations: [],
    count: 0,
  },
  conversationData: undefined as any,
  conversationCurrentData: undefined as any,
  messagesData: undefined as any,
  messagesCurrentData: undefined as any,
  getConversation: vi.fn(() => ({
    data: undefined,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  })),
  getMessages: vi.fn(() => ({
    data: undefined,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  })),
}));

mocks.getConversations.mockImplementation(() => ({
  data: mocks.conversationListData,
  currentData: mocks.conversationListData,
  isLoading: false,
  error: null,
  refetch: mocks.refetchConversations,
}));
mocks.getConversation.mockImplementation(() => ({
  data: mocks.conversationData,
  currentData: mocks.conversationCurrentData,
  isLoading: false,
  error: null,
  refetch: mocks.refetchConversation,
}));
mocks.getMessages.mockImplementation(() => ({
  data: mocks.messagesData,
  currentData: mocks.messagesCurrentData,
  isLoading: false,
  error: null,
  refetch: mocks.refetchMessages,
}));

vi.mock("@/utils/auth", () => ({
  useAuth: () => ({ user: mocks.authUser }),
}));
vi.mock("@/lib/hooks/useMessaging", () => ({
  useConversations: mocks.useConversations,
  useConversation: mocks.useConversation,
  useConversationMessages: mocks.useConversationMessages,
}));
vi.mock("@/lib/hooks/usePresence", () => ({
  usePresenceManager: vi.fn(),
  useMultiplePresence: () => ({ presenceMap: {} }),
}));
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));
vi.mock("@/lib/api/userMessaging", () => ({
  useGetContactsQuery: () => ({ data: { data: [] }, refetch: vi.fn() }),
  useLazyGetContactsQuery: () => [vi.fn()],
  useLazyGetConversationsQuery: () => [vi.fn()],
  useCreateConversationMutation: () => [vi.fn()],
  useSendMessageMutation: () => [vi.fn()],
  useMarkMessagesAsReadMutation: () => [vi.fn()],
  useLeaveConversationMutation: () => [vi.fn()],
  useGetConversationsQuery: mocks.getConversations,
  useGetConversationByIdQuery: mocks.getConversation,
  useGetMessagesQuery: mocks.getMessages,
}));

import { MessagingProvider, useMessaging } from "./MessagingContext";

function lastConversationScopeKey(): string | undefined {
  const calls = mocks.getConversations.mock.calls as unknown as Array<
    [{ scopeKey?: string }]
  >;
  return calls[calls.length - 1]?.[0]?.scopeKey;
}

describe("MessagingProvider super-admin reads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authUser = {
      uid: "super-1",
      userType: "super_admin",
      profile: {
        accessList: ["Corporate Support"],
        agencyScope: "all",
        agencyIds: ["agency-a", "agency-b"],
      },
    };
    mocks.conversationData = undefined;
    mocks.conversationCurrentData = undefined;
    mocks.messagesData = undefined;
    mocks.messagesCurrentData = undefined;
    mocks.getConversations.mockImplementation(() => ({
      data: mocks.conversationListData,
      currentData: mocks.conversationListData,
      isLoading: false,
      error: null,
      refetch: mocks.refetchConversations,
    }));
    mocks.getConversation.mockImplementation(() => ({
      data: mocks.conversationData,
      currentData: mocks.conversationCurrentData,
      isLoading: false,
      error: null,
      refetch: mocks.refetchConversation,
    }));
    mocks.getMessages.mockImplementation(() => ({
      data: mocks.messagesData,
      currentData: mocks.messagesCurrentData,
      isLoading: false,
      error: null,
      refetch: mocks.refetchMessages,
    }));
  });

  it("disables direct Firestore subscriptions and uses guarded REST hooks", () => {
    render(<MessagingProvider><div>child</div></MessagingProvider>);

    expect(mocks.useConversations).toHaveBeenCalledWith({
      limit: 50,
      skip: true,
    });
    expect(mocks.useConversation).toHaveBeenCalledWith(null, { skip: true });
    expect(mocks.useConversationMessages).toHaveBeenCalledWith(null, {
      limit: 50,
      reverse: true,
      skip: true,
    });
    expect(mocks.getConversations).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 50,
        scopeKey: expect.stringContaining("super-1"),
      }),
      { skip: false },
    );
  });

  it("polls guarded REST data and stops polling after unmount", () => {
    vi.useFakeTimers();
    function SelectedConversation() {
      const { selectConversation } = useMessaging();
      useEffect(() => selectConversation("conversation-a"), [selectConversation]);
      return null;
    }

    const { unmount } = render(
      <MessagingProvider><SelectedConversation /></MessagingProvider>,
    );

    act(() => {
      vi.advanceTimersByTime(15_000);
    });
    expect(mocks.refetchConversations).toHaveBeenCalled();
    expect(mocks.refetchConversation).toHaveBeenCalled();
    expect(mocks.refetchMessages).toHaveBeenCalled();

    unmount();
    vi.clearAllMocks();
    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    expect(mocks.refetchConversations).not.toHaveBeenCalled();
    expect(mocks.refetchConversation).not.toHaveBeenCalled();
    expect(mocks.refetchMessages).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("normalizes REST timestamps and preserves read and status semantics", () => {
    const response = {
        success: true,
        messages: [
          {
            id: "read-message",
            conversationId: "conversation-a",
            senderId: "other",
            senderName: "Other",
            senderRole: "DSP",
            content: "Read",
            attachments: [],
            readBy: { "super-1": "2026-07-26T00:00:00.000Z" },
            isRead: false,
            status: "read",
            createdAt: { seconds: 0, nanoseconds: 0 },
            updatedAt: { _seconds: 1, _nanoseconds: 500_000_000 },
          },
          {
            id: "unread-message",
            conversationId: "conversation-a",
            senderId: "other",
            senderName: "Other",
            senderRole: "DSP",
            content: "Unread",
            attachments: [],
            readBy: { other: "2026-07-26T00:00:00.000Z" },
            isRead: true,
            status: "delivered",
            createdAt: "2026-07-26T10:00:00.000Z",
            updatedAt: "2026-07-26T10:00:01.000Z",
          },
        ],
        count: 2,
    };
    mocks.getMessages.mockReturnValue({
      data: response,
      currentData: response,
      isLoading: false,
      error: null,
      refetch: mocks.refetchMessages,
    } as any);

    function MessageProbe() {
      const { currentMessages, selectConversation } = useMessaging();
      useEffect(() => {
        selectConversation("conversation-a");
      }, [selectConversation]);
      return (
        <pre data-testid="messages">{JSON.stringify(currentMessages)}</pre>
      );
    }

    render(<MessagingProvider><MessageProbe /></MessagingProvider>);
    const messages = JSON.parse(screen.getByTestId("messages").textContent!);

    expect(messages[0]).toMatchObject({
      status: "read",
      isRead: true,
      createdAt: "1970-01-01T00:00:00.000Z",
      updatedAt: "1970-01-01T00:00:01.500Z",
    });
    expect(messages[1]).toMatchObject({
      status: "delivered",
      isRead: false,
      createdAt: "2026-07-26T10:00:00.000Z",
    });
  });

  it("changes the scope fingerprint for same-UID all, selected A, and selected B access", () => {
    mocks.authUser = {
      uid: "super-1",
      userType: "super_admin",
      profile: {
        accessList: ["Corporate Support", "Compliance"],
        agencyScope: "all",
        agencyIds: ["agency-b", "agency-a"],
      },
    };
    const view = render(
      <MessagingProvider><div>scope probe</div></MessagingProvider>,
    );
    const allScopeKey = lastConversationScopeKey();

    mocks.authUser = {
      ...mocks.authUser,
      profile: {
        accessList: ["Compliance", "Corporate Support"],
        agencyScope: "all",
        agencyIds: ["agency-a", "agency-b", "agency-a"],
      },
    };
    view.rerender(
      <MessagingProvider><div>scope probe</div></MessagingProvider>,
    );
    expect(lastConversationScopeKey()).toBe(
      allScopeKey,
    );

    mocks.authUser = {
      ...mocks.authUser,
      profile: {
        ...mocks.authUser.profile,
        agencyScope: "selected",
        agencyIds: ["agency-a"],
      },
    };
    view.rerender(
      <MessagingProvider><div>scope probe</div></MessagingProvider>,
    );
    const agencyAScopeKey = lastConversationScopeKey();
    expect(agencyAScopeKey).not.toBe(allScopeKey);

    mocks.authUser = {
      ...mocks.authUser,
      profile: {
        ...mocks.authUser.profile,
        agencyIds: ["agency-b"],
      },
    };
    view.rerender(
      <MessagingProvider><div>scope probe</div></MessagingProvider>,
    );
    const agencyBScopeKey = lastConversationScopeKey();
    expect(agencyBScopeKey).not.toBe(agencyAScopeKey);
  });

  it("masks revoked detail/messages and rejects stale old-scope query data", () => {
    const allScopeConversation = {
      success: true,
      conversation: {
        id: "all-scope-detail",
        type: "direct",
        participantIds: ["super-1", "employee-a"],
        participants: [],
        unreadCount: 3,
        createdAt: "2026-07-26T00:00:00.000Z",
        updatedAt: "2026-07-26T00:00:00.000Z",
        createdBy: "super-1",
      },
    };
    const allScopeMessages = {
      success: true,
      messages: [{
        id: "all-scope-message",
        conversationId: "conversation-a",
        senderId: "employee-a",
        senderName: "Employee A",
        senderRole: "DSP",
        content: "Old scope",
        readBy: [],
        isRead: false,
        status: "sent",
        createdAt: "2026-07-26T00:00:00.000Z",
        updatedAt: "2026-07-26T00:00:00.000Z",
      }],
    };
    mocks.conversationData = allScopeConversation;
    mocks.conversationCurrentData = allScopeConversation;
    mocks.messagesData = allScopeMessages;
    mocks.messagesCurrentData = allScopeMessages;

    function SelectionProbe() {
      const {
        currentConversation,
        currentMessages,
        selectConversation,
      } = useMessaging();
      return (
        <>
          <button onClick={() => selectConversation("conversation-a")}>
            Select conversation
          </button>
          <div data-testid="detail-id">
            {currentConversation?.id || "none"}
          </div>
          <div data-testid="message-ids">
            {currentMessages.map(({ id }) => id).join(",") || "none"}
          </div>
        </>
      );
    }

    const view = render(
      <MessagingProvider><SelectionProbe /></MessagingProvider>,
    );
    fireEvent.click(screen.getByRole("button", {
      name: "Select conversation",
    }));
    expect(screen.getByTestId("detail-id")).toHaveTextContent(
      "all-scope-detail",
    );
    expect(screen.getByTestId("message-ids")).toHaveTextContent(
      "all-scope-message",
    );

    mocks.authUser = {
      ...mocks.authUser,
      profile: {
        ...mocks.authUser.profile,
        agencyScope: "selected",
        agencyIds: ["agency-a"],
      },
    };
    mocks.conversationCurrentData = undefined;
    mocks.messagesCurrentData = undefined;
    view.rerender(
      <MessagingProvider><SelectionProbe /></MessagingProvider>,
    );
    expect(screen.getByTestId("detail-id")).toHaveTextContent("none");
    expect(screen.getByTestId("message-ids")).toHaveTextContent("none");

    fireEvent.click(screen.getByRole("button", {
      name: "Select conversation",
    }));
    expect(screen.getByTestId("detail-id")).toHaveTextContent("none");
    expect(screen.getByTestId("message-ids")).toHaveTextContent("none");
    expect(mocks.getConversation).toHaveBeenLastCalledWith(
      expect.objectContaining({
        conversationId: "conversation-a",
        scopeKey: expect.any(String),
      }),
      { skip: false },
    );
    expect(mocks.getMessages).toHaveBeenLastCalledWith(
      expect.objectContaining({
        conversationId: "conversation-a",
        scopeKey: expect.any(String),
      }),
      { skip: false },
    );

    mocks.conversationData = {
      ...allScopeConversation,
      conversation: {
        ...allScopeConversation.conversation,
        id: "stale-all-scope-detail",
      },
    };
    mocks.messagesData = {
      ...allScopeMessages,
      messages: [{
        ...allScopeMessages.messages[0],
        id: "stale-all-scope-message",
      }],
    };
    view.rerender(
      <MessagingProvider><SelectionProbe /></MessagingProvider>,
    );
    expect(screen.getByTestId("detail-id")).toHaveTextContent("none");
    expect(screen.getByTestId("message-ids")).toHaveTextContent("none");

    mocks.conversationCurrentData = {
      ...allScopeConversation,
      conversation: {
        ...allScopeConversation.conversation,
        id: "agency-a-detail",
      },
    };
    mocks.messagesCurrentData = {
      ...allScopeMessages,
      messages: [{
        ...allScopeMessages.messages[0],
        id: "agency-a-message",
      }],
    };
    view.rerender(
      <MessagingProvider><SelectionProbe /></MessagingProvider>,
    );
    expect(screen.getByTestId("detail-id")).toHaveTextContent(
      "agency-a-detail",
    );
    expect(screen.getByTestId("message-ids")).toHaveTextContent(
      "agency-a-message",
    );
  });
});
