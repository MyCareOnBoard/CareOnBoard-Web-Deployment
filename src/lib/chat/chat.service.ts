/**
 * Firebase Chat Service
 *
 * Core service for all chat operations with Firestore.
 * Handles real-time listeners, CRUD operations, and data synchronization.
 *
 * MIGRATION NOTES:
 * This service is designed to be easily replaceable with a REST/WebSocket backend.
 * When migrating, replace:
 * - subscribeToThreads → REST GET /threads + WebSocket for real-time
 * - subscribeToMessages → REST GET /threads/{id}/messages + WebSocket
 * - sendMessage → REST POST /messages
 * - createThread → REST POST /threads
 * - fetchUsers → REST GET /users
 * - fetchThreadById → REST GET /threads/{id}
 *
 * The hook layer (chat.hooks.ts) abstracts these calls, so UI won't need changes.
 */

import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  serverTimestamp,
  getDoc,
  doc,
  updateDoc,
  orderBy,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
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
 * Real-time updates via Firestore onSnapshot
 *
 * @param userId - The current authenticated user's UID
 * @param onThreadsUpdate - Callback function called on data changes
 * @returns Unsubscribe function to stop listening
 */
export function subscribeToThreads(
  userId: string,
  onThreadsUpdate: (threads: Thread[]) => void
) {
  const q = query(
    collection(db, "threads"),
    where("participants", "array-contains", userId)
  );

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const threads: Thread[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        threads.push({
          id: doc.id,
          participants: data.participants || [],
          lastMessage: data.lastMessage || "",
          lastMessageAt: data.lastMessageAt?.toDate() || new Date(),
          createdAt: data.createdAt?.toDate(),
        });
      });

      // Sort by most recent first
      threads.sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime());
      onThreadsUpdate(threads);
    },
    (error) => {
      console.error("Error subscribing to threads:", error);
      throw error;
    }
  );

  return unsubscribe;
}

/**
 * Subscribe to messages in a specific thread
 * Real-time updates via Firestore onSnapshot
 *
 * @param threadId - The thread ID to listen to
 * @param onMessagesUpdate - Callback function called on data changes
 * @returns Unsubscribe function to stop listening
 */
export function subscribeToMessages(
  threadId: string,
  onMessagesUpdate: (messages: Message[]) => void
) {
  const q = query(
    collection(db, `threads/${threadId}/messages`),
    orderBy("createdAt", "asc")
  );

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const messages: Message[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        messages.push({
          id: doc.id,
          threadId,
          senderId: data.senderId,
          text: data.text,
          createdAt: data.createdAt?.toDate() || new Date(),
        });
      });

      onMessagesUpdate(messages);
    },
    (error) => {
      console.error("Error subscribing to messages:", error);
      throw error;
    }
  );

  return unsubscribe;
}

/**
 * Send a message to a thread
 * Creates a new message document and updates thread metadata
 *
 * @param request - SendMessageRequest containing threadId and text
 * @returns Promise resolving to the new message ID
 */
export async function sendMessage(
  request: SendMessageRequest
): Promise<string> {
  const userId = auth.currentUser?.uid;
  if (!userId) {
    throw new Error("User must be authenticated to send messages");
  }

  try {
    // Add message to subcollection
    const messageRef = await addDoc(
      collection(db, `threads/${request.threadId}/messages`),
      {
        senderId: userId,
        text: request.text,
        createdAt: serverTimestamp(),
      }
    );

    // Update thread's last message metadata
    await updateDoc(doc(db, "threads", request.threadId), {
      lastMessage: request.text,
      lastMessageAt: serverTimestamp(),
    });

    return messageRef.id;
  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
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
  const userId = auth.currentUser?.uid;
  if (!userId) {
    throw new Error("User must be authenticated to create threads");
  }

  try {
    // Ensure current user is in participants and remove duplicates
    const participants = Array.from(
      new Set([userId, ...request.participantIds])
    );

    const threadRef = await addDoc(collection(db, "threads"), {
      participants,
      lastMessage: "",
      lastMessageAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    });

    return threadRef.id;
  } catch (error) {
    console.error("Error creating thread:", error);
    throw error;
  }
}

/**
 * Fetch a specific thread by ID
 * One-time read operation (not real-time)
 *
 * @param threadId - The thread ID to fetch
 * @returns Promise resolving to Thread data or null if not found
 */
export async function fetchThreadById(threadId: string): Promise<Thread | null> {
  try {
    const docSnap = await getDoc(doc(db, "threads", threadId));

    if (!docSnap.exists()) {
      return null;
    }

    const data = docSnap.data();
    return {
      id: docSnap.id,
      participants: data.participants || [],
      lastMessage: data.lastMessage || "",
      lastMessageAt: data.lastMessageAt?.toDate() || new Date(),
      createdAt: data.createdAt?.toDate(),
    };
  } catch (error) {
    console.error("Error fetching thread:", error);
    throw error;
  }
}

/**
 * Fetch all users from the users collection
 * One-time read operation (not real-time)
 * Used to populate the New Message modal
 *
 * @returns Promise resolving to array of ChatUser objects
 */
export async function fetchUsers(): Promise<ChatUser[]> {
  try {
    const snapshot = await getDocs(collection(db, "users"));
    const users: ChatUser[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      users.push({
        uid: doc.id,
        name: data.name,
        role: data.role,
        avatar: data.avatar,
      });
    });

    // Sort by name for better UX
    users.sort((a, b) => a.name.localeCompare(b.name));
    return users;
  } catch (error) {
    console.error("Error fetching users:", error);
    throw error;
  }
}

/**
 * Fetch a specific user by UID
 * One-time read operation
 *
 * @param uid - The user's UID
 * @returns Promise resolving to ChatUser or null if not found
 */
export async function fetchUserById(uid: string): Promise<ChatUser | null> {
  try {
    const docSnap = await getDoc(doc(db, "users", uid));

    if (!docSnap.exists()) {
      return null;
    }

    const data = docSnap.data();
    return {
      uid: docSnap.id,
      name: data.name,
      role: data.role,
      avatar: data.avatar,
    };
  } catch (error) {
    console.error("Error fetching user:", error);
    throw error;
  }
}

/**
 * Get current authenticated user info from Firestore
 * Falls back to basic auth user info if Firestore document doesn't exist
 *
 * @returns Promise resolving to ChatUser or null if not authenticated
 */
export async function getCurrentUser(): Promise<ChatUser | null> {
  const authUser = auth.currentUser;
  if (!authUser) {
    return null;
  }

  try {
    const user = await fetchUserById(authUser.uid);
    if (user) {
      return user;
    }

    // Fallback if user doesn't exist in Firestore
    return {
      uid: authUser.uid,
      name: authUser.displayName || "User",
      role: "Client",
      avatar: authUser.displayName?.substring(0, 2).toUpperCase() || "U",
    };
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
}
