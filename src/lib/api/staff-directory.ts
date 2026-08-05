import { createApi } from "@reduxjs/toolkit/query/react";
import { customBaseQuery } from "@/lib/baseQuery";

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
  }),
});

export const { useListStaffDirectoryQuery } = staffDirectoryApi;
