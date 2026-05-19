import { createApi } from "@reduxjs/toolkit/query/react";
import { customBaseQuery } from "@/lib/baseQuery";
import type { Attachment, ResponseComponent } from "./types";

export interface DSPSuggestion {
  employeeId: string;
  fullName: string;
  reliability: "High" | "Medium" | "Low";
  reliabilityScore: number;
  lastShift: string;
}

export interface AIMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  suggestions?: DSPSuggestion[];
  actions?: Array<{ type: string; outcome: string; payload?: any }>;
  toolCallsMade?: string[];
  attachments?: Attachment[];
  components?: ResponseComponent[];
  createdAt: any;
}

export interface Conversation {
  id: string;
  title: string;
  messageCount: number;
  lastMessageAt: any;
  createdAt: any;
  context?: Record<string, string>;
}

export interface ConversationWithMessages extends Conversation {
  messages: AIMessage[];
}

export interface SendMessageResponse {
  id: string;
  userMessageId?: string;
  role: string;
  content: string;
  suggestions: DSPSuggestion[];
  actions: Array<{ type: string; outcome: string; payload?: any }>;
  toolCallsMade: string[];
  components?: ResponseComponent[];
}

export interface AttachmentUploadResponse {
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

export const aiAutomationApi = createApi({
  reducerPath: "aiAutomationApi",
  baseQuery: customBaseQuery,
  tagTypes: ["Conversation"],
  endpoints: (builder) => ({
    listConversations: builder.query<{ conversations: Conversation[] }, void>({
      query: () => ({ url: "/aiAutomation/conversations", method: "GET", requiresAuth: true }),
      providesTags: ["Conversation"],
    }),
    createConversation: builder.mutation<{ id: string }, { context?: Record<string, string> }>({
      query: (body) => ({
        url: "/aiAutomation/conversations",
        method: "POST",
        data: body,
        requiresAuth: true,
      }),
      invalidatesTags: ["Conversation"],
    }),
    getConversation: builder.query<ConversationWithMessages, string>({
      query: (id) => ({
        url: `/aiAutomation/conversations/${id}`,
        method: "GET",
        requiresAuth: true,
      }),
    }),
    sendMessage: builder.mutation<
      SendMessageResponse,
      { conversationId: string; message: string; context?: Record<string, string>; attachments?: Attachment[] }
    >({
      query: ({ conversationId, message, context, attachments }) => ({
        url: `/aiAutomation/conversations/${conversationId}/messages`,
        method: "POST",
        data: { message, context, attachments },
        requiresAuth: true,
      }),
      invalidatesTags: ["Conversation"],
    }),
    uploadAttachment: builder.mutation<AttachmentUploadResponse, FormData>({
      query: (formData) => ({
        url: "/aiAutomation/upload",
        method: "POST",
        data: formData,
        requiresAuth: true,
      }),
    }),
    deleteConversation: builder.mutation<void, string>({
      query: (id) => ({
        url: `/aiAutomation/conversations/${id}`,
        method: "DELETE",
        requiresAuth: true,
      }),
      invalidatesTags: ["Conversation"],
    }),
  }),
});

export const {
  useListConversationsQuery,
  useCreateConversationMutation,
  useGetConversationQuery,
  useLazyGetConversationQuery,
  useSendMessageMutation,
  useUploadAttachmentMutation,
  useDeleteConversationMutation,
} = aiAutomationApi;
