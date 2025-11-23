import {createApi} from "@reduxjs/toolkit/query/react";
import {customBaseQuery} from "@/lib/baseQuery";
import {
  CreateActivityLogPayload,
  GetActivityLogResponse,
  GetActivityLogsResponse
} from "@/pages/userPanel/notes/apiTypes";


export const userPanelNotesApi = createApi({
  reducerPath: "userPanelNotesApi",
  baseQuery: customBaseQuery,
  tagTypes: ['ActivityLogs', 'SingleActivityLog'],
  endpoints: (builder) => ({
    getAllActivityLogs: builder.query<GetActivityLogsResponse[], void>({
      query: () => ({
        url: `/employees/employee/activity-logs`,
        method: "GET",
        requiresAuth: true
      }),
      providesTags: ['ActivityLogs']
    }),
    getSingleActivityLog: builder.query<GetActivityLogResponse, string>({
      query: (activityLog) => ({
        url: `/employees/employee/activity-logs/${activityLog}`,
        method: "GET",
        requiresAuth: true
      }),
      providesTags: ['SingleActivityLog']
    }),
    createOrUpdateActivityLog: builder.mutation<{ data: GetActivityLogResponse }, { activityLog: string, data: CreateActivityLogPayload }>({
      query: ({activityLog, data}) => ({
        url: `/employees/employee/activity-logs/${activityLog}/notes`,
        method: "PUT",
        requiresAuth: true,
        data
      }),
      invalidatesTags: ['SingleActivityLog']
    }),
    submitActivityLogNotes: builder.mutation<void, { activityLog: string, logNoteIds: string[] }>({
      query: ({activityLog, logNoteIds}) => ({
        url: `/employees/employee/activity-logs/${activityLog}/notes/submit`,
        method: "POST",
        requiresAuth: true,
        data: { logNoteIds }
      }),
      invalidatesTags: ['SingleActivityLog']
    }),
    seedActivityLogs: builder.mutation<void, Record<string, any>[]>({
      query: (data) => ({
        url: `/employees/employee/activity-logs/seed`,
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
  useSeedActivityLogsMutation
} = userPanelNotesApi;
