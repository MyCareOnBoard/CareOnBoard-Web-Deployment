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
  createUserConversation,
  sendUserMessage,
  markUserMessagesAsRead,
  leaveUserConversation,
  getUserContacts,
  getUserConversationById,
} from "@/lib/api/userMessaging";
import { useAuth } from "@/utils/auth";
import { useToast } from "@/hooks/use-toast";

interface MessagingContextType {
  // State
  conversations: Conversation[];
  currentConversation: Conversation | null;
  currentMessages: Message[];
  presenceMap: Record<string, UserPresence>;
  loading: boolean;
  error: Error | null;

  // Actions
  selectConversation: (conversationId: string | null) => void;
  sendMessage: (conversationId: string, content: string) => Promise<void>;
  createConversation: (participantIds: string[]) => Promise<Conversation | null>;
  markAsRead: (conversationId: string, messageIds: string[]) => Promise<void>;
  deleteConversation: (conversationId: string) => Promise<void>;
  getContacts: () => Promise<any[]>;
  getPresence: (userId: string) => UserPresence | null;
  refreshConversation: (conversationId: string) => Promise<void>;
}

const MessagingContext = createContext<MessagingContextType | undefined>(undefined);

interface MessagingProviderProps {
  children: React.ReactNode;
}

export function MessagingProvider({ children }: MessagingProviderProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  // Initialize presence manager
  usePresenceManager();

  // Subscribe to conversations list
  const {
    conversations,
    loading: conversationsLoading,
    error: conversationsError,
  } = useConversations({ limit: 50 });

  // Subscribe to selected conversation
  const {
    conversation: currentConversation,
    loading: conversationLoading,
    error: conversationError,
  } = useConversation(selectedConversationId);

  // Subscribe to messages in selected conversation
  const {
    messages: currentMessages,
    loading: messagesLoading,
    error: messagesError,
  } = useConversationMessages(selectedConversationId, { limit: 50, reverse: true });

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
    async (conversationId: string, content: string) => {
      if (!content.trim()) return;
      
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
        await sendUserMessage(conversationId, { content: content.trim() });
        // Real-time update will come via Firestore subscription
      } catch (error: any) {
        console.error("Error sending message:", error);
        toast({
          title: "Error",
          description: error.message || "Failed to send message",
          variant: "destructive",
        });
        throw error;
      }
    },
    [toast]
  );

  // Create conversation
  const createConversation = useCallback(
    async (participantIds: string[]): Promise<Conversation | null> => {
      if (participantIds.length === 0) return null;

      try {
        const response = await createUserConversation({ participantIds });
        if (response.success && response.data) {
          // Map API response to Conversation type
          // Add userType to participants if missing and exclude the old participants array
          const { participants, ...rest } = response.data;
          
          // Ensure id is present
          if (!rest.id) {
            console.error("Conversation created but missing ID:", response.data);
            toast({
              title: "Error",
              description: "Failed to create conversation: missing ID",
              variant: "destructive",
            });
            return null;
          }
          
          const mappedConversation: Conversation = {
            ...rest,
            id: rest.id, // Explicitly ensure id is set
            participantDetails: participants?.map(p => ({
              uid: p.uid,
              name: p.name,
              role: p.role,
              avatar: p.avatar,
              userType: (p as any).userType || p.role || 'user', // Default to role if userType missing
            })) || [],
          };
          // Select the new conversation
          setSelectedConversationId(mappedConversation.id);
          return mappedConversation;
        }
        return null;
      } catch (error: any) {
        console.error("Error creating conversation:", error);
        toast({
          title: "Error",
          description: error.message || "Failed to create conversation",
          variant: "destructive",
        });
        throw error;
      }
    },
    [toast]
  );

  // Mark messages as read
  const markAsRead = useCallback(
    async (conversationId: string, messageIds: string[]) => {
      if (messageIds.length === 0) return;

      try {
        await markUserMessagesAsRead(conversationId, { messageIds });
        // Real-time update will come via Firestore subscription
      } catch (error: any) {
        console.error("Error marking messages as read:", error);
        // Don't show toast for read errors, just log
      }
    },
    []
  );

  // Delete conversation
  const deleteConversation = useCallback(
    async (conversationId: string) => {
      try {
        await leaveUserConversation(conversationId);
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
          description: error.message || "Failed to delete conversation",
          variant: "destructive",
        });
        throw error;
      }
    },
    [selectedConversationId, toast]
  );

  // Get contacts
  const getContacts = useCallback(async () => {
    try {
      const response = await getUserContacts();
      return response.data || [];
    } catch (error: any) {
      console.error("Error fetching contacts:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load contacts",
        variant: "destructive",
      });
      return [];
    }
  }, [toast]);

  // Get presence for a user
  const getPresence = useCallback(
    (userId: string): UserPresence | null => {
      return presenceMap[userId] || null;
    },
    [presenceMap]
  );

  // Refresh conversation
  const refreshConversation = useCallback(
    async (conversationId: string) => {
      try {
        await getUserConversationById(conversationId);
        // Real-time update will come via Firestore subscription
      } catch (error: any) {
        console.error("Error refreshing conversation:", error);
      }
    },
    []
  );

  const value: MessagingContextType = useMemo(
    () => ({
      conversations,
      currentConversation,
      currentMessages,
      presenceMap,
      loading,
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
