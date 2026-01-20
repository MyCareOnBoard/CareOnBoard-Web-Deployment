import { createApi } from "@reduxjs/toolkit/query/react";
import { customBaseQuery } from "@/lib/baseQuery";

export type BillingPlanCode = "basic" | "pro" | "enterprise" | (string & {});

export type BillingSubscriptionStatus =
  | "active"
  | "cancelled"
  | "expired"
  | "expiring_soon"
  | (string & {});

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface BillingMonitorAgency {
  agencyId: string;
  agencyName: string;
  logo?: string;
  plan?: BillingPlanCode;
  dspCount?: number;
  clientsCount?: number;
  subscriptionStart?: string; // ISO
  subscriptionEnd?: string; // ISO
  // Some backends return `expiryDate`/`dsp`/`clients`.
  expiryDate?: string; // ISO
  dsp?: number;
  clients?: number;
  status?: BillingSubscriptionStatus;
  sendNotification?: boolean;
}

export interface BillingMonitorAgencyRaw {
  agencyId: string;
  agencyName: string;
  logo?: string;
  plan?: BillingPlanCode;
  subscriptionStart?: string;
  startDate?: string;
  subscriptionStartDate?: string;
  subscriptionEnd?: string;
  sendNotification?: boolean;
  dspCount?: number;
  clientsCount?: number;
  expiryDate?: string;
  dsp?: number;
  clients?: number;
  status?: BillingSubscriptionStatus;
}

export interface BillingMonitorAgenciesResponse {
  success: boolean;
  data: BillingMonitorAgency[];
  pagination: Pagination;
}

export interface BillingMonitorAgenciesResponseRaw {
  success: boolean;
  data: BillingMonitorAgencyRaw[];
  pagination: Pagination;
}

export interface BillingMonitorHistoryItem {
  id: string;
  agencyId?: string;
  agencyName: string;
  before?: BillingPlanCode;
  after?: BillingPlanCode;
  activityDate?: string; // ISO
  createdAt?: string; // ISO
}

export interface BillingMonitorHistoryResponse {
  success: boolean;
  data: BillingMonitorHistoryItem[];
  pagination: Pagination;
}

export interface BillingMonitorStatsResponse {
  success: boolean;
  data: unknown;
}

export interface AgencyBillingInfo {
  plan?: BillingPlanCode;
  subscriptionStart?: string; // ISO
  subscriptionEnd?: string; // ISO
  status?: BillingSubscriptionStatus;
  sendNotification?: boolean;
}

export interface AgencyBillingInfoResponse {
  success: boolean;
  data?: AgencyBillingInfo;
  billing?: AgencyBillingInfo;
}

