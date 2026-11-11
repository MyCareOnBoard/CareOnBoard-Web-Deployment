import type {CareerEnvelope, CareerContext, CareerSelection, CareerPreview, CareerSignIntent, CareerPage, CareerSignatureSummary, CareerSignature, CareerRow} from '@/lib/api/career-planning';
import { complianceAlertsApi } from '@/pages/agency/compliance-alerts/api';
import { createApi } from "@reduxjs/toolkit/query/react";
import { customBaseQuery } from "@/lib/baseQuery";
import {
  CreateActivityLogPayload,
  GetActivityLogResponse, UpdateActivityLogPayload,
} from "@/pages/userPanel/notes/apiTypes";
import {ActivityLog} from "@/lib/api/employees";
import type {MyNotesResponse} from "@/lib/notes/notesList";

export type NoteCommentKind = 'message' | 'change_request' | 'correction_request';
export interface NoteComment {
  id: string; kind: NoteCommentKind; body: string; section: string | null;
  authorKind: 'employee' | 'reviewer'; authorName: string; createdAt: string | null;
  resolved: boolean; resolvedAt: string | null;
}
export type NoteHistoryKind = 'clocked_out' | 'started' | 'submitted' | 'returned' | 'approved' | 'correction_requested' | 'sent_for_billing';
export interface NoteHistoryEvent { kind: NoteHistoryKind; at: string; actorName: string; }
type Envelope<T> = { success: boolean; data: T };


export const userPanelNotesApi = createApi({
  reducerPath: "userPanelNotesApi",
  baseQuery: customBaseQuery,
  tagTypes: ['ActivityLogs', 'SingleActivityLog', 'MyNotes', 'NoteComments', 'NoteHistory'],
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
    /** The signed-in employee's worked shifts and where each note stands. */
    getMyNotes: builder.query<MyNotesResponse, {startDate?: string; endDate?: string} | void>({
      query: (params) => ({url: `/employees/my-notes`, method: 'GET', requiresAuth: true, params: params || undefined}),
      transformResponse: (response: Envelope<MyNotesResponse>) => response.data,
      providesTags: ['MyNotes'],
    }),
    getNoteComments: builder.query<NoteComment[], string>({
      query: (activityLogId) => ({url: `/employees/activity-logs/${activityLogId}/comments`, method: 'GET', requiresAuth: true}),
      transformResponse: (response: Envelope<NoteComment[]>) => response.data,
      providesTags: (_result, _error, id) => [{type: 'NoteComments', id}],
    }),
    addNoteComment: builder.mutation<NoteComment, {activityLogId: string; body: string; kind?: NoteCommentKind; section?: string}>({
      query: ({activityLogId, ...data}) => ({url: `/employees/activity-logs/${activityLogId}/comments`, method: 'POST', requiresAuth: true, data}),
      transformResponse: (response: Envelope<NoteComment>) => response.data,
      invalidatesTags: (_result, _error, {activityLogId}) => [{type: 'NoteComments', id: activityLogId}, {type: 'NoteHistory', id: activityLogId}],
    }),
    resolveNoteComment: builder.mutation<NoteComment, {activityLogId: string; commentId: string; resolved: boolean}>({
      query: ({activityLogId, commentId, resolved}) => ({url: `/employees/activity-logs/${activityLogId}/comments/${commentId}`, method: 'PATCH', requiresAuth: true, data: {resolved}}),
      transformResponse: (response: Envelope<NoteComment>) => response.data,
      invalidatesTags: (_result, _error, {activityLogId}) => [{type: 'NoteComments', id: activityLogId}],
    }),
    getNoteHistory: builder.query<NoteHistoryEvent[], string>({
      query: (activityLogId) => ({url: `/employees/activity-logs/${activityLogId}/history`, method: 'GET', requiresAuth: true}),
      transformResponse: (response: Envelope<NoteHistoryEvent[]>) => response.data,
      providesTags: (_result, _error, id) => [{type: 'NoteHistory', id}],
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
      invalidatesTags: ['SingleActivityLog', 'MyNotes']
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
      invalidatesTags: (_result, _error, {activityLog}) => ['SingleActivityLog', 'MyNotes', {type: 'NoteHistory', id: activityLog}]
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
  useGetMyNotesQuery, useGetNoteCommentsQuery, useAddNoteCommentMutation, useResolveNoteCommentMutation, useGetNoteHistoryQuery,
  useGetCareerContextQuery, useSelectCareerRevisionMutation, useSaveCareerRowMutation, usePreviewCareerNotesMutation, useGetCareerSignaturesQuery, useGetCareerSignatureQuery,
  useGetAllActivityLogsQuery,
  useGetSingleActivityLogQuery,
  useCreateOrUpdateActivityLogMutation,
  useSubmitActivityLogNotesMutation,
  useSeedActivityLogsMutation,
  useUpdateActivityLogMutation
} = userPanelNotesApi;
