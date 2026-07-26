import { act, render, screen } from "@testing-library/react";
import { useEffect } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
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
  data: undefined,
  isLoading: false,
  error: null,
  refetch: mocks.refetchConversation,
}));
mocks.getMessages.mockImplementation(() => ({
  data: undefined,
  isLoading: false,
  error: null,
  refetch: mocks.refetchMessages,
}));

vi.mock("@/utils/auth", () => ({
  useAuth: () => ({ user: { uid: "super-1", userType: "super_admin" } }),
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

describe("MessagingProvider super-admin reads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getConversations.mockImplementation(() => ({
      data: mocks.conversationListData,
      currentData: mocks.conversationListData,
      isLoading: false,
      error: null,
      refetch: mocks.refetchConversations,
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
    mocks.getMessages.mockReturnValue({
      data: {
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
      },
      isLoading: false,
      error: null,
      refetch: mocks.refetchMessages,
    } as any);

    function MessageProbe() {
      const { currentMessages } = useMessaging();
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
});
