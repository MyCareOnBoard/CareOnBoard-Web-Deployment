import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
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
  useCreateConversationMutation: () => [vi.fn()],
  useSendMessageMutation: () => [vi.fn()],
  useMarkMessagesAsReadMutation: () => [vi.fn()],
  useLeaveConversationMutation: () => [vi.fn()],
  useGetConversationsQuery: mocks.getConversations,
  useGetConversationByIdQuery: mocks.getConversation,
  useGetMessagesQuery: mocks.getMessages,
}));

import { MessagingProvider } from "./MessagingContext";

describe("MessagingProvider super-admin reads", () => {
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
    expect(mocks.getConversations).toHaveBeenCalledWith(undefined, {
      skip: false,
    });
  });
});
