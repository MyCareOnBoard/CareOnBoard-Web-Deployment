import axiosClient from '../axios';
import { ApiResponse } from '../api-types';

/**
 * Super Admin Messaging API
 * 
 * REST API endpoints for super admin chat/messaging functionality
 * in the Corporate Support page.
 */

/**
 * User Type Options
 */
export type UserType = "employee" | "agency_admin" | "super_admin" | "client";

/**
 * User Role Options
 */
export type UserRole = "dsp" | "supervisor" | "admin" | "client";

/**
 * Chat User Interface for Search Results
 */
export interface SearchUser {
  uid: string;
  fullName: string;
  email: string;
  role: UserRole;
  userType: UserType;
  agencyId?: string;
  agencyName?: string;
  profileImageUrl?: string;
  hasExistingConversation: boolean;
  conversationId?: string;
}

/**
 * Conversation User Info
 */
export interface ConversationUser {
  fullName: string;
  email: string;
  role: UserRole;
  userType: UserType;
  agencyId?: string;
  agencyName?: string;
  profileImageUrl?: string;
}

/**
 * Last Message Info
 */
export interface LastMessage {
  text: string;
  senderId: string;
  timestamp: string;
}

/**
 * Conversation Interface
 */
export interface Conversation {
  id: string;
  user: ConversationUser;
  lastMessage?: LastMessage;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Message Attachment Interface
 */
export interface MessageAttachment {
  url: string;
  fileName: string;
  fileType: string;
  fileSize: number;
}

/**
 * Message Interface
 */
export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  text: string;
  attachments?: MessageAttachment[];
  readBy: Record<string, string | null>;
  createdAt: string;
  isOwnMessage: boolean;
}

/**
 * Pagination Interface
 */
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Create Conversation Request
 */
export interface CreateConversationRequest {
  userId: string;
  userType: UserType;
}

/**
 * Send Message Request
 */
export interface SendMessageRequest {
  text: string;
  attachments?: MessageAttachment[];
}

/**
 * Search Users Response
 */
export interface SearchUsersResponse {
  success: boolean;
  users: SearchUser[];
  pagination: Pagination;
}

/**
 * Conversations List Response
 */
export interface ConversationsListResponse {
  success: boolean;
  conversations: Conversation[];
  pagination: Pagination;
}

/**
 * Single Conversation Response
 */
export interface ConversationResponse {
  success: boolean;
  conversation: Conversation & { isNew?: boolean };
}

/**
 * Messages List Response
 */
export interface MessagesListResponse {
  success: boolean;
  messages: Message[];
  hasMore: boolean;
}

/**
 * Single Message Response
 */
export interface MessageResponse {
  success: boolean;
  message: Message;
}

/**
 * Upload Response
 */
export interface UploadResponse {
  success: boolean;
  message: string;
  attachment: MessageAttachment;
}

/**
 * Mark as Read Response
 */
export interface MarkAsReadResponse {
  success: boolean;
  markedCount: number;
}

/**
 * Delete Response
 */
export interface DeleteConversationResponse {
  success: boolean;
  message: string;
}

/**
 * Search users across all agencies
 * Find users to start a conversation (employees, agency admins, agency staff, super admins)
 * @param params - Search parameters
 * @returns Promise with search results and pagination
 */
export async function searchUsers(params?: {
  search?: string;
  page?: number;
  limit?: number;
  role?: UserRole;
  userType?: UserType;
}): Promise<SearchUsersResponse> {
  try {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.append('search', params.search);
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.role) searchParams.append('role', params.role);
    if (params?.userType) searchParams.append('userType', params.userType);
    
    const queryString = searchParams.toString();
    const url = `/superAdminMessaging/users/search${queryString ? `?${queryString}` : ''}`;
    
    const response = await axiosClient.get<SearchUsersResponse>(url);
    return response.data;
  } catch (error) {
    console.error("Failed to search users:", error);
    throw error;
  }
}

/**
 * Get all conversations for the super admin
 * @param params - Filter and pagination parameters
 * @returns Promise with conversations list and pagination
 */
