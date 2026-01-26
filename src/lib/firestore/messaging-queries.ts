/**
 * Firestore Query Helpers for Messaging
 * Type-safe query builders for conversations and messages
 */

import {
  collection,
  doc,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  startAfter,
  Query,
  DocumentData,
  QueryDocumentSnapshot,
  DocumentReference,
} from "firebase/firestore";
import { db } from "../firebase";

const COLLECTIONS = {
  CONVERSATIONS: "conversations",
  MESSAGES: "messages",
};

/**
 * Build query for user's conversations
 * @param userId - Current user ID
 * @param filters - Optional filters
 * @returns Firestore query
 */
export function getConversationsQuery(
  userId: string,
  filters?: {
    limit?: number;
    startAfter?: QueryDocumentSnapshot<DocumentData>;
    role?: string;
    search?: string;
  }
): Query<DocumentData> {
  const conversationsRef = collection(db, COLLECTIONS.CONVERSATIONS);
  
  let q: Query<DocumentData> = query(
    conversationsRef,
    where("participantIds", "array-contains", userId),
    orderBy("updatedAt", "desc")
  );

  if (filters?.limit) {
    q = query(q, firestoreLimit(filters.limit));
  }

  if (filters?.startAfter) {
    q = query(q, startAfter(filters.startAfter));
  }

  // Note: role and search filters are applied client-side after fetching
  // Firestore doesn't support complex text search natively

  return q;
}

/**
 * Build query for messages in a conversation
 * @param conversationId - Conversation ID
 * @param options - Query options
 * @returns Firestore query
 */
export function getMessagesQuery(
  conversationId: string,
  options?: {
    limit?: number;
    startAfter?: QueryDocumentSnapshot<DocumentData>;
    before?: Date; // Load messages before this date
  }
): Query<DocumentData> {
  const messagesRef = collection(
    db,
    COLLECTIONS.CONVERSATIONS,
    conversationId,
    COLLECTIONS.MESSAGES
  );

  let q: Query<DocumentData> = query(
    messagesRef,
    orderBy("createdAt", "desc")
  );

  if (options?.before) {
    q = query(q, where("createdAt", "<", options.before));
  }

  if (options?.limit) {
    q = query(q, firestoreLimit(options.limit));
  }

  if (options?.startAfter) {
    q = query(q, startAfter(options.startAfter));
  }

  return q;
}

/**
 * Build query for a single conversation
 * @param conversationId - Conversation ID
 * @returns Firestore document reference
 */
export function getConversationQuery(conversationId: string): DocumentReference<DocumentData> {
  return doc(db, COLLECTIONS.CONVERSATIONS, conversationId);
}

/**
 * Get Firestore path helpers
 */
export function getFirestoreConversationPath(conversationId: string): string {
  return `${COLLECTIONS.CONVERSATIONS}/${conversationId}`;
}

export function getFirestoreMessagesPath(conversationId: string): string {
  return `${COLLECTIONS.CONVERSATIONS}/${conversationId}/${COLLECTIONS.MESSAGES}`;
}
