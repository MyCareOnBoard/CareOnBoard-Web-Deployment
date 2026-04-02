/**
 * Chat Custom Hooks
 *
 * React hooks that abstract chat service logic for UI components.
 * These hooks manage subscriptions, state, and side effects.
 *
 * MIGRATION NOTES:
 * These hooks provide a clean abstraction layer. When migrating to a different
 * backend, only the implementation inside these hooks needs to change.
 * All UI components using these hooks will work with any backend implementation
 * that returns the same data shapes.
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { auth } from "@/lib/firebase";
import {
  subscribeToThreads,
  subscribeToMessages,
  sendMessage,
  createThread,
  fetchUsers,
  getCurrentUser,
  fetchUserById,
} from "./chat.service";
import type { ChatUser, Thread, Message, MessageWithSender } from "./chat.types";

/**
 * Hook to manage authenticated user's threads
 * Subscribes to real-time updates of all threads where user is a participant
 *
 * @returns Object containing threads array, loading state, and error
 */
export function useThreads() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const userId = auth.currentUser?.uid;

    if (!userId) {
      setIsLoading(false);
      setError("User not authenticated");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Subscribe to threads and cleanup on unmount
      unsubscribeRef.current = subscribeToThreads(userId, (updatedThreads) => {
        setThreads(updatedThreads);
        setIsLoading(false);
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load threads";
      setError(errorMessage);
      setIsLoading(false);
    }

    // Cleanup subscription on unmount
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  return { threads, isLoading, error };
}

/**
 * Hook to manage messages in a specific thread
 * Subscribes to real-time updates of messages ordered by creation time
 *
 * @param threadId - The thread ID to load messages for
 * @returns Object containing messages array, loading state, and error
 */
export function useMessages(threadId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Clean up previous subscription
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    if (!threadId) {
      setMessages([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Subscribe to messages for this thread
      unsubscribeRef.current = subscribeToMessages(threadId, (updatedMessages) => {
        setMessages(updatedMessages);
        setIsLoading(false);
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load messages";
      setError(errorMessage);
      setIsLoading(false);
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [threadId]);

  return { messages, isLoading, error };
}

/**
 * Hook to manage available users (for creating new threads)
 * Fetches users once on mount, used for the New Message modal
 *
 * @returns Object containing users array, loading state, and error
 */
export function useAvailableUsers() {
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadUsers = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const loadedUsers = await fetchUsers();
        
        if (isMounted) {
          // Filter out current user from the list
          const currentUserId = auth.currentUser?.uid;
          const filtered = loadedUsers.filter((u) => u.uid !== currentUserId);
          setUsers(filtered);
        }
      } catch (err) {
        if (isMounted) {
          const errorMessage = err instanceof Error ? err.message : "Failed to load users";
          setError(errorMessage);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadUsers();

    return () => {
      isMounted = false;
    };
  }, []);

  return { users, isLoading, error };
}

/**
 * Hook to manage sending messages
 * Handles sending a message and updating thread metadata
 *
 * @param threadId - The thread ID to send message to
 * @returns Object containing sendMessage function and loading/error states
 */
export function useSendMessage(threadId: string | null) {
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = useCallback(
    async (text: string) => {
      if (!threadId || !text.trim()) {
        setError("Invalid thread or message");
        return;
      }

      try {
        setIsSending(true);
        setError(null);
        await sendMessage({ threadId, text });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to send message";
        setError(errorMessage);
        throw err;
      } finally {
        setIsSending(false);
      }
    },
    [threadId]
  );

  return { send, isSending, error };
}

/**
 * Hook to manage creating new threads
 * Handles thread creation and opening the newly created chat
 *
 * @returns Object containing createNewThread function and loading/error states
 */
export function useCreateThread() {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = useCallback(async (participantIds: string[]): Promise<string> => {
    if (!participantIds.length) {
      setError("Must select at least one participant");
      throw new Error("Must select at least one participant");
    }

    try {
      setIsCreating(true);
      setError(null);
      const threadId = await createThread({ participantIds });
      return threadId;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create thread";
      setError(errorMessage);
      throw err;
    } finally {
      setIsCreating(false);
    }
  }, []);

  return { create, isCreating, error };
}

/**
 * Hook to get current authenticated user's info
 * Loads user profile once on mount
 *
 * @returns Object containing current user data, loading state, and error
 */
export function useCurrentUser() {
  const [currentUser, setCurrentUser] = useState<ChatUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadCurrentUser = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const user = await getCurrentUser();
        
        if (isMounted) {
          setCurrentUser(user);
        }
      } catch (err) {
        if (isMounted) {
          const errorMessage = err instanceof Error ? err.message : "Failed to load user info";
          setError(errorMessage);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadCurrentUser();

    return () => {
      isMounted = false;
    };
  }, []);

  return { currentUser, isLoading, error };
}

/**
 * Hook to get thread with user info
 * Combines thread data with information about the other participant
 *
 * @param threadId - The thread ID
 * @param currentUserId - Current user's UID
 * @returns Object containing thread with user info, loading state, and error
 */
export function useThreadWithUser(threadId: string | null, currentUserId: string | null) {
  const [thread, setThread] = useState<(Thread & { otherUser?: ChatUser }) | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!threadId || !currentUserId) {
      setThread(null);
      return;
    }

    const loadThreadWithUser = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // For now, we'll set the thread when we have it from useThreads
        // This is typically used in combination with useThreads
        // Future optimization: Could fetch full thread data with user info here
        
        setIsLoading(false);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to load thread";
        setError(errorMessage);
        setIsLoading(false);
      }
    };

    loadThreadWithUser();
  }, [threadId, currentUserId]);

  return { thread, isLoading, error };
}

/**
 * Hook to get messages with sender info
 * Combines messages with sender user data
 *
 * @param messages - Array of messages
 * @returns Object containing messages with sender info and loading state
 */
export function useMessagesWithSenders(messages: Message[]) {
  const [messagesWithSenders, setMessagesWithSenders] = useState<MessageWithSender[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!messages.length) {
      setMessagesWithSenders([]);
      return;
    }

    const loadSenders = async () => {
      try {
        setIsLoading(true);

        // Fetch unique senders
        const senderIds = Array.from(new Set(messages.map((m) => m.senderId)));
        const senderMap = new Map<string, ChatUser>();

        for (const senderId of senderIds) {
          const user = await fetchUserById(senderId);
          if (user) {
            senderMap.set(senderId, user);
          }
        }

        // Combine messages with sender info
        const combined: MessageWithSender[] = messages.map((msg) => ({
          ...msg,
          sender: senderMap.get(msg.senderId),
        }));

        setMessagesWithSenders(combined);
      } catch (err) {
        console.error("Error loading message senders:", err);
        // Fall back to messages without sender info
        setMessagesWithSenders(messages.map((msg) => ({ ...msg })));
      } finally {
        setIsLoading(false);
      }
    };

    loadSenders();
  }, [messages]);

  return { messagesWithSenders, isLoading };
}

/**
 * Hook for authentication state
 * Checks if user is authenticated
 *
 * @returns Object containing auth state and user UID
 */
export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setIsAuthenticated(true);
        setUserId(user.uid);
      } else {
        setIsAuthenticated(false);
        setUserId(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { isAuthenticated, userId, isLoading };
}
