import axiosClient from '../axios';

/**
 * Agency Messaging API Types
 */

export interface AgencyStaff {
  uid: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  department?: string;
  isActive?: boolean;
}

export interface Conversation {
  id: string;
  type: 'direct' | 'group';
  topic?: string;
  participantIds: string[];
  participants: {
    uid: string;
    name: string;
    role: string;
    avatar?: string;
    email?: string;
  }[];
  lastMessage?: string;
  lastMessageAt?: string;
  lastMessageSenderId?: string;
  unreadCount?: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  senderAvatar?: string;
  content: string;
  attachments?: {
    id: string;
    name: string;
    url: string;
    type: string;
    size: number;
  }[];
  mentions?: string[];
  priority?: 'normal' | 'high' | 'urgent';
  readBy: string[];
  editedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateConversationPayload {
  participantId: string;
  initialMessage?: string;
}

export interface UpdateConversationPayload {
  topic: string;
}

export interface SendMessagePayload {
  content: string;
  attachments?: string[];
  mentions?: string[];
  priority?: 'normal' | 'high' | 'urgent';
}

export interface EditMessagePayload {
  content: string;
}

export interface MarkAsReadPayload {
  messageIds: string[];
}

export interface StaffResponse {
  success: boolean;
  data: AgencyStaff[];
}

export interface ConversationsResponse {
  success: boolean;
  data: Conversation[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface ConversationResponse {
  success: boolean;
  data: Conversation;
}

export interface MessagesResponse {
  success: boolean;
  data: Message[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface MessageResponse {
  success: boolean;
  data: Message;
}

export interface UploadResponse {
  success: boolean;
  data: {
    id: string;
    name: string;
    url: string;
    type: string;
    size: number;
  };
}

/**
 * Agency Messaging API
 * 
 * Provides endpoints for internal agency staff messaging:
 * - Staff directory
 * - Conversation management (create, read, update, delete)
 * - Message sending and editing
 * - Read receipts
 * - Message search
 * - File attachments
 */
export const messagingApi = {
  /**
   * Get all agency staff for messaging
   * GET /agencyMessaging/staff
   * 
   * Retrieves all active staff members in the agency for creating conversations
   */
  async getStaff(): Promise<StaffResponse> {
    try {
      const response = await axiosClient.get<StaffResponse>('/agencyMessaging/staff');
      return response.data;
    } catch (error: any) {
      console.error('[messagingApi] Error fetching staff:', error);
      throw error;
    }
  },

  /**
   * Create a new direct conversation
   * POST /agencyMessaging/
   * 
   * Creates a new internal agency direct (1-on-1) conversation
   * @param payload - Participant ID and optional initial message
   */
  async createConversation(payload: CreateConversationPayload): Promise<ConversationResponse> {
    try {
      const response = await axiosClient.post<ConversationResponse>('/agencyMessaging/', payload);
      return response.data;
    } catch (error: any) {
      console.error('[messagingApi] Error creating conversation:', error);
      throw error;
    }
  },

  /**
   * Get all conversations
   * GET /agencyMessaging/
   * 
   * Retrieves all conversations the user is part of
   * @param params - Optional pagination and filters
   */
  async getConversations(params?: {
    page?: number;
    limit?: number;
    unreadOnly?: boolean;
  }): Promise<ConversationsResponse> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.unreadOnly) queryParams.append('unreadOnly', 'true');

      const queryString = queryParams.toString();
      const url = `/agencyMessaging/${queryString ? `?${queryString}` : ''}`;
      
      const response = await axiosClient.get<ConversationsResponse>(url);
      return response.data;
    } catch (error: any) {
      console.error('[messagingApi] Error fetching conversations:', error);
      throw error;
    }
  },

  /**
   * Get conversation details
   * GET /agencyMessaging/{id}
   * 
   * Retrieves details of a specific conversation
   * @param conversationId - Conversation ID
   */
  async getConversation(conversationId: string): Promise<ConversationResponse> {
    try {
      const url = `/agencyMessaging/${encodeURIComponent(conversationId)}`;
      const response = await axiosClient.get<ConversationResponse>(url);
      return response.data;
    } catch (error: any) {
      console.error('[messagingApi] Error fetching conversation:', error);
      throw error;
    }
  },

  /**
   * Update conversation
   * PUT /agencyMessaging/{id}
   * 
   * Updates conversation topic
   * @param conversationId - Conversation ID
   * @param payload - Update data (topic)
   */
  async updateConversation(
    conversationId: string,
    payload: UpdateConversationPayload
  ): Promise<ConversationResponse> {
    try {
      const url = `/agencyMessaging/${encodeURIComponent(conversationId)}`;
      const response = await axiosClient.put<ConversationResponse>(url, payload);
      return response.data;
    } catch (error: any) {
      console.error('[messagingApi] Error updating conversation:', error);
      throw error;
    }
  },

  /**
   * Delete conversation
   * DELETE /agencyMessaging/{id}
   * 
   * Removes user from conversation. Deletes conversation if last participant.
   * @param conversationId - Conversation ID
   */
  async deleteConversation(conversationId: string): Promise<{ success: boolean }> {
    try {
      const url = `/agencyMessaging/${encodeURIComponent(conversationId)}`;
      const response = await axiosClient.delete<{ success: boolean }>(url);
      return response.data;
    } catch (error: any) {
      console.error('[messagingApi] Error deleting conversation:', error);
      throw error;
    }
  },

  /**
   * Get messages in conversation
   * GET /agencyMessaging/{id}/messages
   * 
   * Retrieves messages from a conversation with pagination
   * @param conversationId - Conversation ID
   * @param params - Pagination parameters
   */
  async getMessages(
    conversationId: string,
    params?: {
      page?: number;
      limit?: number;
      before?: string;
      after?: string;
    }
  ): Promise<MessagesResponse> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.before) queryParams.append('before', params.before);
      if (params?.after) queryParams.append('after', params.after);

