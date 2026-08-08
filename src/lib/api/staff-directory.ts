import { createApi } from "@reduxjs/toolkit/query/react";
import { customBaseQuery } from "@/lib/baseQuery";
import axiosClient from "@/lib/axios";
import type { ListShiftsParams, ListShiftsResponse, ShiftRequestOptions } from "@/lib/api/shifts";

export type StaffDirectoryAccountType = "employee" | "internal_user" | "agency_admin";
export type StaffDirectoryStatus = "active" | "inactive" | "suspended" | "terminated";

export interface StaffDirectoryStaffMember {
  id: string;
  accountType: StaffDirectoryAccountType;
  name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  status: StaffDirectoryStatus;
  agencyId: string;
  agency: {
    id: string;
    name: string;
  };
  avatarUrl: string | null;
  createdAt: string | null;
}

export interface StaffDirectoryPagination {
  hasMore: boolean;
  nextCursor: string | null;
}

export interface StaffDirectoryStats {
  total: number;
  active: number;
  internalUsers: number;
}

export interface StaffDirectoryAgencyOption {
  id: string;
  name: string;
  status: string | null;
}

export interface ListStaffDirectoryParams {
  agencyId?: string;
  search?: string;
  accountType?: StaffDirectoryAccountType;
  role?: string;
  sort?: "asc" | "desc";
  cursor?: string;
  limit?: number;
}

export interface ListStaffDirectoryResponse {
  success: boolean;
  agencies: StaffDirectoryAgencyOption[];
  staff: StaffDirectoryStaffMember[];
  pagination: StaffDirectoryPagination;
  stats: StaffDirectoryStats;
  updatedAt: string | null;
}

export interface SuperAdminStaffDetail extends StaffDirectoryStaffMember {
  clientTypes: Array<"hha" | "ddd">;
  profile: {
    email: string | null;
    phone: string | null;
    role: string | null;
    status: StaffDirectoryStatus;
    agency: StaffDirectoryStaffMember["agency"];
    createdAt: string | null;
    address: string | null;
    dateOfBirth: string | null;
    hireDate: string | null;
    workAvailability: boolean | null;
    bio: string | null;
  };
}

export interface SuperAdminStaffDocument {
  id: string;
  documentName: string;
  documentType: string | null;
  status: string;
  uploadedAt: string | null;
  expiryDate: string | null;
  canView: boolean;
}

export interface StaffDocumentsParams {
  staffId: string;
  cursor?: string;
}

export async function fetchStaffShiftsPage(
  staffId: string,
  params: ListShiftsParams,
  options?: ShiftRequestOptions,
): Promise<ListShiftsResponse> {
  const response = await axiosClient.get<ListShiftsResponse>(
    `/superAdminStaffDirectory/staff-directory/${encodeURIComponent(staffId)}/shifts`,
    {
      params: {
        startDate: params.startDate,
        endDate: params.endDate,
        limit: params.limit,
        ...(params.startAfter ? { cursor: params.startAfter } : {}),
      },
      signal: options?.signal,
    },
  );
  return response.data;
}

export const staffDirectoryApi = createApi({
  reducerPath: "staffDirectoryApi",
  baseQuery: customBaseQuery,
  keepUnusedDataFor: 300,
  endpoints: (builder) => ({
    listStaffDirectory: builder.query<ListStaffDirectoryResponse, ListStaffDirectoryParams | void>({
      query: (params = {}) => ({
        url: "/superAdminStaffDirectory/staff-directory",
        method: "GET",
        params,
        requiresAuth: true,
      }),
    }),
    getStaffDetail: builder.query<{ success: boolean; staff: SuperAdminStaffDetail }, string>({
      query: (staffId) => ({ url: `/superAdminStaffDirectory/staff-directory/${encodeURIComponent(staffId)}`, method: "GET", requiresAuth: true }),
    }),
    getStaffDocuments: builder.query<{ success: boolean; documents: SuperAdminStaffDocument[]; pagination: { hasMore: boolean; nextCursor: string | null } }, StaffDocumentsParams>({
      query: ({ staffId, cursor }) => ({ url: `/superAdminStaffDirectory/staff-directory/${encodeURIComponent(staffId)}/documents`, method: "GET", params: { limit: 50, ...(cursor ? { cursor } : {}) }, requiresAuth: true }),
    }),
    getStaffDocumentView: builder.query<{ success: boolean; viewUrl: string }, { staffId: string; documentId: string }>({
      query: ({ staffId, documentId }) => ({ url: `/superAdminStaffDirectory/staff-directory/${encodeURIComponent(staffId)}/documents/${encodeURIComponent(documentId)}/view`, method: "GET", requiresAuth: true }),
    }),
  }),
});

export const { useListStaffDirectoryQuery, useGetStaffDetailQuery, useGetStaffDocumentsQuery, useLazyGetStaffDocumentsQuery, useLazyGetStaffDocumentViewQuery } = staffDirectoryApi;
