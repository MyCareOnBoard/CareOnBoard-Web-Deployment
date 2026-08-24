/**
 * Firestore Messaging Hooks
 * Real-time subscriptions for conversations and messages using Firestore onSnapshot
 */

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
import { db } from "../firebase-firestore";
import { useAuth } from "@/utils/auth";
import { buildMessagingAuthScopeKey } from "@/lib/chat/messagingAuthScope";

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
  skip?: boolean;
}

interface UseConversationMessagesOptions {
  limit?: number;
  startAfter?: QueryDocumentSnapshot<DocumentData>;
  reverse?: boolean; // Reverse order for display
  skip?: boolean;
}

interface UseConversationOptions {
  skip?: boolean;
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

function appendCanonicalConversations(
  current: Conversation[],
  incoming: Conversation[],
  protectedIds: ReadonlySet<string> = new Set(),
): Conversation[] {
  const incomingOrder: string[] = [];
  const incomingById = new Map<string, Conversation>();
  for (const conversation of incoming) {
    if (!incomingById.has(conversation.id)) {
      incomingOrder.push(conversation.id);
    }
    incomingById.set(conversation.id, conversation);
  }

  const currentIds = new Set(current.map(({ id }) => id));
  const merged = current.map((conversation) =>
    protectedIds.has(conversation.id)
      ? conversation
      : incomingById.get(conversation.id) || conversation);
  for (const id of incomingOrder) {
    if (!currentIds.has(id) && !protectedIds.has(id)) {
      merged.push(incomingById.get(id)!);
    }
  }
  return merged;
}

function composeConversationWindows(
  firstWindow: Conversation[],
  continuation: Conversation[],
): Conversation[] {
  const firstWindowIds = new Set(firstWindow.map(({ id }) => id));
  return [
    ...firstWindow,
    ...continuation.filter(({ id }) => !firstWindowIds.has(id)),
  ];
}

function refreshContinuationCopies(
  continuation: Conversation[],
  firstWindow: Conversation[],
): Conversation[] {
  const firstWindowById = new Map(
    firstWindow.map((conversation) => [conversation.id, conversation]),
  );
  return continuation.map((conversation) =>
    firstWindowById.get(conversation.id) || conversation);
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
  const [conversationOwner, setConversationOwner] =
    useState<object | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const { limit: limitCount = 50, skip = false } = options;
  const authScopeKey = buildMessagingAuthScopeKey(user);
  const requestKey = skip || !user?.uid
    ? null
    : JSON.stringify([authScopeKey, limitCount]);
  const requestOwner = useMemo(
    () => requestKey ? { key: requestKey } : null,
    [requestKey],
  );
  const currentRequestOwnerRef = useRef(requestOwner);
  currentRequestOwnerRef.current = requestOwner;
  const firstWindowRef = useRef<Conversation[]>([]);
  const continuationRef = useRef<Conversation[]>([]);
  const continuationLoadedRef = useRef(false);
  const activeLoadRef = useRef<{
    owner: object;
    id: symbol;
  } | null>(null);

  useEffect(() => {
    activeLoadRef.current = null;
    firstWindowRef.current = [];
    continuationRef.current = [];
    continuationLoadedRef.current = false;

    if (!requestOwner || !user?.uid) {
      setConversationOwner(null);
      setLoading(false);
      setConversations([]);
      setError(null);
      setLastDoc(null);
      setHasMore(false);
      return;
    }

    const requestUserUid = user.uid;
    const owner = requestOwner;
    setConversationOwner(null);
    setConversations([]);
    setLoading(true);
    setError(null);
    setLastDoc(null);
    setHasMore(false);

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
        if (currentRequestOwnerRef.current !== owner) return;
        const newConversations: Conversation[] = snapshot.docs.map((doc) =>
          parseConversationDoc(doc.id, doc.data(), requestUserUid)
        );
        const canonicalWindow = appendCanonicalConversations(
          [],
          newConversations,
        );
        continuationRef.current = refreshContinuationCopies(
          continuationRef.current,
          canonicalWindow,
        );
        firstWindowRef.current = canonicalWindow;
        const preserveTail = continuationLoadedRef.current;

        setConversationOwner(owner);
        setConversations(composeConversationWindows(
          canonicalWindow,
          continuationRef.current,
        ));
        if (!preserveTail) {
          setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
          setHasMore(snapshot.docs.length === limitCount);
        }
        setError(null);
        setLoading(false);
      },
      (err: any) => {
        if (currentRequestOwnerRef.current !== owner) return;
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
        const snapshotError = err instanceof Error
          ? err
          : new Error("Failed to load conversations");
        activeLoadRef.current = null;
        setConversationOwner(owner);
        setConversations([]);
        firstWindowRef.current = [];
        continuationRef.current = [];
        continuationLoadedRef.current = false;
        setLastDoc(null);
        setHasMore(false);
        setError(snapshotError);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [limitCount, requestOwner, user?.uid]);

  const loadMore = useCallback(async () => {
    if (
      !requestOwner ||
      !user?.uid ||
      conversationOwner !== requestOwner ||
      !hasMore ||
      !lastDoc ||
      activeLoadRef.current !== null
    ) {
      return;
    }

    const owner = requestOwner;
    const load = { owner, id: Symbol("conversation-page") };
    activeLoadRef.current = load;
    setError(null);
    try {
      const requestUserUid = user.uid;
      const conversationsRef = collection(db, "conversations");
      const q = query(
        conversationsRef,
        where("participantIds", "array-contains", requestUserUid),
        orderBy("updatedAt", "desc"),
        startAfter(lastDoc),
        limit(limitCount)
      );

      const snapshot = await getDocs(q);
      const newConversations: Conversation[] = snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) =>
        parseConversationDoc(doc.id, doc.data(), requestUserUid)
      );

      if (
        currentRequestOwnerRef.current !== owner ||
        activeLoadRef.current !== load
      ) {
        return;
      }
      continuationLoadedRef.current = true;
      const firstWindowIds = new Set(
        firstWindowRef.current.map(({ id }) => id),
      );
      continuationRef.current = appendCanonicalConversations(
        continuationRef.current,
        newConversations.filter(({ id }) => !firstWindowIds.has(id)),
      );
      setConversations(composeConversationWindows(
        firstWindowRef.current,
        continuationRef.current,
      ));
      setLastDoc(
        snapshot.docs[snapshot.docs.length - 1] || lastDoc,
      );
      setHasMore(snapshot.docs.length === limitCount);
      setError(null);
    } catch (caught) {
      if (
        currentRequestOwnerRef.current !== owner ||
        activeLoadRef.current !== load
      ) {
        return;
      }
      const loadError = caught instanceof Error
        ? caught
        : new Error("Failed to load more conversations");
      console.error("Error loading more conversations:", loadError);
      setError(loadError);
      throw loadError;
    } finally {
      if (activeLoadRef.current === load) {
        activeLoadRef.current = null;
      }
    }
  }, [
    conversationOwner,
    hasMore,
    lastDoc,
    limitCount,
    requestOwner,
    user?.uid,
  ]);

