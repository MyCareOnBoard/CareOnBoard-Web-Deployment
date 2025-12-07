import {createApi} from "@reduxjs/toolkit/query/react";
import {customBaseQuery} from "@/lib/baseQuery";
import {SubmittedNotesResponse, SubmittedNotesQueryParams, SubmittedNoteDetails} from "./apiTypes";

export const agencyNotesApi = createApi({
  reducerPath: "agencyNotesApi",
  baseQuery: customBaseQuery,
  tagTypes: ['SubmittedNotes', 'SubmittedNoteDetails'],
  endpoints: (builder) => ({
    getAllSubmittedNotes: builder.query<SubmittedNotesResponse, SubmittedNotesQueryParams>({
      query: (params) => {
        const queryParams = new URLSearchParams();
        
        queryParams.append('agencyId', params.agencyId);
        if (params.page) queryParams.append('page', params.page.toString());
        if (params.limit) queryParams.append('limit', params.limit.toString());
        if (params.activityType) queryParams.append('activityType', params.activityType);
        if (params.search) queryParams.append('search', params.search);
        if (params.timeInterval) queryParams.append('timeInterval', params.timeInterval);
        if (params.status) queryParams.append('status', params.status);
        
        return {
          url: `/employees/submitted-notes?${queryParams.toString()}`,
          method: "GET",
          requiresAuth: true
        };
      },
      providesTags: ['SubmittedNotes']
    }),
    approveSubmittedNotes: builder.mutation<void, string>({
      query: (submissionId) => ({
        url: `/employees/submitted-notes/${submissionId}/approve`,
        method: "POST",
        requiresAuth: true
      }),
      invalidatesTags: ['SubmittedNotes']
    }),
    rejectSubmittedNotes: builder.mutation<void, string>({
      query: (submissionId) => ({
        url: `/employees/submitted-notes/${submissionId}/reject`,
        method: "POST",
        requiresAuth: true
      }),
      invalidatesTags: ['SubmittedNotes']
    }),
    getSubmittedNoteDetails: builder.query<SubmittedNoteDetails, string>({
      query: (submissionId) => ({
        url: `/employees/submitted-notes/${submissionId}`,
        method: "GET",
        requiresAuth: true
      }),
      providesTags: ['SubmittedNoteDetails']
    }),
    updateSubmittedNote: builder.mutation<any, { submissionId: string, data: any }>({
      query: ({submissionId, data}) => ({
        url: `/employees/submitted-notes/${submissionId}/notes`,
        method: "PUT",
        requiresAuth: true,
        data
      }),
      invalidatesTags: ['SubmittedNoteDetails']
    }),
    updateActivityLog: builder.mutation<any, { submissionId: string, data: any }>({
      query: ({submissionId, data}) => ({
        url: `/employees/submitted-notes/${submissionId}`,
        method: "PATCH",
        requiresAuth: true,
        data
      }),
      invalidatesTags: ['SubmittedNoteDetails']
    }),
  }),
});

export const {
  useGetAllSubmittedNotesQuery,
  useApproveSubmittedNotesMutation,
  useRejectSubmittedNotesMutation,
  useGetSubmittedNoteDetailsQuery,
  useUpdateSubmittedNoteMutation,
  useUpdateActivityLogMutation,
} = agencyNotesApi;
