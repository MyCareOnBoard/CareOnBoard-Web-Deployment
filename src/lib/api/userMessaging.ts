/**
 * User Messaging API Service
 * Handles all API calls related to user/employee messaging
 * Uses Redux RTK Query for state management
 */

import { createApi } from "@reduxjs/toolkit/query/react";
import { customBaseQuery } from "@/lib/baseQuery";
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
  agencyName?: string;
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
  agencyName?: string;
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
  attachments?: {
    type: "image" | "file";
    url: string;
    name?: string;
  }[];
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

/**
 * Get Messages Params
 */
export interface GetMessagesParams {
  conversationId: string;
  page?: number;
  limit?: number;
}

/**
 * Send Message Params
 */
export interface SendMessageParams {
  conversationId: string;
  payload: SendMessagePayload;
}

/**
 * Mark Messages Read Params
 */
export interface MarkMessagesReadParams {
  conversationId: string;
  payload: MarkAsReadPayload;
}

/**
 * Upload Attachment Response
 */
export interface UploadAttachmentResponse {
  success: boolean;
  data: {
    fileName: string;
    fileSize: number;
    fileType: string;
    url: string;
    storagePath: string;
    uploadedAt: string;
  };
}

export interface UploadAttachmentParams {
  file: File;
}

// ==================== RTK Query API ====================

export const userMessagingApi = createApi({
  reducerPath: "userMessagingApi",
  baseQuery: customBaseQuery,
  tagTypes: ['Conversations', 'Messages', 'Contacts'],
  keepUnusedDataFor: 300,
  endpoints: (builder) => ({
    // Get all conversations for authenticated user
    getConversations: builder.query<GetConversationsResponse, void>({
      query: () => ({
        url: USER_MESSAGING_BASE,
        method: "GET",
        requiresAuth: true
      }),
      providesTags: ['Conversations'],
    }),

    // Get specific conversation by ID
    getConversationById: builder.query<GetConversationResponse, string>({
      query: (conversationId) => ({
        url: `${USER_MESSAGING_BASE}/${conversationId}`,
        method: "GET",
        requiresAuth: true
      }),
      providesTags: (_result, _error, id) => [{ type: 'Conversations', id }],
    }),

    // Get contacts available for messaging
    getContacts: builder.query<GetContactsResponse, void>({
      query: () => ({
        url: `${USER_MESSAGING_BASE}/contacts`,
        method: "GET",
        requiresAuth: true
      }),
      providesTags: ['Contacts'],
    }),

    // Get messages in conversation
    getMessages: builder.query<GetMessagesResponse, GetMessagesParams>({
      query: ({ conversationId, page, limit }) => {
        const params = new URLSearchParams();
        if (page !== undefined) params.append('page', page.toString());
        if (limit !== undefined) params.append('limit', limit.toString());
        const queryString = params.toString();

        return {
          url: `${USER_MESSAGING_BASE}/${conversationId}/messages${queryString ? `?${queryString}` : ''}`,
          method: "GET",
          requiresAuth: true
        };
      },
      providesTags: (_result, _error, { conversationId }) => [
        { type: 'Messages', id: conversationId }
      ],
    }),

    // Create new conversation
    createConversation: builder.mutation<GetConversationResponse, CreateConversationPayload>({
      query: (payload) => ({
        url: USER_MESSAGING_BASE,
        method: "POST",
        data: payload,
        requiresAuth: true
      }),
      invalidatesTags: ['Conversations'],
    }),

    // Send message in conversation
    sendMessage: builder.mutation<ApiResponse<UserMessage>, SendMessageParams>({
      query: ({ conversationId, payload }) => {
        if (!conversationId || typeof conversationId !== 'string' || conversationId.trim() === '') {
          throw new Error('Invalid conversation ID: conversationId must be a non-empty string');
        }
        return {
          url: `${USER_MESSAGING_BASE}/${conversationId}/messages`,
          method: "POST",
          data: payload,
          requiresAuth: true
        };
      },
      invalidatesTags: (_result, _error, { conversationId }) => [
        { type: 'Messages', id: conversationId },
        'Conversations'
      ],
    }),

    // Mark messages as read
    markMessagesAsRead: builder.mutation<ApiResponse<void>, MarkMessagesReadParams>({
      query: ({ conversationId, payload }) => ({
        url: `${USER_MESSAGING_BASE}/${conversationId}/read`,
        method: "POST",
        data: payload,
        requiresAuth: true
      }),
      invalidatesTags: (_result, _error, { conversationId }) => [
        { type: 'Messages', id: conversationId },
        'Conversations'
      ],
    }),

    // Leave/delete conversation
    leaveConversation: builder.mutation<ApiResponse<void>, string>({
      query: (conversationId) => ({
        url: `${USER_MESSAGING_BASE}/${conversationId}`,
        method: "DELETE",
        requiresAuth: true
      }),
      invalidatesTags: ['Conversations'],
    }),

    // Upload attachment for user messaging
    uploadAttachment: builder.mutation<UploadAttachmentResponse, UploadAttachmentParams>({
      query: ({ file }) => {
        const formData = new FormData();
        formData.append('file', file);

        return {
          url: `${USER_MESSAGING_BASE}/upload`,
          method: "POST",
          data: formData,
          requiresAuth: true,
          headers: {
            // Let the browser set the correct multipart boundary
            // but some backends rely on this explicit header
            'Content-Type': 'multipart/form-data',
          },
        };
      },
    }),
  }),
});

// Export RTK Query hooks
export const {
  useGetConversationsQuery,
  useGetConversationByIdQuery,
  useGetContactsQuery,
  useGetMessagesQuery,
  useCreateConversationMutation,
  useSendMessageMutation,
  useMarkMessagesAsReadMutation,
  useLeaveConversationMutation,
  useUploadAttachmentMutation,
} = userMessagingApi;