  const isCurrentOwner = Boolean(requestOwner) &&
    conversationOwner === requestOwner;

  return {
    conversations: isCurrentOwner ? conversations : [],
    loading: !requestOwner ? false : (!isCurrentOwner ? true : loading),
    error: isCurrentOwner ? error : null,
    hasMore: isCurrentOwner ? hasMore : false,
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
  const [messageOwner, setMessageOwner] = useState<object | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const { limit: limitCount = 50, reverse = true, skip = false } = options;
  const authScopeKey = buildMessagingAuthScopeKey(user);
  const requestKey = skip || !conversationId || !user?.uid
    ? null
    : JSON.stringify([
      authScopeKey,
      conversationId,
      limitCount,
      reverse,
    ]);
  const requestOwner = useMemo(
    () => requestKey ? { key: requestKey } : null,
    [requestKey],
  );
  const currentRequestOwnerRef = useRef(requestOwner);
  currentRequestOwnerRef.current = requestOwner;
  const activeLoadRef = useRef<{
    owner: object;
    id: symbol;
  } | null>(null);

  useEffect(() => {
    activeLoadRef.current = null;
    if (!requestOwner || !conversationId || !user?.uid) {
      setMessageOwner(null);
      setLoading(false);
      setMessages([]);
      setError(null);
      setLastDoc(null);
      setHasMore(false);
      return;
    }

    const owner = requestOwner;
    const requestUserUid = user.uid;
    setMessageOwner(null);
    setLoading(true);
    setError(null);
    setMessages([]);
    setLastDoc(null);
    setHasMore(false);

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
        if (currentRequestOwnerRef.current !== owner) return;
        const newMessages: Message[] = snapshot.docs.map((doc) =>
          parseMessageDoc(doc.id, doc.data(), requestUserUid)
        );

        // Reverse for chronological display (oldest first)
        const orderedMessages = reverse ? newMessages.reverse() : newMessages;

        console.log(`[MESSAGES] Loaded ${orderedMessages.length} messages for conversation ${conversationId}`);
        setMessageOwner(owner);
        setMessages(orderedMessages);
        setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
        setHasMore(snapshot.docs.length === limitCount);
        setError(null);
        setLoading(false);
      },
      (err) => {
        if (currentRequestOwnerRef.current !== owner) return;
        console.error(`[MESSAGES] Error fetching messages for conversation ${conversationId}:`, err);
        const snapshotError = err instanceof Error
          ? err
          : new Error("Failed to load messages");
        activeLoadRef.current = null;
        setMessageOwner(owner);
        setMessages([]);
        setLastDoc(null);
        setHasMore(false);
        setError(snapshotError);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [conversationId, limitCount, requestOwner, reverse, user?.uid]);

  const loadMore = useCallback(async () => {
    if (
      !requestOwner ||
      !conversationId ||
      !user?.uid ||
      messageOwner !== requestOwner ||
      !hasMore ||
      !lastDoc ||
      activeLoadRef.current !== null
    ) {
      return;
    }

    const owner = requestOwner;
    const load = { owner, id: Symbol("message-page") };
    activeLoadRef.current = load;
    setError(null);
    try {
      const requestUserUid = user.uid;
      const messagesRef = collection(db, "conversations", conversationId, "messages");
      // Query: filter by participantIds to satisfy security rules, then order by createdAt descending
      const q = query(
        messagesRef,
        where("participantIds", "array-contains", requestUserUid),
        orderBy("createdAt", "desc"),
        startAfter(lastDoc),
        limit(limitCount)
      );

      const snapshot = await getDocs(q);
      const newMessages: Message[] = snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) =>
        parseMessageDoc(doc.id, doc.data(), requestUserUid)
      );

      if (
        currentRequestOwnerRef.current !== owner ||
        activeLoadRef.current !== load
      ) {
        return;
      }
      // Prepend older messages (they come in descending order)
      const orderedNewMessages = reverse ? newMessages.reverse() : newMessages;
      setMessages((current) => {
        const currentIds = new Set(current.map(({ id }) => id));
        return [
          ...orderedNewMessages.filter(({ id }) => !currentIds.has(id)),
          ...current,
        ];
      });
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || lastDoc);
      setHasMore(snapshot.docs.length === limitCount);
      setError(null);
    } catch (caught) {
      if (
        currentRequestOwnerRef.current !== owner ||
        activeLoadRef.current !== load
      ) {
        return;
      }
      const loadError = caught instanceof Error
        ? caught
        : new Error("Failed to load more messages");
      console.error("Error loading more messages:", loadError);
      setError(loadError);
      throw loadError;
    } finally {
      if (activeLoadRef.current === load) {
        activeLoadRef.current = null;
      }
    }
  }, [
    conversationId,
    hasMore,
    lastDoc,
    limitCount,
    messageOwner,
    requestOwner,
    reverse,
    user?.uid,
  ]);

  const isCurrentOwner = Boolean(requestOwner) && messageOwner === requestOwner;

  return {
    messages: isCurrentOwner ? messages : [],
    loading: !requestOwner ? false : (!isCurrentOwner ? true : loading),
    error: isCurrentOwner ? error : null,
    hasMore: isCurrentOwner ? hasMore : false,
    loadMore,
  };
}

