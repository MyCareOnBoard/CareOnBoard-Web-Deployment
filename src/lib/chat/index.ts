/**
 * Chat Module Exports
 * 
 * Centralized exports for chat functionality.
 * Makes imports cleaner throughout the application.
 */

// Export types
export type {
  ChatUser,
  Thread,
  Message,
  ThreadWithUser,
  MessageWithSender,
  ChatContextState,
  CreateThreadRequest,
  SendMessageRequest,
} from './chat.types';

// Export service functions
export {
  subscribeToThreads,
  subscribeToMessages,
  sendMessage,
  createThread,
  fetchThreadById,
  fetchUsers,
  fetchUserById,
  getCurrentUser,
} from './chat.service';

// Export hooks
export {
  useThreads,
  useMessages,
  useAvailableUsers,
  useSendMessage,
  useCreateThread,
  useCurrentUser,
  useThreadWithUser,
  useMessagesWithSenders,
  useAuth,
} from './chat.hooks';
