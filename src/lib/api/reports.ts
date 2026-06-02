import {createApi} from "@reduxjs/toolkit/query/react";
import {customBaseQuery} from "@/lib/baseQuery";


export interface ReportFilters {
    status?: string;
    noteType?: string;
    startDate?: string;
    endDate?: string;
    isLifetime?: boolean;
    agencyId?: string;
    groupBy?: string;
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
    profilePictureUrl?: string | null;
    clientCount: number;
    trainingCompleted: number;
    trainingTotal: number;
}

export interface DSPDocument {
    id: string;
    documentType: string;
    fileUrl: {
        fileName: string;
        fileUrl: string;
        fileType: string;
    };
    status: string;
    uploadDate: string;
    expiryDate: string | null;
}

export interface ShiftReport {
    id: string;
    fullName: string;
    totalDSPs: number;
    approvedNotesCount: number;
    totalApprovedNotes: number;
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

export interface MileageReport {
    id: string;
    fullName: string;
    email: string;
    role: string;
    totalRides: number;
    totalMiles: number;
}

export interface MileageDetail {
    id: string;
    clientName: string | null;
    purpose?: string | null;
    scheduledStartTime: string;
    actualDistance: number | null;
    segmentCount?: number;
    startedAt?: string | null;
    completedAt?: string | null;
    notes?: string | null;
    status: string;
}

export interface ExpenseReport {
    id: string;
    fullName: string;
    email: string;
    role: string;
    totalExpenses: number;
    totalAmount: number;
}

export interface ExpenseDetail {
    id: string;
    category: string;
    description: string;
    amount: number;
    date: string;
    submittedAt: string;
    status: string;
}

export interface BillingReport {
    id: string;
    fullName: string;
    totalClaims: number;
    totalAmount: number;
    approvedAmount: number;
}

export interface BillingDetail {
    id: string;
    claimNumber: string;
    serviceType: string;
    serviceDate: string;
    amount: number;
    submittedAt: string;
    status: string;
}

export interface IncidentReport {
    id: string;
    fullName: string;
    email: string;
    role: string;
    totalIncidents: number;
    resolvedIncidents: number;
    incidents?: IncidentDetail[];
}

export interface IncidentDetail {
    id: string;
    incidentType: string;
    clientName: string;
    description: string;
    date: string;
    submittedAt: string;
    status: string;
    severity: string;
}

export interface CommunityInclusionReport {
    id: string;
    fullName: string;
    totalActivities: number;
    totalAttendees: number;
    totalHours: number;
}

export interface CommunityInclusionDetail {
    id: string;
    date: string;
    attendees: any[];
    createdAt: string;
}

// ── Analytics interfaces ──────────────────────────────────────────────────────

export interface SparklinePoint {
    value: number;
}

export interface KpiMetric {
    value: number;
    trend: number;
    sparkline: SparklinePoint[];
}

export interface ComplianceBreakdownItem {
    label: string;
    value: number;
    color: string;
    description?: string;
}

export interface BillingBreakdownItem {
    label: string;
    value: number;
    color: string;
}

export interface RiskTrendPoint {
    month: string;
    expired: number;
    overtime: number;
    missing: number;
}

export interface OperationalMetricData {
    value: string;
    trend: number;
    sparkline: SparklinePoint[];
}

export interface AnalyticsSummaryData {
    overview: {
        complianceRate: KpiMetric;
        totalIssues: KpiMetric;
        revenue: KpiMetric;
        shiftsBilled: KpiMetric;
    };
    complianceInsights: {
        total: number;
        breakdown: ComplianceBreakdownItem[];
    };
    billingSummary: {
        total: number;
        breakdown: BillingBreakdownItem[];
    };
    riskTrends: RiskTrendPoint[];
    operationalEfficiency: {
        completionRate: OperationalMetricData;
        onTimeRate: OperationalMetricData;
        manualRate: OperationalMetricData;
    };
}

export interface AnalyticsFilters {
    startDate?: string;
    endDate?: string;
}

export interface AnalyticsInsightSection {
    insight: string;
    recommendation: string;
}

export interface AnalyticsInsights {
    compliance: AnalyticsInsightSection;
    risk: AnalyticsInsightSection;
    efficiency: AnalyticsInsightSection;
    billing: AnalyticsInsightSection;
}

// ─────────────────────────────────────────────────────────────────────────────

export const reportsApi = createApi({
    reducerPath: "reportsApi",
    baseQuery: customBaseQuery,
    tagTypes: ["ClientsReport", "DSPsReport", "ShiftsReport", "NotesReport", "AgenciesSummary", "MileageReport", "ExpenseReport", "BillingReport", "IncidentReport", "CommunityInclusionReport", "AnalyticsReport"],
    keepUnusedDataFor: 300,
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
            query: ({employeeId, noteType}) => ({
                url: `/reports/notes/dsps/${employeeId}/notes`,
                method: "GET",
                params: noteType ? {noteType} : {},
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

        // Mileage Report
        getMileageReport: builder.query<
            { success: boolean; data: MileageReport[]; total: number },
            ReportFilters
        >({
            query: (filters) => ({
                url: "/reports/mileage",
                method: "GET",
                params: filters,
                requiresAuth: true,
            }),
            providesTags: ["MileageReport"],
        }),

        getDSPMileageDetails: builder.query<
            { success: boolean; data: MileageDetail[]; total: number },
            { employeeId: string; status?: string }
        >({
            query: ({employeeId, status}) => ({
                url: `/reports/mileage/dsps/${employeeId}/rides`,
                method: "GET",
                params: status ? {status} : {},
                requiresAuth: true,
            }),
        }),

        // Expense Report
        getExpenseReport: builder.query<
            { success: boolean; data: ExpenseReport[]; total: number },
            ReportFilters
        >({
            query: (filters) => ({
                url: "/reports/expenses",
                method: "GET",
                params: filters,
                requiresAuth: true,
            }),
            providesTags: ["ExpenseReport"],
        }),

        getDSPExpenseDetails: builder.query<
            { success: boolean; data: ExpenseDetail[]; total: number },
            { employeeId: string; status?: string }
        >({
            query: ({employeeId, status}) => ({
                url: `/reports/expenses/dsps/${employeeId}/expenses`,
                method: "GET",
                params: status ? {status} : {},
                requiresAuth: true,
            }),
        }),

        // Billing Report
        getBillingReport: builder.query<
            { success: boolean; data: BillingReport[]; total: number },
            ReportFilters
        >({
            query: (filters) => ({
                url: "/reports/billing",
                method: "GET",
                params: filters,
                requiresAuth: true,
            }),
            providesTags: ["BillingReport"],
        }),

        getClientBillingDetails: builder.query<
            { success: boolean; data: BillingDetail[]; total: number },
            { clientId: string; status?: string }
        >({
            query: ({clientId, status}) => ({
                url: `/reports/billing/clients/${clientId}/claims`,
                method: "GET",
                params: status ? {status} : {},
                requiresAuth: true,
            }),
        }),

        // Incident Report
        getIncidentReport: builder.query<
            { success: boolean; data: IncidentReport[]; total: number },
            ReportFilters
        >({
            query: (filters) => ({
                url: "/reports/incidents",
                method: "GET",
                params: filters,
                requiresAuth: true,
            }),
            providesTags: ["IncidentReport"],
        }),

        getDSPIncidentDetails: builder.query<
            { success: boolean; data: IncidentDetail[]; total: number },
            { employeeId: string; status?: string }
        >({
            query: ({employeeId, status}) => ({
                url: `/reports/incidents/dsps/${employeeId}/incidents`,
                method: "GET",
                params: status ? {status} : {},
                requiresAuth: true,
            }),
        }),

        // Community Inclusion Report
        getCommunityInclusionReport: builder.query<
            { success: boolean; data: CommunityInclusionReport[]; total: number },
            ReportFilters
        >({
            query: (filters) => ({
                url: "/reports/community-inclusions",
                method: "GET",
                params: filters,
                requiresAuth: true,
            }),
            providesTags: ["CommunityInclusionReport"],
        }),

        getClientCommunityInclusionDetails: builder.query<
            { success: boolean; data: CommunityInclusionDetail[]; total: number },
            string
        >({
            query: (clientId) => ({
                url: `/reports/community-inclusions/clients/${clientId}/activities`,
                method: "GET",
                requiresAuth: true,
            }),
        }),

        // Super Admin Reports for new types
        getSuperAdminMileageReport: builder.query<
            { success: boolean; data: MileageReport[]; total: number },
            ReportFilters
        >({
            query: (filters) => ({
                url: "/superAdminReports/mileage",
                method: "GET",
                params: filters,
                requiresAuth: true,
            }),
            providesTags: ["MileageReport"],
        }),

        getSuperAdminExpenseReport: builder.query<
            { success: boolean; data: ExpenseReport[]; total: number },
            ReportFilters
        >({
            query: (filters) => ({
                url: "/superAdminReports/expenses",
                method: "GET",
                params: filters,
                requiresAuth: true,
            }),
            providesTags: ["ExpenseReport"],
        }),

        getSuperAdminBillingReport: builder.query<
            { success: boolean; data: BillingReport[]; total: number },
            ReportFilters
        >({
            query: (filters) => ({
                url: "/superAdminReports/billing",
                method: "GET",
                params: filters,
                requiresAuth: true,
            }),
            providesTags: ["BillingReport"],
        }),

        getSuperAdminIncidentReport: builder.query<
            { success: boolean; data: IncidentReport[]; total: number },
            ReportFilters
        >({
            query: (filters) => ({
                url: "/superAdminReports/incidents",
                method: "GET",
                params: filters,
                requiresAuth: true,
            }),
            providesTags: ["IncidentReport"],
        }),

        getSuperAdminCommunityInclusionReport: builder.query<
            { success: boolean; data: CommunityInclusionReport[]; total: number },
            ReportFilters
        >({
            query: (filters) => ({
                url: "/superAdminReports/community-inclusions",
                method: "GET",
                params: filters,
                requiresAuth: true,
            }),
            providesTags: ["CommunityInclusionReport"],
        }),

        // Analytics Summary
        getAnalyticsSummary: builder.query<
            { success: boolean; data: AnalyticsSummaryData },
            AnalyticsFilters
        >({
            query: (filters) => ({
                url: "/reports/analytics/summary",
                method: "GET",
                params: filters,
                requiresAuth: true,
            }),
            providesTags: ["AnalyticsReport"],
            keepUnusedDataFor: 120,
        }),

        // Analytics AI Insights
        getAnalyticsInsights: builder.query<
            { success: boolean; data: AnalyticsInsights },
            AnalyticsFilters
        >({
            query: (filters) => ({
                url: "/reports/analytics/insights",
                method: "GET",
                params: filters,
                requiresAuth: true,
            }),
            providesTags: ["AnalyticsReport"],
            keepUnusedDataFor: 300,
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
    useGetMileageReportQuery,
    useGetDSPMileageDetailsQuery,
    useGetExpenseReportQuery,
    useGetDSPExpenseDetailsQuery,
    useGetBillingReportQuery,
    useGetClientBillingDetailsQuery,
    useGetIncidentReportQuery,
    useGetDSPIncidentDetailsQuery,
    useLazyGetDSPIncidentDetailsQuery,
    useGetCommunityInclusionReportQuery,
    useGetClientCommunityInclusionDetailsQuery,
    useGetSuperAdminMileageReportQuery,
    useGetSuperAdminExpenseReportQuery,
    useGetSuperAdminBillingReportQuery,
    useGetSuperAdminIncidentReportQuery,
    useGetSuperAdminCommunityInclusionReportQuery,
    useGetAnalyticsSummaryQuery,
    useLazyGetAnalyticsInsightsQuery,
} = reportsApi;
