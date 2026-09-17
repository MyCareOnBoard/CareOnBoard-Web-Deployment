import type {CareerEnvelope, CareerContext, CareerSelection, CareerPreview, CareerSignIntent, CareerPage, CareerSignatureSummary, CareerSignature, CareerRow} from '@/lib/api/career-planning';
import { complianceAlertsApi } from '@/pages/agency/compliance-alerts/api';
import { createApi } from "@reduxjs/toolkit/query/react";
import { customBaseQuery } from "@/lib/baseQuery";
import {
  CreateActivityLogPayload,
  GetActivityLogResponse, UpdateActivityLogPayload,
} from "@/pages/userPanel/notes/apiTypes";
import {ActivityLog} from "@/lib/api/employees";


export const userPanelNotesApi = createApi({
  reducerPath: "userPanelNotesApi",
  baseQuery: customBaseQuery,
  tagTypes: ['ActivityLogs', 'SingleActivityLog'],
  keepUnusedDataFor: 300,
  endpoints: (builder) => ({
    getCareerContext: builder.query<CareerContext,{activityLogId:string;revisionChoices?:boolean;cursor?:string}>({
      query:({activityLogId,...params})=>({url:`/employees/activity-logs/${activityLogId}/career-plan`,method:'GET',requiresAuth:true,params}),
      transformResponse:(response:CareerEnvelope<CareerContext>)=>response.data,
    }),
    selectCareerRevision: builder.mutation<CareerSelection,{activityLogId:string;careerPlanRevisionId:string;expectedPlanSelectionVersion:number}>({
      query:({activityLogId,...data})=>({url:`/employees/activity-logs/${activityLogId}/career-plan`,method:'PUT',requiresAuth:true,data}),
      transformResponse:(response:CareerEnvelope<CareerSelection>)=>response.data,
    }),
    saveCareerRow: builder.mutation<CareerRow,{activityLogId:string;data:{id:string;expectedContentVersion:number;startDate:string;endDate:string;metadata:CareerRow['metadata']}}>({
      query:({activityLogId,data})=>({url:`/employees/activity-logs/${activityLogId}/notes`,method:'PUT',requiresAuth:true,data}),
      transformResponse:(response:CareerEnvelope<CareerRow>)=>response.data,
    }),
    previewCareerNotes: builder.mutation<CareerPreview,{activityLogId:string;logNoteIds:string[]}>({
      query:({activityLogId,...data})=>({url:`/employees/activity-logs/${activityLogId}/notes/preview`,method:'POST',requiresAuth:true,data}),
      transformResponse:(response:CareerEnvelope<CareerPreview>)=>response.data,
    }),
    getCareerSignatures: builder.query<CareerPage<CareerSignatureSummary>,{activityLogId:string;cursor?:string}>({
      query:({activityLogId,...params})=>({url:`/employees/activity-logs/${activityLogId}/signatures`,method:'GET',requiresAuth:true,params}),
      transformResponse:(response:CareerEnvelope<CareerPage<CareerSignatureSummary>>)=>response.data,
    }),
    getCareerSignature: builder.query<CareerSignature,{activityLogId:string;receiptId:string}>({
      query:({activityLogId,receiptId})=>({url:`/employees/activity-logs/${activityLogId}/signatures/${receiptId}`,method:'GET',requiresAuth:true}),
      transformResponse:(response:CareerEnvelope<CareerSignature>)=>response.data,
    }),
    getAllActivityLogs: builder.query<ActivityLog[], void>({
      query: () => ({
        url: `/employees/activity-logs`,
        method: "GET",
        requiresAuth: true
      }),
      providesTags: ['ActivityLogs']
    }),
    getSingleActivityLog: builder.query<GetActivityLogResponse, string>({
      query: (activityLog) => ({
        url: `/employees/activity-logs/${activityLog}`,
        method: "GET",
        requiresAuth: true
      }),
      providesTags: ['SingleActivityLog']
    }),
    createOrUpdateActivityLog: builder.mutation<{ data: GetActivityLogResponse }, { activityLog: string, data: CreateActivityLogPayload }>({
      query: ({ activityLog, data }) => ({
        url: `/employees/activity-logs/${activityLog}/notes`,
        method: "PUT",
        requiresAuth: true,
        data
      }),
      invalidatesTags: ['SingleActivityLog']
    }),
    updateActivityLog: builder.mutation<{ data: GetActivityLogResponse }, { activityLog: string, data: UpdateActivityLogPayload }>({
      query: ({ activityLog, data }) => ({
        url: `/employees/activity-logs/${activityLog}`,
        method: "PATCH",
        requiresAuth: true,
        data
      }),
      invalidatesTags: ['SingleActivityLog']
    }),
    submitActivityLogNotes: builder.mutation<void, { activityLog: string, logNoteIds: string[], operationId: string; careerSignIntent?: CareerSignIntent }>({
      query: ({ activityLog, logNoteIds, operationId, careerSignIntent }) => ({
        url: `/employees/activity-logs/${activityLog}/notes/submit`,
        method: "POST",
        requiresAuth: true,
        data: { logNoteIds, operationId, ...(careerSignIntent ? {careerSignIntent} : {}) }
      }),
      async onQueryStarted(_arg, {dispatch, queryFulfilled}) {
        try { await queryFulfilled; dispatch(complianceAlertsApi.util.invalidateTags(['ShiftNoteCompliance'])); } catch { /* Keep the current checked status on failure. */ }
      },
      invalidatesTags: ['SingleActivityLog']
    }),
    seedActivityLogs: builder.mutation<void, Record<string, any>[]>({
      query: (data) => ({
        url: `/employees/activity-logs/seed`,
        method: "POST",
        requiresAuth: true,
        data
      }),
      invalidatesTags: ['ActivityLogs']
    })
  }),
});

export const {
  useGetCareerContextQuery, useSelectCareerRevisionMutation, useSaveCareerRowMutation, usePreviewCareerNotesMutation, useGetCareerSignaturesQuery, useGetCareerSignatureQuery,
  useGetAllActivityLogsQuery,
  useGetSingleActivityLogQuery,
  useCreateOrUpdateActivityLogMutation,
  useSubmitActivityLogNotesMutation,
  useSeedActivityLogsMutation,
  useUpdateActivityLogMutation
} = userPanelNotesApi;
