import { createApi } from "@reduxjs/toolkit/query/react";
import { customBaseQuery } from "@/lib/baseQuery";

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
  role: string;
  content: string;
  suggestions: DSPSuggestion[];
  actions: Array<{ type: string; outcome: string; payload?: any }>;
  toolCallsMade: string[];
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
      { conversationId: string; message: string; context?: Record<string, string> }
    >({
      query: ({ conversationId, message, context }) => ({
        url: `/aiAutomation/conversations/${conversationId}/messages`,
        method: "POST",
        data: { message, context },
        requiresAuth: true,
      }),
      invalidatesTags: ["Conversation"],
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
  useDeleteConversationMutation,
} = aiAutomationApi;
