/**
 * Chat Types and Interfaces
 *
 * Defines all TypeScript types for Firebase chat functionality.
 * These types are designed to be backend-agnostic - they can be easily
 * swapped with REST/WebSocket API types without changing UI components.
 */

/**
 * User type - represents a person in the chat system
 * Maps to: users/{uid} collection in Firestore
 */
export interface ChatUser {
  uid: string;
  name: string;
  role: "DSP" | "Client" | "Admin";
  avatar: string;
}

/**
 * Thread type - represents a conversation/chat thread
 * Maps to: threads/{threadId} collection in Firestore
 */
export interface Thread {
  id: string;
  participants: string[]; // Array of user UIDs
  lastMessage: string;
  lastMessageAt: Date;
  createdAt?: Date;
}

/**
 * Message type - represents a single message in a thread
 * Maps to: threads/{threadId}/messages/{messageId} subcollection in Firestore
 */
export interface Message {
  id: string;
  threadId: string;
  senderId: string;
  text: string;
  createdAt: Date;
  // Future fields for easy migration:
  // attachments?: Attachment[];
  // edited?: boolean;
  // editedAt?: Date;
  // reactions?: Record<string, string[]>;
}

/**
 * Thread with metadata for UI display
 * Combines Thread data with sender information
 */
export interface ThreadWithUser extends Thread {
  otherUser?: ChatUser; // For 1-to-1 chats
  unreadCount?: number; // For future unread tracking
}

/**
 * Extended message with sender info for display
 */
export interface MessageWithSender extends Message {
  sender?: ChatUser;
}

/**
 * Chat context state type
 * Represents the complete chat state for a user
 */
export interface ChatContextState {
  currentUser: ChatUser | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Request type for creating a new thread
 */
export interface CreateThreadRequest {
  participantIds: string[];
}

/**
 * Request type for sending a message
 */
export interface SendMessageRequest {
  threadId: string;
  text: string;
}