/**
 * Hook to subscribe to a single conversation's metadata
 */
export function useConversation(
  conversationId: string | null,
  options: UseConversationOptions = {},
): {
  conversation: Conversation | null;
  loading: boolean;
  error: Error | null;
} {
  const { user } = useAuth();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [conversationOwner, setConversationOwner] =
    useState<object | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { skip = false } = options;
  const authScopeKey = buildMessagingAuthScopeKey(user);
  const requestKey = skip || !conversationId || !user?.uid
    ? null
    : JSON.stringify([authScopeKey, conversationId]);
  const requestOwner = useMemo(
    () => requestKey ? { key: requestKey } : null,
    [requestKey],
  );
  const currentRequestOwnerRef = useRef(requestOwner);
  currentRequestOwnerRef.current = requestOwner;

  useEffect(() => {
    if (!requestOwner || !conversationId || !user?.uid) {
      setConversationOwner(null);
      setLoading(false);
      setConversation(null);
      setError(null);
      return;
    }

    const owner = requestOwner;
    const requestUserUid = user.uid;
    setConversationOwner(null);
    setLoading(true);
    setError(null);
    setConversation(null);

    const conversationRef = doc(db, "conversations", conversationId);

    const unsubscribe = onSnapshot(
      conversationRef,
      { includeMetadataChanges: false },
      (docSnapshot) => {
        if (currentRequestOwnerRef.current !== owner) return;
        if (docSnapshot.exists()) {
          const data = docSnapshot.data();
          const parsed = parseConversationDoc(
            docSnapshot.id,
            data,
            requestUserUid,
          );
          setConversation(parsed);
        } else {
          setConversation(null);
        }
        setConversationOwner(owner);
        setError(null);
        setLoading(false);
      },
      (err) => {
        if (currentRequestOwnerRef.current !== owner) return;
        console.error("Error fetching conversation:", err);
        const snapshotError = err instanceof Error
          ? err
          : new Error("Failed to load conversation");
        setConversationOwner(owner);
        setConversation(null);
        setError(snapshotError);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [conversationId, requestOwner, user?.uid]);

  const isCurrentOwner = Boolean(requestOwner) &&
    conversationOwner === requestOwner;

  return {
    conversation: isCurrentOwner ? conversation : null,
    loading: !requestOwner ? false : (!isCurrentOwner ? true : loading),
    error: isCurrentOwner ? error : null,
  };
}
