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
  endpoints: (builder) => ({
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
    submitActivityLogNotes: builder.mutation<void, { activityLog: string, logNoteIds: string[] }>({
      query: ({ activityLog, logNoteIds }) => ({
        url: `/employees/activity-logs/${activityLog}/notes/submit`,
        method: "POST",
        requiresAuth: true,
        data: { logNoteIds }
      }),
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
  useGetAllActivityLogsQuery,
  useGetSingleActivityLogQuery,
  useCreateOrUpdateActivityLogMutation,
  useSubmitActivityLogNotesMutation,
  useSeedActivityLogsMutation,
  useUpdateActivityLogMutation
} = userPanelNotesApi;
