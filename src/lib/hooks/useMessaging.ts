/**
 * Firestore Messaging Hooks
 * Real-time subscriptions for conversations and messages using Firestore onSnapshot
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  doc,
  Timestamp,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
  getDocs,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "@/utils/auth";

// ==================== Type Definitions ====================

export interface ConversationParticipant {
  uid: string;
  name: string;
  role: string;
  avatar?: string | null;
  userType: string;
  agencyName?: string;
}

export interface Conversation {
  id: string;
  type: "direct" | "group";
  name?: string | null;
  participantIds: string[];
  participants?: ConversationParticipant[];
  participantDetails?: ConversationParticipant[];
  participantRoles?: string[];
  isCrossPanel?: boolean;
  panelTypes?: string[];
  agencyId?: string | null;
  lastMessage?: string | null;
  lastMessagePreview?: string | null;
  lastMessageAt?: string | null;
  lastMessageSenderId?: string | null;
  unreadCount: number | Record<string, number>;
  messageCount?: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName?: string;
  senderRole?: string;
  senderAvatar?: string | null;
  content: string;
  attachments?: Array<{
    type: string;
    url: string;
    name?: string;
  }>;
  readBy: Record<string, string> | string[];
  isRead?: boolean;
  status: "sent" | "delivered" | "read";
  participantIds?: string[]; // Stored for security rules optimization
  createdAt: string;
  updatedAt: string;
}

interface UseConversationsOptions {
  limit?: number;
  startAfter?: QueryDocumentSnapshot<DocumentData>;
  fields?: string[]; // Fields to select (for optimization)
}

interface UseConversationMessagesOptions {
  limit?: number;
  startAfter?: QueryDocumentSnapshot<DocumentData>;
  reverse?: boolean; // Reverse order for display
}

// ==================== Helper Functions ====================

/**
 * Parse Firestore Timestamp to ISO string
 */
function parseTimestamp(timestamp: Timestamp | Date | string | null | undefined): string {
  if (!timestamp) return new Date().toISOString();
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate().toISOString();
  }
  if (timestamp instanceof Date) {
    return timestamp.toISOString();
  }
  if (typeof timestamp === "string") {
    return timestamp;
  }
  return new Date().toISOString();
}

/**
 * Parse conversation document
 */
function parseConversationDoc(
  docId: string,
  data: DocumentData,
  currentUserId?: string
): Conversation {
  const unreadCount =
    typeof data.unreadCount === "object" && data.unreadCount !== null
      ? currentUserId
        ? (data.unreadCount[currentUserId] || 0)
        : 0
      : (data.unreadCount || 0);

  return {
    id: docId,
    type: data.type || "direct",
    name: data.name || null,
    participantIds: data.participantIds || [],
    participants: data.participants || data.participantDetails || [],
    participantDetails: data.participantDetails || data.participants || [],
    participantRoles: data.participantRoles || [],
    isCrossPanel: data.isCrossPanel || false,
    panelTypes: data.panelTypes || [],
    agencyId: data.agencyId || null,
    lastMessage: data.lastMessage || data.lastMessagePreview || null,
    lastMessagePreview: data.lastMessagePreview || null,
    lastMessageAt: parseTimestamp(data.lastMessageAt),
    lastMessageSenderId: data.lastMessageSenderId || null,
    unreadCount,
    messageCount: data.messageCount || 0,
    createdAt: parseTimestamp(data.createdAt),
    updatedAt: parseTimestamp(data.updatedAt),
    createdBy: data.createdBy || "",
  };
}

/**
 * Parse message document
 */
function parseMessageDoc(docId: string, data: DocumentData, currentUserId?: string): Message {
  const readBy = data.readBy || {};
  const readByArray = typeof readBy === "object" && !Array.isArray(readBy)
    ? Object.keys(readBy)
    : (Array.isArray(readBy) ? readBy : []);

  return {
    id: docId,
    conversationId: data.conversationId || "",
    senderId: data.senderId || "",
    senderName: data.senderName || "",
    senderRole: data.senderRole || "",
    senderAvatar: data.senderAvatar || null,
    content: data.content || "",
    attachments: data.attachments || [],
    readBy: readByArray,
    isRead: currentUserId ? readByArray.includes(currentUserId) : false,
    status: data.status || "sent",
    participantIds: data.participantIds || [],
    createdAt: parseTimestamp(data.createdAt),
    updatedAt: parseTimestamp(data.updatedAt),
  };
}

// ==================== Hooks ====================

/**
 * Hook to subscribe to user's conversations
 */
