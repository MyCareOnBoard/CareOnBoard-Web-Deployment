import {createApi} from "@reduxjs/toolkit/query/react";
import {customBaseQuery} from "@/lib/baseQuery";
import {ClientStatsResponse} from "@/lib/api/clients";
import {EmployeeStatsResponse} from "@/lib/api/employees";
import {ShiftStatsResponse} from "@/lib/api/shift-management";

export const agencyDashboardApi = createApi({
  reducerPath: "agencyDashboardApi",
  baseQuery: customBaseQuery,
  tagTypes: ['SubmittedNotes', 'SubmittedNoteDetails'],
  endpoints: (builder) => ({
    getDSPStats: builder.query<EmployeeStatsResponse, string>({
      query: (agencyId) => ({
        url: `/employees/stats?agencyId=${agencyId}`,
        method: "GET",
        requiresAuth: true
      })
    }),
    getShiftStats: builder.query<ShiftStatsResponse, {agencyId: string, range?: string, date?: string}>({
      query: ({agencyId, range = 'lastWeek', date}) => {
        const params = new URLSearchParams({agencyId, range});
        if (date) params.append('date', date);
        return {
          url: `/shifts/stats?${params.toString()}`,
          method: "GET",
          requiresAuth: true
        };
      }
    }),
    getClientStats: builder.query<ClientStatsResponse, string>({
      query: (agencyId) => ({
        url: `/clients/stats?agencyId=${agencyId}`,
        method: "GET",
        requiresAuth: true
      })
    })
  }),
});

export const {
  useGetDSPStatsQuery,
  useGetShiftStatsQuery,
  useGetClientStatsQuery,
} = agencyDashboardApi;
