import { createApi } from "@reduxjs/toolkit/query/react";
import { customBaseQuery } from "@/lib/baseQuery";
import { ClientStatsResponse } from "@/lib/api/clients";
import { EmployeeStatsResponse } from "@/lib/api/employees";
import { ShiftStatsResponse } from "@/lib/api/shifts";

export const agencyDashboardApi = createApi({
  reducerPath: "agencyDashboardApi",
  baseQuery: customBaseQuery,
  tagTypes: ['SubmittedNotes', 'SubmittedNoteDetails'],
  keepUnusedDataFor: 300,
  endpoints: (builder) => ({
    getDSPStats: builder.query<EmployeeStatsResponse, { agencyId: string; type?: string }>({
      query: ({ agencyId, type }) => {
        const params = new URLSearchParams({ agencyId });
        if (type) params.append('type', type);
        return {
          url: `/employees/stats?${params.toString()}`,
          method: "GET",
          requiresAuth: true
        };
      }
    }),
    getShiftStats: builder.query<ShiftStatsResponse, { agencyId: string, range?: string, date?: string }>({
      query: ({ agencyId, range = 'lastWeek', date }) => {
        const params = new URLSearchParams({ agencyId, range });
        if (date) params.append('date', date);
        return {
          url: `/shifts/stats?${params.toString()}`,
          method: "GET",
          requiresAuth: true
        };
      }
    }),
    getClientStats: builder.query<ClientStatsResponse, { agencyId: string; type?: string }>({
      query: ({ agencyId, type }) => {
        const params = new URLSearchParams({ agencyId });
        if (type) params.append('type', type);
        return {
          url: `/clients/stats?${params.toString()}`,
          method: "GET",
          requiresAuth: true
        };
      }
    })
  }),
});

export const {
  useGetDSPStatsQuery,
  useGetShiftStatsQuery,
  useGetClientStatsQuery,
} = agencyDashboardApi;
