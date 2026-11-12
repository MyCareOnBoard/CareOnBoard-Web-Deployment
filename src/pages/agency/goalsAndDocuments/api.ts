import type {CareerEnvelope, CareerPlanList, CareerPlanScope, CareerPlanDetail, CareerPlanDraft, CareerRevision, CareerRevisionSummary, CareerPage} from '@/lib/api/career-planning';
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
  tagTypes: ['CareerPlan'],
  keepUnusedDataFor: 300,
  endpoints: (builder) => ({
    getCareerPlans: builder.query<CareerPlanList, CareerPlanScope>({
      query: params => ({url:'/goalsAndDocuments/career-plans', method:'GET', requiresAuth:true, params}),
      transformResponse:(response:CareerEnvelope<CareerPlanList>)=>response.data,
      providesTags:(_result,_error,arg)=>[{type:'CareerPlan',id:`list:${arg.agencyId ?? ''}:${arg.clientId ?? ''}`}],
    }),
    getCareerPlan: builder.query<CareerPlanDetail,string>({
      query:id=>({url:`/goalsAndDocuments/career-plans/${id}`,method:'GET',requiresAuth:true}),
      transformResponse:(response:CareerEnvelope<CareerPlanDetail>)=>response.data,
      providesTags:(_result,_error,id)=>[{type:'CareerPlan',id}],
    }),
    saveCareerPlan: builder.mutation<CareerPlanDetail,{agencyId?:string;clientId:string;serviceAuthorizationId:string;expectedVersion:number;draft:CareerPlanDraft}>({
      query:data=>({url:'/goalsAndDocuments/career-plans/draft',method:'PUT',requiresAuth:true,data}),
      transformResponse:(response:CareerEnvelope<CareerPlanDetail>)=>response.data,
      invalidatesTags:(result,error,arg)=>error?[]:[{type:'CareerPlan',id:result?.id},{type:'CareerPlan',id:`list:${arg.agencyId ?? ''}:${arg.clientId}`}],
    }),
    publishCareerPlan: builder.mutation<{revisionId:string;revisionNumber:number;version:number},{planId:string;expectedVersion:number;operationId:string;changeReason:string}>({
      query:({planId,...data})=>({url:`/goalsAndDocuments/career-plans/${planId}/publish`,method:'POST',requiresAuth:true,data}),
      transformResponse:(response:CareerEnvelope<{revisionId:string;revisionNumber:number;version:number}>)=>response.data,
      invalidatesTags:(_result,error,arg)=>error?[]:[{type:'CareerPlan',id:arg.planId}],
    }),
    getCareerRevisions: builder.query<CareerPage<CareerRevisionSummary>,{planId:string;cursor?:string}>({
      query:({planId,...params})=>({url:`/goalsAndDocuments/career-plans/${planId}/revisions`,method:'GET',requiresAuth:true,params}),
      transformResponse:(response:CareerEnvelope<CareerPage<CareerRevisionSummary>>)=>response.data,
    }),
    getCareerRevision: builder.query<CareerRevision,{planId:string;revisionId:string}>({
      query:({planId,revisionId})=>({url:`/goalsAndDocuments/career-plans/${planId}/revisions/${revisionId}`,method:'GET',requiresAuth:true}),
      transformResponse:(response:CareerEnvelope<CareerRevision>)=>response.data,
    }),
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
  useGetCareerPlansQuery, useGetCareerPlanQuery, useLazyGetCareerPlanQuery, useSaveCareerPlanMutation, usePublishCareerPlanMutation, useGetCareerRevisionsQuery, useGetCareerRevisionQuery,
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
