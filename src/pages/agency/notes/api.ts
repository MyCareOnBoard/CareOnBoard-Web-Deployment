import {createApi} from "@reduxjs/toolkit/query/react";
import {customBaseQuery} from "@/lib/baseQuery";
import {SubmittedNotesResponse, SubmittedNotesQueryParams} from "./apiTypes";

export const agencyNotesApi = createApi({
  reducerPath: "agencyNotesApi",
  baseQuery: customBaseQuery,
  tagTypes: ['SubmittedNotes'],
  endpoints: (builder) => ({
    getAllSubmittedNotes: builder.query<SubmittedNotesResponse, SubmittedNotesQueryParams>({
      query: (params = {}) => {
        const queryParams = new URLSearchParams();
        
        if (params.page) queryParams.append('page', params.page.toString());
        if (params.limit) queryParams.append('limit', params.limit.toString());
        if (params.activityType) queryParams.append('activityType', params.activityType);
        if (params.search) queryParams.append('search', params.search);
        if (params.timeInterval) queryParams.append('timeInterval', params.timeInterval);
        
        return {
          url: `/employees/employee/submitted-notes?${queryParams.toString()}`,
          method: "GET",
          requiresAuth: true
        };
      },
      providesTags: ['SubmittedNotes']
    }),
  }),
});

export const {
  useGetAllSubmittedNotesQuery,
} = agencyNotesApi;