      const queryString = queryParams.toString();
      const url = `/agencyMessaging/${encodeURIComponent(conversationId)}/messages${queryString ? `?${queryString}` : ''}`;
      
      const response = await axiosClient.get<MessagesResponse>(url);
      return response.data;
    } catch (error: any) {
      console.error('[messagingApi] Error fetching messages:', error);
      throw error;
    }
  },

  /**
   * Send a message
   * POST /agencyMessaging/{id}/messages
   * 
   * Sends a new message in the conversation with optional attachments, mentions, and priority
   * @param conversationId - Conversation ID
   * @param payload - Message content and options
   */
  async sendMessage(
    conversationId: string,
    payload: SendMessagePayload
  ): Promise<MessageResponse> {
    try {
      const url = `/agencyMessaging/${encodeURIComponent(conversationId)}/messages`;
      const response = await axiosClient.post<MessageResponse>(url, payload);
      return response.data;
    } catch (error: any) {
      console.error('[messagingApi] Error sending message:', error);
      throw error;
    }
  },

  /**
   * Edit a message
   * PUT /agencyMessaging/{id}/messages/{messageId}
   * 
   * Edits the content of a message (only message sender can edit)
   * @param conversationId - Conversation ID
   * @param messageId - Message ID
   * @param payload - New message content
   */
  async editMessage(
    conversationId: string,
    messageId: string,
    payload: EditMessagePayload
  ): Promise<MessageResponse> {
    try {
      const url = `/agencyMessaging/${encodeURIComponent(conversationId)}/messages/${encodeURIComponent(messageId)}`;
      const response = await axiosClient.put<MessageResponse>(url, payload);
      return response.data;
    } catch (error: any) {
      console.error('[messagingApi] Error editing message:', error);
      throw error;
    }
  },

  /**
   * Mark messages as read
   * POST /agencyMessaging/{id}/read
   * 
   * Marks multiple messages as read and resets unread count
   * @param conversationId - Conversation ID
   * @param payload - Message IDs to mark as read
   */
  async markAsRead(
    conversationId: string,
    payload: MarkAsReadPayload
  ): Promise<{ success: boolean }> {
    try {
      const url = `/agencyMessaging/${encodeURIComponent(conversationId)}/read`;
      const response = await axiosClient.post<{ success: boolean }>(url, payload);
      return response.data;
    } catch (error: any) {
      console.error('[messagingApi] Error marking messages as read:', error);
      throw error;
    }
  },

  /**
   * Search messages
   * GET /agencyMessaging/search/messages
   * 
   * Searches all messages across agency conversations with filters
   * @param query - Search query string
   * @param params - Optional filters
   */
  async searchMessages(
    query: string,
    params?: {
      conversationId?: string;
      senderId?: string;
      fromDate?: string;
      toDate?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<MessagesResponse> {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('q', query);
      if (params?.conversationId) queryParams.append('conversationId', params.conversationId);
      if (params?.senderId) queryParams.append('senderId', params.senderId);
      if (params?.fromDate) queryParams.append('fromDate', params.fromDate);
      if (params?.toDate) queryParams.append('toDate', params.toDate);
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());

      const url = `/agencyMessaging/search/messages?${queryParams.toString()}`;
      const response = await axiosClient.get<MessagesResponse>(url);
      return response.data;
    } catch (error: any) {
      console.error('[messagingApi] Error searching messages:', error);
      throw error;
    }
  },

  /**
   * Upload file attachment
   * POST /agencyMessaging/upload
   * 
   * Uploads a file attachment for use in agency messages.
   * Supports images (JPEG, PNG, GIF, WEBP), PDFs, Word documents, and text files.
   * Maximum size: 10MB.
   * @param file - File to upload
   */
  async uploadAttachment(file: File): Promise<UploadResponse> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const url = '/agencyMessaging/upload';
      const response = await axiosClient.post<UploadResponse>(url, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error: any) {
      console.error('[messagingApi] Error uploading attachment:', error);
      throw error;
    }
  },
};
