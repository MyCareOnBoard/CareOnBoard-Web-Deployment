/**
 * User Messaging API Service
 * Handles all API calls related to user/employee messaging
 */

import axiosClient from '../axios';
import { ApiResponse } from '../api-types';

// API endpoint constants
const USER_MESSAGING_BASE = '/userMessaging';

// ==================== Type Definitions ====================

/**
 * Contact/Agency Member Interface
 */
export interface AgencyContact {
  id: string;
  uid: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  department?: string;
  isActive: boolean;
}

/**
 * Conversation Participant Interface
 */
export interface ConversationParticipant {
  id: string;
  uid: string;
  name: string;
  role: string;
  avatar?: string;
  email?: string;
}

/**
 * Message Attachment Interface
 */
export interface MessageAttachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
}

/**
 * Message Interface
 */
export interface UserMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  senderAvatar?: string;
  content: string;
  attachments?: MessageAttachment[];
  readBy: string[];
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Conversation Interface
 */
export interface UserConversation {
  id: string;
  type: 'direct' | 'group';
  topic?: string;
  participantIds: string[];
  participants: ConversationParticipant[];
  lastMessage?: string;
  lastMessageAt?: string;
  lastMessageSenderId?: string;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

/**
 * Create Conversation Payload
 */
export interface CreateConversationPayload {
  participantIds: string[];
  topic?: string;
  initialMessage?: string;
}

/**
 * Send Message Payload
 */
export interface SendMessagePayload {
  content: string;
  attachments?: string[];
}

/**
 * Mark as Read Payload
 */
export interface MarkAsReadPayload {
  messageIds: string[];
}

/**
 * Get Conversations Response
 */
export interface GetConversationsResponse {
  success: boolean;
  data: UserConversation[];
  count: number;
}

/**
 * Get Conversation Response
 */
export interface GetConversationResponse {
  success: boolean;
  data: UserConversation;
}

/**
 * Get Messages Response
 */
export interface GetMessagesResponse {
  success: boolean;
  data: UserMessage[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

/**
 * Get Contacts Response
 */
export interface GetContactsResponse {
  success: boolean;
  data: AgencyContact[];
}

// ==================== API Functions ====================

/**
 * Get all conversations for authenticated user
 * @returns Promise with conversations response
 */
export const getUserConversations = async (): Promise<GetConversationsResponse> => {
  try {
    const response = await axiosClient.get(USER_MESSAGING_BASE);
    return response.data;
  } catch (error: any) {
    console.error('Error fetching user conversations:', error);
    throw error;
  }
};

/**
 * Create new conversation
 * @param payload - Create conversation payload
 * @returns Promise with created conversation
 */
export const createUserConversation = async (
  payload: CreateConversationPayload
): Promise<GetConversationResponse> => {
  try {
    const response = await axiosClient.post(USER_MESSAGING_BASE, payload);
    return response.data;
  } catch (error: any) {
    console.error('Error creating conversation:', error);
    throw error;
  }
};

/**
 * Get agency members available for messaging
 * @returns Promise with contacts response
 */
export const getUserContacts = async (): Promise<GetContactsResponse> => {
  try {
    const response = await axiosClient.get(`${USER_MESSAGING_BASE}/contacts`);
    return response.data;
  } catch (error: any) {
    console.error('Error fetching contacts:', error);
    throw error;
  }
};

/**
 * Get specific conversation by ID
 * @param conversationId - Conversation ID
 * @returns Promise with conversation details
 */
export const getUserConversationById = async (
  conversationId: string
): Promise<GetConversationResponse> => {
  try {
    const response = await axiosClient.get(`${USER_MESSAGING_BASE}/${conversationId}`);
    return response.data;
  } catch (error: any) {
    console.error('Error fetching conversation:', error);
    throw error;
  }
};

/**
 * Leave/delete conversation
 * @param conversationId - Conversation ID
 * @returns Promise with success response
 */
export const leaveUserConversation = async (
  conversationId: string
): Promise<ApiResponse<void>> => {
  try {
    const response = await axiosClient.delete(`${USER_MESSAGING_BASE}/${conversationId}`);
    return response.data;
  } catch (error: any) {
    console.error('Error leaving conversation:', error);
    throw error;
  }
};

/**
 * Get messages in conversation
 * @param conversationId - Conversation ID
 * @param page - Page number (optional)
 * @param limit - Messages per page (optional)
 * @returns Promise with messages response
 */
export const getUserConversationMessages = async (
  conversationId: string,
  page?: number,
  limit?: number
): Promise<GetMessagesResponse> => {
  try {
    const params: any = {};
    if (page !== undefined) params.page = page;
    if (limit !== undefined) params.limit = limit;

    const response = await axiosClient.get(
      `${USER_MESSAGING_BASE}/${conversationId}/messages`,
      { params }
    );
    return response.data;
  } catch (error: any) {
    console.error('Error fetching messages:', error);
    throw error;
  }
};

/**
 * Send message in conversation
 * @param conversationId - Conversation ID
 * @param payload - Send message payload
 * @returns Promise with created message
 */
export const sendUserMessage = async (
  conversationId: string,
  payload: SendMessagePayload
): Promise<ApiResponse<UserMessage>> => {
  if (!conversationId || typeof conversationId !== 'string' || conversationId.trim() === '') {
    const error = new Error('Invalid conversation ID: conversationId must be a non-empty string');
    console.error('Error sending message:', error);
    throw error;
  }

  try {
    const response = await axiosClient.post(
      `${USER_MESSAGING_BASE}/${conversationId}/messages`,
      payload
    );
    return response.data;
  } catch (error: any) {
    console.error('Error sending message:', error);
    throw error;
  }
};

/**
 * Mark messages as read
 * @param conversationId - Conversation ID
 * @param payload - Mark as read payload
 * @returns Promise with success response
 */
export const markUserMessagesAsRead = async (
  conversationId: string,
  payload: MarkAsReadPayload
): Promise<ApiResponse<void>> => {
  try {
    const response = await axiosClient.post(
      `${USER_MESSAGING_BASE}/${conversationId}/read`,
      payload
    );
    return response.data;
  } catch (error: any) {
    console.error('Error marking messages as read:', error);
    throw error;
  }
};
