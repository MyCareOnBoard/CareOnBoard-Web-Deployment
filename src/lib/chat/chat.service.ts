/**
 * Chat Service (Temporarily Disabled)
 *
 * Firebase Firestore implementation has been removed.
 * Chat functionality needs to be implemented with a backend API.
 *
 * TODO: Implement REST/WebSocket backend for:
 * - subscribeToThreads → REST GET /threads + WebSocket for real-time
 * - subscribeToMessages → REST GET /threads/{id}/messages + WebSocket
 * - sendMessage → REST POST /messages
 * - createThread → REST POST /threads
 * - fetchUsers → REST GET /users
 * - fetchThreadById → REST GET /threads/{id}
 *
 * The hook layer (chat.hooks.ts) abstracts these calls, so UI won't need changes.
 */

import { auth } from "@/lib/firebase";
import type {
  ChatUser,
  Thread,
  Message,
  CreateThreadRequest,
  SendMessageRequest,
} from "./chat.types";

/**
 * Subscribe to threads where current user is a participant
 * Real-time updates via REST/WebSocket (to be implemented)
 *
 * @param userId - The current authenticated user's UID
 * @param onThreadsUpdate - Callback function called on data changes
 * @returns Unsubscribe function to stop listening
 */
export function subscribeToThreads(
  userId: string,
  onThreadsUpdate: (threads: Thread[]) => void
) {
  // TODO: Implement REST/WebSocket backend
  console.warn("Chat functionality not yet implemented. Awaiting backend API.");
  return () => {}; // Return unsubscribe function
}

/**
 * Subscribe to messages in a specific thread
 * Real-time updates via REST/WebSocket (to be implemented)
 *
 * @param threadId - The thread ID to listen to
 * @param onMessagesUpdate - Callback function called on data changes
 * @returns Unsubscribe function to stop listening
 */
export function subscribeToMessages(
  threadId: string,
  onMessagesUpdate: (messages: Message[]) => void
) {
  // TODO: Implement REST/WebSocket backend
  console.warn("Chat functionality not yet implemented. Awaiting backend API.");
  return () => {}; // Return unsubscribe function
}

/**
 * Send a message to a thread
 * Creates a new message via REST API (to be implemented)
 *
 * @param request - SendMessageRequest containing threadId and text
 * @returns Promise resolving to the new message ID
 */
export async function sendMessage(
  request: SendMessageRequest
): Promise<string> {
  // TODO: Implement REST backend
  throw new Error("Chat functionality not yet implemented. Awaiting backend API.");
}

/**
 * Create a new thread with specified participants
 * Initializes empty thread with current user as participant
 *
 * @param request - CreateThreadRequest containing participant IDs
 * @returns Promise resolving to the new thread ID
 */
export async function createThread(
  request: CreateThreadRequest
): Promise<string> {
  // TODO: Implement REST backend
  throw new Error("Chat functionality not yet implemented. Awaiting backend API.");
}

/**
 * Fetch a specific thread by ID
 * One-time read operation (not real-time)
 *
 * @param threadId - The thread ID to fetch
 * @returns Promise resolving to Thread data or null if not found
 */
export async function fetchThreadById(threadId: string): Promise<Thread | null> {
  // TODO: Implement REST backend
  throw new Error("Chat functionality not yet implemented. Awaiting backend API.");
}

/**
 * Fetch all users from the users collection
 * One-time read operation (not real-time)
 * Used to populate the New Message modal
 *
 * @returns Promise resolving to array of ChatUser objects
 */
export async function fetchUsers(): Promise<ChatUser[]> {
  // TODO: Implement REST backend
  throw new Error("Chat functionality not yet implemented. Awaiting backend API.");
}

/**
 * Fetch a specific user by UID
 * One-time read operation
 *
 * @param uid - The user's UID
 * @returns Promise resolving to ChatUser or null if not found
 */
export async function fetchUserById(uid: string): Promise<ChatUser | null> {
  // TODO: Implement REST backend
  throw new Error("Chat functionality not yet implemented. Awaiting backend API.");
}

/**
 * Get current authenticated user info
 * Retrieves user info from Firebase Auth
 *
 * @returns Promise resolving to ChatUser or null if not authenticated
 */
export async function getCurrentUser(): Promise<ChatUser | null> {
  const authUser = auth.currentUser;
  if (!authUser) {
    return null;
  }

  // Return basic user info from Firebase Auth only
  return {
    uid: authUser.uid,
    name: authUser.displayName || "User",
    role: "Client", // Default role - should come from user profile/backend
    avatar: authUser.displayName?.substring(0, 2).toUpperCase() || "U",
  };
}
