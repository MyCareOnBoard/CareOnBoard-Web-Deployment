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
  tagTypes: [],
  keepUnusedDataFor: 300,
  endpoints: (builder) => ({
    getAllGoalDocuments: builder.query<ListGoalDocumentsResponse, ListGoalDocumentsParams | void>({
      query: (params) => ({
        url: `/goalsAndDocuments`,
        method: "GET",
        requiresAuth: true,
        params: params || {}
      }),
    }),
    getSingleGoalDocument: builder.query<GoalDocument, string>({
      query: (documentId) => ({
        url: `/goalsAndDocuments/${documentId}`,
        method: "GET",
        params: { documentId },
        requiresAuth: true
      }),
      transformResponse: (response: any) => {
        console.log("[Goals API] Raw response:", response);
        // API may return { success, document } or { success, data } or the document directly
        if (response?.document) return response.document;
        if (response?.data) return response.data;
        return response as GoalDocument;
      },
    }),
    getGoalDocumentByFirebaseId: builder.query<GoalDocument, string>({
      query: (firebaseId) => ({
        url: `/goalsAndDocuments/firebase/${firebaseId}`,
        method: "GET",
        requiresAuth: true
      }),
      transformResponse: (response: { success: boolean; data: GoalDocument }) => response.data,
    }),
    createGoalDocument: builder.mutation<GoalDocument, CreateGoalDocumentRequest>({
      query: (data) => ({
        url: `/goalsAndDocuments`,
        method: "POST",
        requiresAuth: true,
        data
      }),
      transformResponse: (response: GoalDocumentResponse) => response.document,
      invalidatesTags: []
    }),
    updateGoalDocument: builder.mutation<GoalDocument, { documentId: string, data: UpdateGoalDocumentRequest }>({
      query: ({ documentId, data }) => ({
        url: `/goalsAndDocuments/document/${documentId}`,
        method: "PUT",
        requiresAuth: true,
        data
      }),
      transformResponse: (response: GoalDocumentResponse) => response.document,
    }),
    updateGoalDocumentByFirebaseId: builder.mutation<GoalDocument, { firebaseId: string, data: UpdateGoalDocumentRequest }>({
      query: ({ firebaseId, data }) => ({
        url: `/goalsAndDocuments/firebase/${firebaseId}`,
        method: "PUT",
        requiresAuth: true,
        data
      }),
      transformResponse: (response: GoalDocumentResponse) => response.document,
    }),
    upsertGoalDocumentByType: builder.mutation<GoalDocument, { documentType: DocumentType, data: UpsertGoalDocumentRequest }>({
      query: ({ documentType, data }) => ({
        url: `/goalsAndDocuments/${documentType}`,
        method: "PUT",
        requiresAuth: true,
        data
      }),
      transformResponse: (response: GoalDocumentResponse) => response.document,
    }),
    submitGoalDocument: builder.mutation<GoalDocument, string>({
      query: (documentId) => ({
        url: `/goalsAndDocuments/${documentId}/submit`,
        method: "POST",
        requiresAuth: true
      }),
      transformResponse: (response: SubmitGoalDocumentResponse) => response.document,
    }),
    deleteGoalDocument: builder.mutation<DeleteGoalDocumentResponse, string>({
      query: (documentId) => ({
        url: `/goalsAndDocuments/${documentId}`,
        method: "DELETE",
        requiresAuth: true
      }),
    })
  }),
});

export const {
  useGetAllGoalDocumentsQuery,
  useGetSingleGoalDocumentQuery,
  useGetGoalDocumentByFirebaseIdQuery,
  useCreateGoalDocumentMutation,
  useUpdateGoalDocumentMutation,
  useUpdateGoalDocumentByFirebaseIdMutation,
  useUpsertGoalDocumentByTypeMutation,
  useSubmitGoalDocumentMutation,
  useDeleteGoalDocumentMutation
} = goalsAndDocumentsApi;
