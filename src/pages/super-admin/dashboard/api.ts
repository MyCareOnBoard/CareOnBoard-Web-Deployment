import {createApi} from "@reduxjs/toolkit/query/react";
import {customBaseQuery} from "@/lib/baseQuery";

export interface SuperAdminStats {
  totalAgencies: number;
  totalStaff: number;
  totalClients: number;
  ongoingIncidents: number;
  scheduledIncidents: number;
  pendingNotes: number;
  pendingTimesheets: number;
}

export interface ShiftBucket {
  time: string;
  scheduled: number;
  completed: number;
}

export interface AttendanceData {
  time: string;
  days: number[];
}

export interface SuperAdminStatsResponse {
  success: boolean;
  stats: SuperAdminStats;
}

export interface ShiftStatsResponse {
  success: boolean;
  buckets: ShiftBucket[];
}

export interface AttendanceReportResponse {
  success: boolean;
  data: AttendanceData[];
}

export const superAdminDashboardApi = createApi({
  reducerPath: "superAdminDashboardApi",
  baseQuery: customBaseQuery,
  tagTypes: ["SuperAdminStats", "ShiftStats", "AttendanceReport"],
  endpoints: (builder) => ({
    getSuperAdminStats: builder.query<SuperAdminStatsResponse, void>({
      query: () => ({
        url: "/superAdminDashboard/stats",
        method: "GET",
        requiresAuth: true,
      }),
      providesTags: ["SuperAdminStats"],
    }),
    getShiftStats: builder.query<ShiftStatsResponse, void>({
      query: () => ({
        url: "/superAdminDashboard/shifts/stats",
        method: "GET",
        requiresAuth: true,
      }),
      providesTags: ["ShiftStats"],
    }),
    getAttendanceReport: builder.query<AttendanceReportResponse, void>({
      query: () => ({
        url: "/superAdminDashboard/attendance/report",
        method: "GET",
        requiresAuth: true,
      }),
      providesTags: ["AttendanceReport"],
    }),
  }),
});

export const {
  useGetSuperAdminStatsQuery,
  useGetShiftStatsQuery,
  useGetAttendanceReportQuery,
} = superAdminDashboardApi;