export function useConversations(
  options: UseConversationsOptions = {}
): {
  conversations: Conversation[];
  loading: boolean;
  error: Error | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
} {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const { limit: limitCount = 50, fields } = options;

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      setConversations([]);
      return;
    }

    setLoading(true);
    setError(null);

    const conversationsRef = collection(db, "conversations");

    // Build query with field selection if specified
    let q = query(
      conversationsRef,
      where("participantIds", "array-contains", user.uid),
      orderBy("updatedAt", "desc"),
      limit(limitCount)
    );

    // Apply field selection if specified (for optimization)
    // Note: Firestore select() is not available in v9 modular SDK easily,
    // so we'll filter in the parse function if needed

    const unsubscribe = onSnapshot(
      q,
      { includeMetadataChanges: false },
      (snapshot) => {
        const newConversations: Conversation[] = snapshot.docs.map((doc) =>
          parseConversationDoc(doc.id, doc.data(), user.uid)
        );

        setConversations(newConversations);
        setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
        setHasMore(snapshot.docs.length === limitCount);
        setLoading(false);
      },
      (err: any) => {
        console.error("Error fetching conversations:", err);
        console.error("Error code:", err?.code);
        console.error("Error message:", err?.message);
        // Check if it's a permission error
        if (err?.code === "permission-denied" || err?.code === 7) {
          console.error("Permission denied. Possible causes:");
          console.error("1. Firestore indexes may still be building (wait a few minutes)");
          console.error("2. User authentication may have expired");
          console.error("3. Firestore rules may not be deployed to production");
          console.error("4. User UID:", user?.uid);
        }
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid, limitCount]);

  const loadMore = useCallback(async () => {
    if (!user?.uid || !hasMore || !lastDoc) return;

    try {
      const conversationsRef = collection(db, "conversations");
      const q = query(
        conversationsRef,
        where("participantIds", "array-contains", user.uid),
        orderBy("updatedAt", "desc"),
        startAfter(lastDoc),
        limit(limitCount)
      );

      const snapshot = await getDocs(q);
      const newConversations: Conversation[] = snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) =>
        parseConversationDoc(doc.id, doc.data(), user.uid)
      );

      setConversations((prev) => [...prev, ...newConversations]);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === limitCount);
    } catch (err) {
      console.error("Error loading more conversations:", err);
    }
  }, [user?.uid, hasMore, lastDoc, limitCount]);

  return {
    conversations,
    loading,
    error,
    hasMore,
    loadMore,
  };
}

/**
 * Hook to subscribe to messages in a conversation
 */
export function useConversationMessages(
  conversationId: string | null,
  options: UseConversationMessagesOptions = {}
): {
  messages: Message[];
  loading: boolean;
  error: Error | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
} {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const { limit: limitCount = 50, reverse = true } = options;

  useEffect(() => {
    if (!conversationId || !user?.uid) {
      setLoading(false);
      setMessages([]);
      return;
    }

    setLoading(true);
    setError(null);
    setMessages([]);

    const messagesRef = collection(db, "conversations", conversationId, "messages");

    // Query: filter by participantIds to satisfy security rules, then order by createdAt descending
    // Security rules require participantIds to be checked, so we must filter by it
    const q = query(
      messagesRef,
      where("participantIds", "array-contains", user.uid),
      orderBy("createdAt", "desc"),
      limit(limitCount)
    );

    const unsubscribe = onSnapshot(
      q,
      { includeMetadataChanges: false },
      (snapshot) => {
        const newMessages: Message[] = snapshot.docs.map((doc) =>
          parseMessageDoc(doc.id, doc.data(), user.uid)
        );

        // Reverse for chronological display (oldest first)
        const orderedMessages = reverse ? newMessages.reverse() : newMessages;

        console.log(`[MESSAGES] Loaded ${orderedMessages.length} messages for conversation ${conversationId}`);
        setMessages(orderedMessages);
        setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
        setHasMore(snapshot.docs.length === limitCount);
        setLoading(false);
      },
      (err) => {
        console.error(`[MESSAGES] Error fetching messages for conversation ${conversationId}:`, err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [conversationId, user?.uid, limitCount, reverse]);

  const loadMore = useCallback(async () => {
    if (!conversationId || !user?.uid || !hasMore || !lastDoc) return;

    try {
      const messagesRef = collection(db, "conversations", conversationId, "messages");
      // Query: filter by participantIds to satisfy security rules, then order by createdAt descending
      const q = query(
        messagesRef,
        where("participantIds", "array-contains", user.uid),
        orderBy("createdAt", "desc"),
        startAfter(lastDoc),
        limit(limitCount)
      );

      const snapshot = await getDocs(q);
      const newMessages: Message[] = snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) =>
        parseMessageDoc(doc.id, doc.data(), user.uid)
      );

      // Prepend older messages (they come in descending order)
      const orderedNewMessages = reverse ? newMessages.reverse() : newMessages;
      setMessages((prev) => [...orderedNewMessages, ...prev]);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === limitCount);
    } catch (err) {
      console.error("Error loading more messages:", err);
    }
  }, [conversationId, user?.uid, hasMore, lastDoc, limitCount, reverse]);

  return {
    messages,
    loading,
    error,
    hasMore,
    loadMore,
  };
}

/**
 * Hook to subscribe to a single conversation's metadata
 */
export function useConversation(conversationId: string | null): {
  conversation: Conversation | null;
  loading: boolean;
  error: Error | null;
} {
  const { user } = useAuth();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!conversationId || !user?.uid) {
      setLoading(false);
      setConversation(null);
      return;
    }

    setLoading(true);
    setError(null);

    const conversationRef = doc(db, "conversations", conversationId);

    const unsubscribe = onSnapshot(
      conversationRef,
      { includeMetadataChanges: false },
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const data = docSnapshot.data();
          const parsed = parseConversationDoc(docSnapshot.id, data, user.uid);
          setConversation(parsed);
        } else {
          setConversation(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching conversation:", err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [conversationId, user?.uid]);

  return {
    conversation,
    loading,
    error,
  };
}
