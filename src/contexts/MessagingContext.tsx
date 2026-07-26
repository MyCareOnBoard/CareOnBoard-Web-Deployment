/**
 * Messaging Context Provider
 * Provides shared messaging state and methods across the application
 */

import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from "react";
import {
  useConversations,
  useConversationMessages,
  useConversation,
  Conversation,
  Message,
} from "@/lib/hooks/useMessaging";
import { useMultiplePresence, usePresenceManager, UserPresence } from "@/lib/hooks/usePresence";
import {
  useGetContactsQuery,
  useCreateConversationMutation,
  useSendMessageMutation,
  useMarkMessagesAsReadMutation,
  useLeaveConversationMutation,
  useGetConversationByIdQuery,
  useGetConversationsQuery,
  useGetMessagesQuery,
  AgencyContact,
  UserConversation,
  UserMessage,
} from "@/lib/api/userMessaging";
import { useAuth } from "@/utils/auth";
import { UserType } from "@/utils/auth/types/user.types";
import { useToast } from "@/hooks/use-toast";

interface MessagingContextType {
  // State
  conversations: Conversation[];
  currentConversation: Conversation | null;
  currentMessages: Message[];
  presenceMap: Record<string, UserPresence>;
  loading: boolean;
  /** Loading state for conversations list only */
  conversationsLoading: boolean;
  /** Loading state for selected conversation metadata */
  conversationLoading: boolean;
  /** Loading state for messages in selected conversation */
  messagesLoading: boolean;
  error: Error | null;

  // Actions
  selectConversation: (conversationId: string | null) => void;
  sendMessage: (
    conversationId: string,
    content: string,
    attachments?: Array<{ type: "image" | "file"; url: string; name?: string }>
  ) => Promise<void>;
  createConversation: (participantIds: string[]) => Promise<Conversation | null>;
  markAsRead: (conversationId: string, messageIds: string[]) => Promise<void>;
  deleteConversation: (conversationId: string) => Promise<void>;
  getContacts: () => Promise<AgencyContact[]>;
  getPresence: (userId: string) => UserPresence | null;
  refreshConversation: (conversationId: string) => Promise<void>;
}

const MessagingContext = createContext<MessagingContextType | undefined>(undefined);

interface MessagingProviderProps {
  children: React.ReactNode;
}

function mapApiConversation(conversation: UserConversation): Conversation {
  const participants = (conversation.participants || []).map((participant) => ({
    uid: participant.uid,
    name: participant.name,
    role: participant.role,
    avatar: participant.avatar,
    userType: participant.userType || participant.role || "user",
    agencyName: participant.agencyName,
  }));
  const lastMessage = typeof conversation.lastMessage === "string"
    ? conversation.lastMessage
    : conversation.lastMessage?.text || null;

  return {
    ...conversation,
    type: conversation.type || "direct",
    participants,
    participantDetails: participants,
    lastMessage,
    createdAt: conversation.createdAt || "",
    updatedAt: conversation.updatedAt || "",
    createdBy: conversation.createdBy || "",
  };
}

function mapApiMessage(message: UserMessage): Message {
  const readBy = Array.isArray(message.readBy)
    ? message.readBy
    : Object.keys(message.readBy || {});
  return {
    ...message,
    content: message.content || message.text || "",
    readBy,
    status: "sent",
    createdAt: message.createdAt || "",
    updatedAt: message.updatedAt || message.createdAt || "",
  };
}

