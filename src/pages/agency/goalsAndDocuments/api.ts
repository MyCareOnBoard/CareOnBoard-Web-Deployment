import { createApi } from "@reduxjs/toolkit/query/react";
import { customBaseQuery } from "@/lib/baseQuery";
import {
  GoalDocument,
  GoalDocumentResponse,
  ListGoalDocumentsResponse,
  CreateGoalDocumentRequest,
  UpdateGoalDocumentRequest,
  UpsertGoalDocumentRequest,
  SubmitGoalDocumentResponse,
  DeleteGoalDocumentResponse,
  ListGoalDocumentsParams,
  DocumentType,
} from "@/lib/api/goals-and-documents";

export const goalsAndDocumentsApi = createApi({
  reducerPath: "goalsAndDocumentsApi",
  baseQuery: customBaseQuery,
  tagTypes: ['GoalDocuments', 'SingleGoalDocument'],
  endpoints: (builder) => ({
    getAllGoalDocuments: builder.query<ListGoalDocumentsResponse, ListGoalDocumentsParams | void>({
      query: (params) => ({
        url: `/goalsAndDocuments`,
        method: "GET",
        requiresAuth: true,
        params: params || {}
      }),
      providesTags: ['GoalDocuments']
    }),
    getSingleGoalDocument: builder.query<GoalDocument, string>({
      query: (documentId) => ({
        url: `/goalsAndDocuments/${documentId}`,
        method: "GET",
        requiresAuth: true
      }),
      providesTags: ['SingleGoalDocument']
    }),
    createGoalDocument: builder.mutation<GoalDocument, CreateGoalDocumentRequest>({
      query: (data) => ({
        url: `/goalsAndDocuments`,
        method: "POST",
        requiresAuth: true,
        data
      }),
      transformResponse: (response: GoalDocumentResponse) => response.document,
      invalidatesTags: ['GoalDocuments']
    }),
    updateGoalDocument: builder.mutation<GoalDocument, { documentId: string, data: UpdateGoalDocumentRequest }>({
      query: ({ documentId, data }) => ({
        url: `/goalsAndDocuments/document/${documentId}`,
        method: "PUT",
        requiresAuth: true,
        data
      }),
      transformResponse: (response: GoalDocumentResponse) => response.document,
      invalidatesTags: ['SingleGoalDocument', 'GoalDocuments']
    }),
    upsertGoalDocumentByType: builder.mutation<GoalDocument, { documentType: DocumentType, data: UpsertGoalDocumentRequest }>({
      query: ({ documentType, data }) => ({
        url: `/goalsAndDocuments/${documentType}`,
        method: "PUT",
        requiresAuth: true,
        data
      }),
      transformResponse: (response: GoalDocumentResponse) => response.document,
      invalidatesTags: ['SingleGoalDocument', 'GoalDocuments']
    }),
    submitGoalDocument: builder.mutation<GoalDocument, string>({
      query: (documentId) => ({
        url: `/goalsAndDocuments/${documentId}/submit`,
        method: "POST",
        requiresAuth: true
      }),
      transformResponse: (response: SubmitGoalDocumentResponse) => response.document,
      invalidatesTags: ['SingleGoalDocument', 'GoalDocuments']
    }),
    deleteGoalDocument: builder.mutation<DeleteGoalDocumentResponse, string>({
      query: (documentId) => ({
        url: `/goalsAndDocuments/${documentId}`,
        method: "DELETE",
        requiresAuth: true
      }),
      invalidatesTags: ['GoalDocuments']
    })
  }),
});

export const {
  useGetAllGoalDocumentsQuery,
  useGetSingleGoalDocumentQuery,
  useCreateGoalDocumentMutation,
  useUpdateGoalDocumentMutation,
  useUpsertGoalDocumentByTypeMutation,
  useSubmitGoalDocumentMutation,
  useDeleteGoalDocumentMutation
} = goalsAndDocumentsApi;
