import { createApi } from "@reduxjs/toolkit/query/react";
import { customBaseQuery } from "@/lib/baseQuery";

export interface ComplianceIssue {
    id: string;
    userId: string;
    subjectType?: "user" | "client";
    clientId?: string;
    userName: string;
    userEmail: string;
    agencyId: string;
    agencyName: string;
    status: "open" | "alerted" | "resolved";
    issueType: string;
    documentType?: string;
    noteType?: string;
    details: string;
    lastAlertSent?: string;
    fileUrl?: string;
    expiryDate?: string | null;
    expiryStatus?: string;
    createdAt: string;
    updatedAt?: string;
}

export interface ComplianceResponse {
    success: boolean;
    data: ComplianceIssue[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface ComplianceStats {
    documents: {
        total: number;
        open: number;
        alerted: number;
    };
    notes: {
        total: number;
        open: number;
        alerted: number;
    };
    evv: {
        total: number;
        open: number;
        alerted: number;
    };
    others: {
        total: number;
        open: number;
        alerted: number;
    };
}

export interface ComplianceStatsResponse {
    success: boolean;
    stats: ComplianceStats;
}

export type ComplianceCategory = "documents" | "notes" | "evv" | "others";

export interface SendAlertRequest {
    userId: string;
    category: ComplianceCategory;
    issueType: string;
    documentType?: string;
    details?: string;
}

export interface SendAlertResponse {
    success: boolean;
    message: string;
    data: {
        emailSent: boolean;
        sentTo: string;
        category: string;
        issueType: string;
    };
}

export interface SendClientComplianceAlertResponse {
    success: boolean;
    message: string;
    data: {
        clientId: string;
        agencyId: string;
        notifiedCount: number;
        skippedCount: number;
        notificationType: string;
    };
}

export interface ComplianceQueryParams {
    agencyId?: string;
    status?: "open" | "alerted" | "resolved";
    page?: number;
    limit?: number;
    search?: string;
}

export interface ComplianceAgencyOption {
    id: string;
    name: string;
    status: "active";
}

export interface ComplianceAgencyOptionsResponse {
    success: boolean;
    data: ComplianceAgencyOption[];
}

export interface ComplianceAgencyOptionsParams {
    ids?: string[];
}

export const complianceApi = createApi({
    reducerPath: "complianceApi",
    baseQuery: customBaseQuery,
    tagTypes: ["ComplianceDocuments", "ComplianceNotes", "ComplianceEvv", "ComplianceOthers", "ComplianceStats"],
    keepUnusedDataFor: 300,
    endpoints: (builder) => ({
        getComplianceAgencies: builder.query<
            ComplianceAgencyOptionsResponse,
            ComplianceAgencyOptionsParams
        >({
            query: ({ ids }) => ({
                url: "/superAdminCompliance/agencies",
                method: "GET",
                params: ids?.length ? { ids: ids.join(",") } : undefined,
                requiresAuth: true,
            }),
        }),
        getComplianceDocuments: builder.query<ComplianceResponse, ComplianceQueryParams>({
            query: (params) => ({
                url: `/superAdminCompliance/documents`,
                method: "GET",
                params,
                requiresAuth: true,
            }),
            providesTags: ["ComplianceDocuments"],
        }),
        getComplianceNotes: builder.query<ComplianceResponse, ComplianceQueryParams>({
            query: (params) => ({
                url: `/superAdminCompliance/notes`,
                method: "GET",
                params,
                requiresAuth: true,
            }),
            providesTags: ["ComplianceNotes"],
        }),
        getComplianceEvv: builder.query<ComplianceResponse, ComplianceQueryParams>({
            query: (params) => ({
                url: `/superAdminCompliance/evv`,
                method: "GET",
                params,
                requiresAuth: true,
            }),
            providesTags: ["ComplianceEvv"],
        }),
        getComplianceOthers: builder.query<ComplianceResponse, ComplianceQueryParams>({
            query: (params) => ({
                url: `/superAdminCompliance/others`,
                method: "GET",
                params,
                requiresAuth: true,
            }),
            providesTags: ["ComplianceOthers"],
        }),
        getComplianceStats: builder.query<ComplianceStatsResponse, void>({
            query: () => ({
                url: `/superAdminCompliance/stats`,
                method: "GET",
                requiresAuth: true,
            }),
            providesTags: ["ComplianceStats"],
        }),
        sendComplianceAlert: builder.mutation<SendAlertResponse, SendAlertRequest>({
            query: (data) => ({
                url: `/superAdminCompliance/send-alert`,
                method: "POST",
                data,
                requiresAuth: true,
            }),
            invalidatesTags: ["ComplianceDocuments", "ComplianceNotes", "ComplianceEvv", "ComplianceOthers", "ComplianceStats"],
        }),
        sendClientComplianceAlert: builder.mutation<SendClientComplianceAlertResponse, { clientId: string }>({
            query: ({ clientId }) => ({
                url: `/superAdminCompliance/clients/${encodeURIComponent(clientId)}/send-alert`,
                method: "POST",
                requiresAuth: true,
            }),
            invalidatesTags: ["ComplianceDocuments", "ComplianceStats"],
        }),
    }),
});

export const {
    useGetComplianceAgenciesQuery,
    useGetComplianceDocumentsQuery,
    useGetComplianceNotesQuery,
    useGetComplianceEvvQuery,
    useGetComplianceOthersQuery,
    useGetComplianceStatsQuery,
    useSendComplianceAlertMutation,
    useSendClientComplianceAlertMutation,
} = complianceApi;
