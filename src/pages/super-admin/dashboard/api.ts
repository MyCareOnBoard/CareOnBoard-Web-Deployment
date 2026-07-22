import { createApi } from "@reduxjs/toolkit/query/react";
import { customBaseQuery } from "@/lib/baseQuery";

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

export type ComplianceMode = "hha" | "ddd";
export type ComplianceSortBy =
  | "agencyName"
  | "complianceRate"
  | "totalIssues"
  | "populationTotal";
export type ComplianceSortOrder = "asc" | "desc";

export interface ComplianceBreakdownItem {
  key: string;
  label: string;
  value: number;
  color: string;
}

export interface ComplianceScopeParams {
  startDate: string;
  endDate: string;
  mode?: ComplianceMode;
}

export interface ComplianceSummaryParams extends ComplianceScopeParams {
  agencyIds?: string | null;
}

export interface AgencyComplianceParams extends ComplianceScopeParams {
  search?: string;
  sortBy: ComplianceSortBy;
  sortOrder: ComplianceSortOrder;
  page: number;
  limit: number;
}

export interface ComplianceTrendMetric {
  trend: number;
  sparkline: [{ value: number }, { value: number }];
}

export interface ComplianceTrends {
  complianceRate: ComplianceTrendMetric;
  totalIssues: ComplianceTrendMetric;
  agenciesWithIssues: ComplianceTrendMetric;
  populationTotal: ComplianceTrendMetric;
}

export interface ComplianceAggregate {
  complianceRate: number;
  populationTotal: number;
  nonCompliantPeople: number;
  totalIssues: number;
  agenciesWithIssues: number;
  breakdown: ComplianceBreakdownItem[];
}

export interface AgencyComplianceRow {
  agencyId: string;
  agencyName: string;
  programs: string[];
  complianceRate: number;
  populationTotal: number;
  nonCompliantPeople: number;
  totalIssues: number;
  breakdown: ComplianceBreakdownItem[];
}

export interface ComplianceScope extends ComplianceScopeParams {
  agencyIds?: string[];
}

export interface NetworkComplianceSummaryResponse {
  success: boolean;
  data: {
    generatedAt: string;
    scope: ComplianceScope;
    comparison?: {
      startDate: string;
      endDate: string;
    };
    trends?: ComplianceTrends;
    aggregate: ComplianceAggregate;
  };
}

export interface AgencyComplianceResponse {
  success: boolean;
  data: AgencyComplianceRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  scope: ComplianceScope;
  generatedAt: string;
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

function scopeParams(params: ComplianceScopeParams) {
  return {
    startDate: params.startDate,
    endDate: params.endDate,
    ...(params.mode ? { mode: params.mode } : {}),
  };
}

export function buildNetworkComplianceSummaryRequest(
  params: ComplianceSummaryParams,
) {
  const agencyIds = params.agencyIds?.trim();

  return {
    url: "/superAdminDashboard/compliance/summary",
    method: "GET",
    params: {
      ...scopeParams(params),
      ...(agencyIds ? { agencyIds } : {}),
    },
    requiresAuth: true,
  };
}

export function buildAgencyComplianceRequest(params: AgencyComplianceParams) {
  return {
    url: "/superAdminDashboard/compliance/agencies",
    method: "GET",
    params: {
      ...scopeParams(params),
      ...(params.search ? { search: params.search } : {}),
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
      page: params.page,
      limit: params.limit,
    },
    requiresAuth: true,
  };
}

export const superAdminDashboardApi = createApi({
  reducerPath: "superAdminDashboardApi",
  baseQuery: customBaseQuery,
  tagTypes: [
    "SuperAdminStats",
    "ShiftStats",
    "AttendanceReport",
    "NetworkComplianceSummary",
    "AgencyComplianceRows",
  ],
  keepUnusedDataFor: 300,
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
    getNetworkComplianceSummary: builder.query<
      NetworkComplianceSummaryResponse,
      ComplianceSummaryParams
    >({
      query: buildNetworkComplianceSummaryRequest,
      providesTags: ["NetworkComplianceSummary"],
    }),
    getAgencyCompliance: builder.query<
      AgencyComplianceResponse,
      AgencyComplianceParams
    >({
      query: buildAgencyComplianceRequest,
      providesTags: ["AgencyComplianceRows"],
    }),
  }),
});

export const {
  useGetSuperAdminStatsQuery,
  useGetShiftStatsQuery,
  useGetAttendanceReportQuery,
  useGetNetworkComplianceSummaryQuery,
  useGetAgencyComplianceQuery,
} = superAdminDashboardApi;