export interface ListBillingMonitorAgenciesParams {
  page?: number;
  limit?: number;
  search?: string;
  plan?: string;
  status?: BillingSubscriptionStatus;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface ListBillingMonitorHistoryParams {
  page?: number;
  limit?: number;
  search?: string;
  plan?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface UpsertBillingPlanRequest {
  plan: BillingPlanCode;
  subscriptionStart: string; // ISO
  subscriptionEnd: string; // ISO
  sendNotification: boolean;
}

export interface CancelAgencySubscriptionResponse {
  success: boolean;
  message?: string;
  data?: UpsertBillingPlanResult;
}

export interface UpdateAgencyBillingStatusRequest {
	status: BillingSubscriptionStatus;
	sendNotification?: boolean;
}

export interface UpsertBillingPlanResponse {
  success: boolean;
  message?: string;
  data?: UpsertBillingPlanResult;
}

export interface UpsertBillingPlanResult {
  agencyId: string;
  agencyName?: string;
  plan?: BillingPlanCode;
  subscriptionStart?: string;
  subscriptionEnd?: string;
  expiryDate?: string;
  status?: BillingSubscriptionStatus;
}

export interface EmployeesListResponse {
  success: boolean;
  count: number;
  total: number;
  employees: unknown[];
}

export interface ClientsListResponse {
  success: boolean;
  count: number;
  total: number;
  clients: unknown[];
}

export const billingMonitorApi = createApi({
  reducerPath: "billingMonitorApi",
  baseQuery: customBaseQuery,
  tagTypes: ["BillingMonitorAgencies", "BillingMonitorHistory", "BillingMonitorStats"],
  endpoints: (builder) => ({
    getBillingMonitorAgencies: builder.query<
      BillingMonitorAgenciesResponse,
      ListBillingMonitorAgenciesParams
    >({
      query: (params) => ({
        url: "/billingMonitor/agencies",
        method: "GET",
        params,
        requiresAuth: true,
      }),
      transformResponse: (response: BillingMonitorAgenciesResponseRaw): BillingMonitorAgenciesResponse => {
        const normalized = (response?.data ?? []).map((a) => {
          const subscriptionEnd = a.subscriptionEnd ?? a.expiryDate;
          const subscriptionStart = a.subscriptionStart ?? a.startDate ?? a.subscriptionStartDate;
          const dspCount = a.dspCount ?? a.dsp;
          const clientsCount = a.clientsCount ?? a.clients;

          return {
            ...a,
            subscriptionStart,
            subscriptionEnd,
            dspCount,
            clientsCount,
          } as BillingMonitorAgency;
        });

        return {
          ...response,
          data: normalized,
        };
      },
      providesTags: ["BillingMonitorAgencies"],
    }),

    getBillingMonitorHistory: builder.query<
      BillingMonitorHistoryResponse,
      ListBillingMonitorHistoryParams
    >({
      query: (params) => ({
        url: "/billingMonitor/history",
        method: "GET",
        params,
        requiresAuth: true,
      }),
      providesTags: ["BillingMonitorHistory"],
    }),

    getAgencyBillingMonitorHistory: builder.query<
      BillingMonitorHistoryResponse,
      { agencyId: string } & ListBillingMonitorHistoryParams
    >({
      query: ({ agencyId, ...params }) => ({
        url: `/billingMonitor/agencies/${agencyId}/history`,
        method: "GET",
        params,
        requiresAuth: true,
      }),
      providesTags: ["BillingMonitorHistory"],
    }),

    getBillingMonitorStats: builder.query<BillingMonitorStatsResponse, void>({
      query: () => ({
        url: "/billingMonitor/stats",
        method: "GET",
        requiresAuth: true,
      }),
      providesTags: ["BillingMonitorStats"],
    }),

    getAgencyBillingInfo: builder.query<AgencyBillingInfo, { agencyId: string }>({
      query: ({ agencyId }) => ({
        url: `/billingMonitor/agencies/${agencyId}/billing`,
        method: "GET",
        requiresAuth: true,
      }),
      transformResponse: (response: AgencyBillingInfoResponse) => {
        return response?.data ?? response?.billing ?? {};
      },
      providesTags: ["BillingMonitorAgencies", "BillingMonitorHistory", "BillingMonitorStats"],
    }),

    upsertAgencyBillingPlan: builder.mutation<
      UpsertBillingPlanResponse,
      { agencyId: string; data: UpsertBillingPlanRequest }
    >({
      query: ({ agencyId, data }) => ({
        url: `/billingMonitor/agencies/${agencyId}/billing`,
        method: "POST",
        data,
        requiresAuth: true,
      }),
      invalidatesTags: ["BillingMonitorAgencies", "BillingMonitorHistory", "BillingMonitorStats"],
    }),

    updateAgencyBillingStatus: builder.mutation<
      UpsertBillingPlanResponse,
      { agencyId: string; data: UpdateAgencyBillingStatusRequest }
    >({
      query: ({ agencyId, data }) => ({
        url: `/billingMonitor/agencies/${agencyId}/billing`,
        method: "POST",
        data,
        requiresAuth: true,
      }),
      invalidatesTags: ["BillingMonitorAgencies", "BillingMonitorHistory", "BillingMonitorStats"],
    }),

    cancelAgencySubscription: builder.mutation<
      CancelAgencySubscriptionResponse,
      { agencyId: string }
    >({
      query: ({ agencyId }) => ({
        url: `/billingMonitor/agencies/${agencyId}/cancel-subscription`,
        method: "POST",
        requiresAuth: true,
      }),
      invalidatesTags: ["BillingMonitorAgencies", "BillingMonitorHistory", "BillingMonitorStats"],
    }),

    getAgencyDspCount: builder.query<number, { agencyId: string }>({
      query: ({ agencyId }) => ({
        url: "/employees/",
        method: "GET",
        params: {
          agencyId,
          limit: 1,
          page: 1,
        },
        requiresAuth: true,
      }),
      transformResponse: (response: EmployeesListResponse) => {
        return typeof response?.total === "number"
          ? response.total
          : typeof response?.count === "number"
            ? response.count
            : 0;
      },
    }),

    getAgencyClientCount: builder.query<number, { agencyId: string }>({
      query: ({ agencyId }) => ({
        url: "/clients",
        method: "GET",
        params: {
          agencyId,
          limit: 1,
        },
        requiresAuth: true,
      }),
      transformResponse: (response: ClientsListResponse) => {
        return typeof response?.total === "number"
          ? response.total
          : typeof response?.count === "number"
            ? response.count
            : 0;
      },
    }),
  }),
});

export const {
  useGetBillingMonitorAgenciesQuery,
  useGetBillingMonitorHistoryQuery,
  useGetAgencyBillingMonitorHistoryQuery,
  useGetBillingMonitorStatsQuery,
  useGetAgencyBillingInfoQuery,
  useUpsertAgencyBillingPlanMutation,
  useUpdateAgencyBillingStatusMutation,
  useCancelAgencySubscriptionMutation,
  useGetAgencyDspCountQuery,
  useGetAgencyClientCountQuery,
} = billingMonitorApi;
