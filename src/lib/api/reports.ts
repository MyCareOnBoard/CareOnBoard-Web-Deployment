import { createApi } from "@reduxjs/toolkit/query/react";
import {customBaseQuery} from "@/lib/baseQuery";


export interface ReportFilters {
  status?: string;
  noteType?: string;
  startDate?: string;
  endDate?: string;
  isLifetime?: boolean;
  agencyId?: string;
}

export interface ClientReport {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  status: string;
  createdAt: string;
  documentCount: number;
}

export interface ClientDocument {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  uploadedAt: string;
  uploadedBy: string;
}

export interface DSPReport {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  role: string;
  workAvailability: boolean;
  status: string;
  createdAt: string;
  documentCount: number;
}

export interface DSPDocument {
  id: string;
  documentType: string;
  fileUrl: string;
  status: string;
  uploadDate: string;
  expiryDate: string | null;
}

export interface ShiftReport {
  id: string;
  fullName: string;
  totalDSPs: number;
  approvedNotesCount: number;
}

export interface ApprovedNote {
  id: string;
  employeeId: string;
  employeeName: string;
  activityLogId: string;
  activityType: string;
  submittedAt: string;
  approvedAt: string;
  noteCount: number;
}

export interface NoteReport {
  id: string;
  fullName: string;
  email: string;
  role: string;
  approvedNotesCount: number;
}

export interface DSPApprovedNote {
  id: string;
  activityLogId: string;
  activityType: string;
  activityDescription: string;
  submittedAt: string;
  approvedAt: string;
  noteCount: number;
}

export interface AgencySummary {
  id: string;
  agencyName: string;
  totalClients: number;
  totalDSPs: number;
  totalApprovedNotes: number;
  status: string;
  createdAt: string;
}

export const reportsApi = createApi({
  reducerPath: "reportsApi",
  baseQuery: customBaseQuery,
  tagTypes: ["ClientsReport", "DSPsReport", "ShiftsReport", "NotesReport", "AgenciesSummary"],
  endpoints: (builder) => ({
    // Clients Report
    getClientsReport: builder.query<
      { success: boolean; data: ClientReport[]; total: number },
      ReportFilters
    >({
      query: (filters) => ({
        url: "/reports/clients",
        method: "GET",
        params: filters,
        requiresAuth: true,
      }),
      providesTags: ["ClientsReport"],
    }),

    getClientDocuments: builder.query<
      { success: boolean; data: ClientDocument[]; total: number },
      string
    >({
      query: (clientId) => ({
        url: `/reports/clients/${clientId}/documents`,
        method: "GET",
        requiresAuth: true,
      }),
    }),

    // DSPs Report
    getDSPsReport: builder.query<
      { success: boolean; data: DSPReport[]; total: number },
      ReportFilters
    >({
      query: (filters) => ({
        url: "/reports/dsps",
        method: "GET",
        params: filters,
        requiresAuth: true,
      }),
      providesTags: ["DSPsReport"],
    }),

    getDSPDocuments: builder.query<
      { success: boolean; data: DSPDocument[]; total: number },
      string
    >({
      query: (employeeId) => ({
        url: `/reports/dsps/${employeeId}/documents`,
        method: "GET",
        requiresAuth: true,
      }),
    }),

    // Shifts Report
    getShiftsReport: builder.query<
      { success: boolean; data: ShiftReport[]; total: number },
      ReportFilters
    >({
      query: (filters) => ({
        url: "/reports/shifts",
        method: "GET",
        params: filters,
        requiresAuth: true,
      }),
      providesTags: ["ShiftsReport"],
    }),

    getClientApprovedNotes: builder.query<
      { success: boolean; data: ApprovedNote[]; total: number },
      string
    >({
      query: (clientId) => ({
        url: `/reports/shifts/clients/${clientId}/notes`,
        method: "GET",
        requiresAuth: true,
      }),
    }),

    // Notes Report
    getNotesReport: builder.query<
      { success: boolean; data: NoteReport[]; total: number },
      ReportFilters
    >({
      query: (filters) => ({
        url: "/reports/notes",
        method: "GET",
        params: filters,
        requiresAuth: true,
      }),
      providesTags: ["NotesReport"],
    }),

    getDSPApprovedNotes: builder.query<
      { success: boolean; data: DSPApprovedNote[]; total: number },
      { employeeId: string; noteType?: string }
    >({
      query: ({ employeeId, noteType }) => ({
        url: `/reports/notes/dsps/${employeeId}/notes`,
        method: "GET",
        params: noteType ? { noteType } : {},
        requiresAuth: true,
      }),
    }),

    // Super Admin Reports - All Agencies
    getSuperAdminClientsReport: builder.query<
      { success: boolean; data: ClientReport[]; total: number },
      ReportFilters
    >({
      query: (filters) => ({
        url: "/superAdminReports/clients",
        method: "GET",
        params: filters,
        requiresAuth: true,
      }),
      providesTags: ["ClientsReport"],
    }),

    getSuperAdminDSPsReport: builder.query<
      { success: boolean; data: DSPReport[]; total: number },
      ReportFilters
    >({
      query: (filters) => ({
        url: "/superAdminReports/dsps",
        method: "GET",
        params: filters,
        requiresAuth: true,
      }),
      providesTags: ["DSPsReport"],
    }),

    getSuperAdminShiftsReport: builder.query<
      { success: boolean; data: ShiftReport[]; total: number },
      ReportFilters
    >({
      query: (filters) => ({
        url: "/superAdminReports/shifts",
        method: "GET",
        params: filters,
        requiresAuth: true,
      }),
      providesTags: ["ShiftsReport"],
    }),

    getSuperAdminNotesReport: builder.query<
      { success: boolean; data: NoteReport[]; total: number },
      ReportFilters
    >({
      query: (filters) => ({
        url: "/superAdminReports/notes",
        method: "GET",
        params: filters,
        requiresAuth: true,
      }),
      providesTags: ["NotesReport"],
    }),

    getAgenciesSummaryReport: builder.query<
      { success: boolean; data: AgencySummary[]; total: number },
      { startDate?: string; endDate?: string; isLifetime?: boolean }
    >({
      query: (filters) => ({
        url: "/superAdminReports/agencies-summary",
        method: "GET",
        params: filters,
        requiresAuth: true,
      }),
      providesTags: ["AgenciesSummary"],
    }),
  }),
});

export const {
  useGetClientsReportQuery,
  useGetClientDocumentsQuery,
  useGetDSPsReportQuery,
  useGetDSPDocumentsQuery,
  useGetShiftsReportQuery,
  useGetClientApprovedNotesQuery,
  useGetNotesReportQuery,
  useGetDSPApprovedNotesQuery,
  useGetSuperAdminClientsReportQuery,
  useGetSuperAdminDSPsReportQuery,
  useGetSuperAdminShiftsReportQuery,
  useGetSuperAdminNotesReportQuery,
  useGetAgenciesSummaryReportQuery,
} = reportsApi;