export function MessagingProvider({ children }: MessagingProviderProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  // Initialize presence manager
  usePresenceManager();

  // RTK Query hooks - skip for unauthenticated users and family members (they use their own messaging API)
  const isFamilyMember = user?.userType === UserType.FAMILY_MEMBER;
  const isSuperAdmin = user?.userType === UserType.SUPER_ADMIN;
  const { data: contactsData, refetch: refetchContacts } = useGetContactsQuery(undefined, {
    skip: !user || isFamilyMember,
  });
  const [createConversationMutation] = useCreateConversationMutation();
  const [sendMessageMutation] = useSendMessageMutation();
  const [markMessagesAsReadMutation] = useMarkMessagesAsReadMutation();
  const [leaveConversationMutation] = useLeaveConversationMutation();
  const {
    data: apiConversationsData,
    isLoading: apiConversationsLoading,
    error: apiConversationsError,
    refetch: refetchConversations,
  } = useGetConversationsQuery(undefined, {
    skip: !user || !isSuperAdmin,
  });
  const {
    data: apiConversationData,
    isLoading: apiConversationLoading,
    error: apiConversationError,
    refetch: refetchConversation,
  } = useGetConversationByIdQuery(selectedConversationId || "", {
    skip: !user || !isSuperAdmin || !selectedConversationId,
  });
  const {
    data: apiMessagesData,
    isLoading: apiMessagesLoading,
    error: apiMessagesError,
    refetch: refetchMessages,
  } = useGetMessagesQuery(
    { conversationId: selectedConversationId || "", limit: 50 },
    { skip: !user || !isSuperAdmin || !selectedConversationId },
  );

  // Subscribe to conversations list (already checks for user internally)
  const {
    conversations: firestoreConversations,
    loading: firestoreConversationsLoading,
    error: firestoreConversationsError,
  } = useConversations({ limit: 50, skip: isSuperAdmin });

  // Subscribe to selected conversation (already checks for user internally)
  const {
    conversation: firestoreConversation,
    loading: firestoreConversationLoading,
    error: firestoreConversationError,
  } = useConversation(selectedConversationId, { skip: isSuperAdmin });

  // Subscribe to messages in selected conversation (already checks for user internally)
  const {
    messages: firestoreMessages,
    loading: firestoreMessagesLoading,
    error: firestoreMessagesError,
  } = useConversationMessages(selectedConversationId, {
    limit: 50,
    reverse: true,
    skip: isSuperAdmin,
  });

  const conversations = useMemo(
    () => isSuperAdmin
      ? (apiConversationsData?.conversations || apiConversationsData?.data || [])
        .map(mapApiConversation)
      : firestoreConversations,
    [apiConversationsData, firestoreConversations, isSuperAdmin],
  );
  const currentConversation = useMemo(
    () => isSuperAdmin
      ? (apiConversationData?.conversation || apiConversationData?.data
        ? mapApiConversation(
          (apiConversationData.conversation || apiConversationData.data)!,
        )
        : null)
      : firestoreConversation,
    [apiConversationData, firestoreConversation, isSuperAdmin],
  );
  const currentMessages = useMemo(
    () => isSuperAdmin
      ? (apiMessagesData?.messages || apiMessagesData?.data || [])
        .map(mapApiMessage)
      : firestoreMessages,
    [apiMessagesData, firestoreMessages, isSuperAdmin],
  );
  const conversationsLoading = isSuperAdmin
    ? apiConversationsLoading
    : firestoreConversationsLoading;
  const conversationLoading = isSuperAdmin
    ? apiConversationLoading
    : firestoreConversationLoading;
  const messagesLoading = isSuperAdmin
    ? apiMessagesLoading
    : firestoreMessagesLoading;
  const conversationsError = isSuperAdmin && apiConversationsError
    ? new Error("Failed to load conversations")
    : firestoreConversationsError;
  const conversationError = isSuperAdmin && apiConversationError
    ? new Error("Failed to load conversation")
    : firestoreConversationError;
  const messagesError = isSuperAdmin && apiMessagesError
    ? new Error("Failed to load messages")
    : firestoreMessagesError;

  // Subscribe to presence for conversation participants
  const participantIds = useMemo(() => {
    if (!currentConversation?.participantIds) return [];
    return currentConversation.participantIds.filter((id) => id !== user?.uid);
  }, [currentConversation?.participantIds, user?.uid]);

  const { presenceMap } = useMultiplePresence(participantIds);

  // Combined loading state
  const loading = conversationsLoading || conversationLoading || messagesLoading;
  const error = conversationsError || conversationError || messagesError;

  // Select conversation
  const selectConversation = useCallback((conversationId: string | null) => {
    setSelectedConversationId(conversationId);
  }, []);

  // Send message
  const sendMessage = useCallback(
    async (
      conversationId: string,
      content: string,
      attachments?: Array<{ type: "image" | "file"; url: string; name?: string }>
    ) => {
      const trimmedContent = content.trim();
      const hasText = trimmedContent.length > 0;
      const hasAttachments = Array.isArray(attachments) && attachments.length > 0;

      // Require at least text or one attachment
      if (!hasText && !hasAttachments) return;

      if (!conversationId || typeof conversationId !== 'string' || conversationId.trim() === '') {
        console.error("Invalid conversation ID:", conversationId);
        toast({
          title: "Error",
          description: "Invalid conversation ID",
          variant: "destructive",
        });
        return;
      }

      try {
        await sendMessageMutation({
          conversationId,
          payload: {
            content: trimmedContent,
            attachments: hasAttachments ? attachments : undefined,
          }
        }).unwrap();
        // Real-time update will come via Firestore subscription
      } catch (error: any) {
        console.error("Error sending message:", error);
        toast({
          title: "Error",
          description: error.data?.message || error.message || "Failed to send message",
          variant: "destructive",
        });
        throw error;
      }
    },
    [sendMessageMutation, toast]
  );

  // Create conversation
  const createConversation = useCallback(
    async (participantIds: string[]): Promise<Conversation | null> => {
      if (participantIds.length === 0) return null;

      try {
        const response = await createConversationMutation({ participantIds }).unwrap();
        if (response.success && response.data) {
          if (!response.data.id) {
            console.error("Conversation created but missing ID:", response.data);
            toast({
              title: "Error",
              description: "Failed to create conversation: missing ID",
              variant: "destructive",
            });
            return null;
          }

          const mappedConversation = mapApiConversation(response.data);
          // Select the new conversation
          setSelectedConversationId(mappedConversation.id);
          return mappedConversation;
        }
        return null;
      } catch (error: any) {
        console.error("Error creating conversation:", error);
        toast({
          title: "Error",
          description: error.data?.message || error.message || "Failed to create conversation",
          variant: "destructive",
        });
        throw error;
      }
    },
    [createConversationMutation, toast]
  );

  // Mark messages as read
  const markAsRead = useCallback(
    async (conversationId: string, messageIds: string[]) => {
      if (messageIds.length === 0) return;

      try {
        await markMessagesAsReadMutation({
          conversationId,
          payload: { messageIds }
        }).unwrap();
        // Real-time update will come via Firestore subscription
      } catch (error: any) {
        console.error("Error marking messages as read:", error);
        // Don't show toast for read errors, just log
      }
    },
    [markMessagesAsReadMutation]
  );

  // Delete conversation
  const deleteConversation = useCallback(
    async (conversationId: string) => {
      try {
        await leaveConversationMutation(conversationId).unwrap();
        if (selectedConversationId === conversationId) {
          setSelectedConversationId(null);
        }
        toast({
          title: "Success",
          description: "Conversation deleted successfully",
        });
      } catch (error: any) {
        console.error("Error deleting conversation:", error);
        toast({
          title: "Error",
          description: error.data?.message || error.message || "Failed to delete conversation",
          variant: "destructive",
        });
        throw error;
      }
    },
    [leaveConversationMutation, selectedConversationId, toast]
  );

  // Get contacts
  const getContacts = useCallback(async (): Promise<AgencyContact[]> => {
    try {
      const result = await refetchContacts();
      return result.data?.data || [];
    } catch (error: any) {
      console.error("Error fetching contacts:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load contacts",
        variant: "destructive",
      });
      return [];
    }
  }, [refetchContacts, toast]);

  // Get presence for a user
  const getPresence = useCallback(
    (userId: string): UserPresence | null => {
      return presenceMap[userId] || null;
    },
    [presenceMap]
  );

  // Refresh conversation (trigger refetch)
  const refreshConversation = useCallback(
    async (conversationId: string) => {
      if (isSuperAdmin && conversationId === selectedConversationId) {
        await Promise.all([
          refetchConversations(),
          refetchConversation(),
          refetchMessages(),
        ]);
      }
    },
    [
      isSuperAdmin,
      refetchConversation,
      refetchConversations,
      refetchMessages,
      selectedConversationId,
    ]
  );

  const value: MessagingContextType = useMemo(
    () => ({
      conversations,
      currentConversation,
      currentMessages,
      presenceMap,
      loading,
      conversationsLoading,
      conversationLoading,
      messagesLoading,
      error,
      selectConversation,
      sendMessage,
      createConversation,
      markAsRead,
      deleteConversation,
      getContacts,
      getPresence,
      refreshConversation,
    }),
    [
      conversations,
      currentConversation,
      currentMessages,
      presenceMap,
      loading,
      conversationsLoading,
      conversationLoading,
      messagesLoading,
      error,
      selectConversation,
      sendMessage,
      createConversation,
      markAsRead,
      deleteConversation,
      getContacts,
      getPresence,
      refreshConversation,
    ]
  );

  return <MessagingContext.Provider value={value}>{children}</MessagingContext.Provider>;
}

/**
 * Hook to use messaging context
 */
export function useMessaging() {
  const context = useContext(MessagingContext);
  if (context === undefined) {
    throw new Error("useMessaging must be used within a MessagingProvider");
  }
  return context;
}