export async function getConversations(params?: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<ConversationsListResponse> {
  try {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.search) searchParams.append('search', params.search);
    
    const queryString = searchParams.toString();
    const url = `/superAdminMessaging/conversations${queryString ? `?${queryString}` : ''}`;
    
    const response = await axiosClient.get<ConversationsListResponse>(url);
    return response.data;
  } catch (error) {
    console.error("Failed to fetch conversations:", error);
    throw error;
  }
}

/**
 * Create a new conversation or get existing one
 * @param data - User ID and user type to start conversation with
 * @returns Promise with conversation data
 */
export async function createConversation(data: CreateConversationRequest): Promise<ConversationResponse> {
  try {
    const response = await axiosClient.post<ConversationResponse>(
      "/superAdminMessaging/conversations",
      data
    );
    return response.data;
  } catch (error) {
    console.error("Failed to create conversation:", error);
    throw error;
  }
}

/**
 * Get a specific conversation by ID
 * @param conversationId - Conversation ID
 * @returns Promise with conversation data
 */
export async function getConversation(conversationId: string): Promise<ConversationResponse> {
  try {
    const response = await axiosClient.get<ConversationResponse>(
      `/superAdminMessaging/conversations/${conversationId}`
    );
    return response.data;
  } catch (error) {
    console.error(`Failed to fetch conversation ${conversationId}:`, error);
    throw error;
  }
}

/**
 * Archive/delete a conversation (soft delete)
 * @param conversationId - Conversation ID
 * @returns Promise with success confirmation
 */
export async function deleteConversation(conversationId: string): Promise<DeleteConversationResponse> {
  try {
    const response = await axiosClient.delete<DeleteConversationResponse>(
      `/superAdminMessaging/conversations/${conversationId}`
    );
    return response.data;
  } catch (error) {
    console.error(`Failed to delete conversation ${conversationId}:`, error);
    throw error;
  }
}

/**
 * Get messages in a conversation with pagination
 * @param conversationId - Conversation ID
 * @param params - Pagination parameters
 * @returns Promise with messages list
 */
export async function getMessages(
  conversationId: string,
  params?: {
    page?: number;
    limit?: number;
    before?: string;
  }
): Promise<MessagesListResponse> {
  try {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.before) searchParams.append('before', params.before);
    
    const queryString = searchParams.toString();
    const url = `/superAdminMessaging/conversations/${conversationId}/messages${queryString ? `?${queryString}` : ''}`;
    
    const response = await axiosClient.get<MessagesListResponse>(url);
    return response.data;
  } catch (error) {
    console.error(`Failed to fetch messages for conversation ${conversationId}:`, error);
    throw error;
  }
}

/**
 * Send a message in a conversation
 * @param conversationId - Conversation ID
 * @param data - Message data (text and optional attachments)
 * @returns Promise with created message
 */
export async function sendMessage(
  conversationId: string,
  data: SendMessageRequest
): Promise<MessageResponse> {
  try {
    const response = await axiosClient.post<MessageResponse>(
      `/superAdminMessaging/conversations/${conversationId}/messages`,
      data
    );
    return response.data;
  } catch (error) {
    console.error(`Failed to send message in conversation ${conversationId}:`, error);
    throw error;
  }
}

/**
 * Mark all unread messages in a conversation as read
 * @param conversationId - Conversation ID
 * @returns Promise with count of marked messages
 */
export async function markConversationAsRead(conversationId: string): Promise<MarkAsReadResponse> {
  try {
    const response = await axiosClient.post<MarkAsReadResponse>(
      `/superAdminMessaging/conversations/${conversationId}/read`
    );
    return response.data;
  } catch (error) {
    console.error(`Failed to mark conversation ${conversationId} as read:`, error);
    throw error;
  }
}

/**
 * Upload file attachment for messaging
 * Maximum file size: 10MB
 * Supported types: images, PDF, Word documents, text files
 * @param file - File to upload
 * @returns Promise with attachment data
 */
export async function uploadAttachment(file: File): Promise<UploadResponse> {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await axiosClient.post<UploadResponse>(
      '/superAdminMessaging/upload',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Failed to upload attachment:", error);
    throw error;
  }
}
