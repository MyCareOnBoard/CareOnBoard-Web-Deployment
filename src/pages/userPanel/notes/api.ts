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
    createOrUpdateActivityLog: builder.mutation<void, { activityLog: string, data: CreateActivityLogPayload }>({
      query: ({activityLog, data}) => ({
        url: `/employees/employee/activity-logs/${activityLog}/notes`,
        method: "PUT",
        requiresAuth: true,
        data
      }),
      invalidatesTags: ['SingleActivityLog']
    })
  }),
});

export const {
  useGetAllActivityLogsQuery,
  useGetSingleActivityLogQuery,
  useCreateOrUpdateActivityLogMutation
} = userPanelNotesApi;
