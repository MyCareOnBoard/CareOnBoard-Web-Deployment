/**
 * Agency Staff Management API
 * Handles all API calls related to agency staff management
 */

import { createApi } from "@reduxjs/toolkit/query/react";
import { customBaseQuery } from "@/lib/baseQuery";

/**
 * Available Access Scopes for Agency Staff
 */
export enum AgencyAccessScope {
    DSP_MANAGEMENT = "DSP Management",
    CLIENT_MANAGEMENT = "Client Management",
    SCHEDULING = "Shift Management",
    NOTES = "Notes",
    BILLING_MANAGEMENT = "Billing & Management",
    AI_AUTOMATION = "AI Automation",
    SUPPORT = "Support",
    ANALYTICS = "Analytics",
    GOALS_DOCUMENTS = "Goals & Documents",
    APPLICANT_DIRECTORY = "Applicant Directory",
    REPORTS = "Reports",
    COMMUNITY_INCLUSION = "Community Inclusion",
    TRAININGS = "Trainings",
    USER_LEVELS = "User Levels",
}

/**
 * Agency Staff Member interface
 */
export interface AgencyStaffMember {
    id: string;
    uid: string;
    name: string;
    email: string;
    phone?: string;
    accessList: string[];
    agencyModes?: ("ddd" | "hha")[];
    isActive: boolean;
    agencyId: string;
    createdAt: Date | string;
    updatedAt: Date | string;
    createdBy?: string;
    avatar?: string | null;
}

/**
 * Create Agency Staff Request
 */
export interface CreateAgencyStaffRequest {
    name: string;
    email: string;
    password: string;
    phone?: string;
    accessList: string[];
    agencyModes: ("ddd" | "hha")[];
}

/**
 * Update Agency Staff Request
 */
export interface UpdateAgencyStaffRequest {
    name?: string;
    phone?: string;
    password?: string;
    accessList?: string[];
    agencyModes?: ("ddd" | "hha")[];
}

/**
 * List Agency Staff Query Parameters
 */
export interface ListAgencyStaffParams {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
}

/**
 * List Agency Staff Response
 */
export interface ListAgencyStaffResponse {
    success: boolean;
    data: AgencyStaffMember[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

/**
 * Single Agency Staff Response
 */
export interface AgencyStaffResponse {
    success: boolean;
    data: AgencyStaffMember;
    message?: string;
}

/**
 * Create Agency Staff Response
 */
export interface CreateAgencyStaffResponse {
    success: boolean;
    message: string;
    user: AgencyStaffMember;
}

/**
 * Delete Agency Staff Response
 */
export interface DeleteAgencyStaffResponse {
    success: boolean;
    message: string;
}

/**
 * Get all available access scopes
 * @returns Array of access scope values
 */
export function getAgencyAccessScopes(): string[] {
    return Object.values(AgencyAccessScope);
}

/**
 * Agency Staff API using RTK Query
 */
export const agencyStaffApi = createApi({
    reducerPath: "agencyStaffApi",
    baseQuery: customBaseQuery,
    tagTypes: ["AgencyStaff"],
    keepUnusedDataFor: 300,
    endpoints: (builder) => ({
        /**
         * List all agency staff members
         */
        listAgencyStaff: builder.query<
            ListAgencyStaffResponse,
            ListAgencyStaffParams | void
        >({
            query: (params = {}) => {
                const queryParams = new URLSearchParams();
                if (params?.page) queryParams.append("page", params.page.toString());
                if (params?.limit) queryParams.append("limit", params.limit.toString());
                if (params?.search) queryParams.append("search", params.search);
                if (params?.isActive !== undefined)
                    queryParams.append("isActive", params.isActive.toString());

                return {
                    url: `/agencyStaff/staff${queryParams.toString() ? `?${queryParams.toString()}` : ""}`,
                    method: "GET",
                    requiresAuth: true,
                };
            },
            providesTags: ["AgencyStaff"],
        }),

        /**
         * Get a single agency staff member by ID
         */
        getAgencyStaff: builder.query<AgencyStaffResponse, string>({
            query: (staffId) => ({
                url: `/agencyStaff/staff/${staffId}`,
                method: "GET",
                requiresAuth: true,
            }),
            providesTags: (result, error, staffId) => [
                { type: "AgencyStaff", id: staffId },
            ],
        }),

        /**
         * Create a new agency staff member
         */
        createAgencyStaff: builder.mutation<
            CreateAgencyStaffResponse,
            CreateAgencyStaffRequest
        >({
            query: (data) => ({
                url: `/agencyStaff/staff`,
                method: "POST",
                data,
                requiresAuth: true,
            }),
            invalidatesTags: ["AgencyStaff"],
        }),

        /**
         * Update an existing agency staff member
         */
        updateAgencyStaff: builder.mutation<
            AgencyStaffResponse,
            { id: string; data: UpdateAgencyStaffRequest }
        >({
            query: ({ id, data }) => ({
                url: `/agencyStaff/staff/${id}`,
                method: "PATCH",
                data,
                requiresAuth: true,
            }),
            invalidatesTags: (result, error, { id }) => [
                "AgencyStaff",
                { type: "AgencyStaff", id },
            ],
        }),

        /**
         * Delete an agency staff member
         */
        deleteAgencyStaff: builder.mutation<DeleteAgencyStaffResponse, string>({
            query: (staffId) => ({
                url: `/agencyStaff/staff/${staffId}`,
                method: "DELETE",
                requiresAuth: true,
            }),
            invalidatesTags: ["AgencyStaff"],
        }),

        /**
         * Send password reset link to agency staff member
         */
        resetPassword: builder.mutation<{ success: boolean; message: string }, string>({
            query: (staffId) => ({
                url: `/agencyStaff/staff/${staffId}/reset-password`,
                method: "POST",
                requiresAuth: true,
            }),
        }),

        /**
         * Toggle active/inactive status for agency staff member
         */
        toggleActive: builder.mutation<{ success: boolean; message: string; data: { id: string; isActive: boolean } }, string>({
            query: (staffId) => ({
                url: `/agencyStaff/staff/${staffId}/toggle-active`,
                method: "POST",
                requiresAuth: true,
            }),
            invalidatesTags: ["AgencyStaff"],
        }),
    }),
});

/**
 * Export hooks for use in components
 */
export const {
    useListAgencyStaffQuery,
    useGetAgencyStaffQuery,
    useCreateAgencyStaffMutation,
    useUpdateAgencyStaffMutation,
    useDeleteAgencyStaffMutation,
    useResetPasswordMutation,
    useToggleActiveMutation,
} = agencyStaffApi;
