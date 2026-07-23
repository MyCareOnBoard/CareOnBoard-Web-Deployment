import {createApi} from "@reduxjs/toolkit/query/react";
import {customBaseQuery} from "@/lib/baseQuery";
import {Agency} from "@/lib/api/agencies";
import {ListAgenciesResponse} from "@/lib/api/agencies";
import {
  GetDraftAgencyResponse, GetSingleAgencyUsersItem,
  GetSummaryAgencyInfoResponse,
  ListDraftAgenciesResponse
} from "@/pages/super-admin/agencies/apiTypes";

export interface CreateAgencyWithUserPayloadAgency {
  // Step 1: Agency Identity Information
  id?: string;
  uid?: string;
  name: string;
  legalBusinessName?: string;
  dba?: string;
  agencyType?: string;
  ein?: string;
  npi?: string;
  providerId?: string;
  medicaidProviderId?: string;
  // Step 2: Contact Information
  email: string;
  phone?: string;
  address?: string;
  county?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  website?: string;
  // Supported client types (DDD / HHA)
  supportedClientTypes?: ("ddd" | "hha")[];
  // Step 4: Service Configuration
  services?: string[];
  serviceCodeMapping?: Record<string, any>;
  evvSettings?: Record<string, any>;
  // Step 5: Operational Settings
  schedulingRules?: string;
  maxShiftPerDay?: number;
  travelTimeRules?: string;
  travelTimeRate?: number;
  mileageSettings?: string;
  mileageRate?: number;
  incidentReportingSettings?: string;
  whoReceivesNotifications?: string;
  expenseReportSettings?: string;
  allowedFileTypes?: string[];
  allowRecurringSchedules?: boolean;
  allowOverlappingVisits?: boolean;
  offerMileageReimbursements?: boolean;
  realtimeGpsTracking?: boolean;
  // Step 6: AI Settings & Permissions
  aiNotesReview?: boolean;
  aiPlanOfCareBuilder?: boolean;
  aiScheduleOptimizer?: boolean;
  aiDataCleaner?: boolean;
  aiBillingValidator?: boolean;
  // Step 7: Document Requirements
  requireIds?: boolean;
  requireSsn?: boolean;
  requireResume?: boolean;
  requireCertificates?: boolean;
  requireTrainings?: boolean;
  requireClearances?: boolean;
  expiryRules?: boolean;
  autoReminders?: boolean;
  reminderFrequency?: string;
  whoReceivesReminders?: string;
  // Step 8: Branding Setup
  logo?: string;
  themeColor?: string;
  letterhead?: string;
  primaryColor?: string;
  // Step 9: Billing Configuration
  billingFormat?: string;
  dddFormat?: string;
  hhaExchangeFormat?: string;
  allowCustomReport?: boolean;
  invoiceName?: string;
  invoiceEmail?: string;
  invoiceFax?: string;
  payrollSystemIntegration?: string;
  quickBooks?: string;
  adp?: string;
  paycheck?: string;
  // Step 10: Subscription & Licensing
  subscriptionTier?: string;
  numberOfDspSeats?: number;
  addOns?: string[];
  // Step 11: Security & Compliance
  defaultUserRoles?: string[];
  permissionTemplates?: boolean;
  twoFactorAuth?: boolean;
  auditRetentionPeriod?: string;
  auditRetentionPeriodNumber?: string;
  planStartDate?: string;
  planEndDate?: string | null;
}

export interface CreateAgencyWithUserPayloadUser {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
  userType: string;
}

export interface CreateAgencyWithUserPayload {
  agency: CreateAgencyWithUserPayloadAgency;
  user: CreateAgencyWithUserPayloadUser;
}

export interface SaveAgencyDraftPayload extends CreateAgencyWithUserPayload {
  name: string;
}

export interface CreateAgencyWithUserResponse {
  success: boolean;
  message: string;
  agency: Agency;
  user: {
    uid: string;
    email: string;
    displayName: string;
  };
}

export interface UploadFileResponse {
  success: boolean;
  message: string;
  url: string;
  fileName: string;
  fileType: string;
}

export const superAdminApi = createApi({
  reducerPath: "superAdminApi",
  baseQuery: customBaseQuery,
  tagTypes: ['Agencies'],
  keepUnusedDataFor: 300,
  endpoints: (builder) => ({
    createAgencyWithUser: builder.mutation<CreateAgencyWithUserResponse, CreateAgencyWithUserPayload>({
      query: (data) => ({
        url: `/agencyManagement/agencies`,
        method: "POST",
        data,
        requiresAuth: true
      }),
      invalidatesTags: ['Agencies']
    }),
    uploadAgencyFile: builder.mutation<UploadFileResponse, { file: File; fileType: 'logo' | 'letterhead'; }>({
      query: ({file, fileType}) => {
        const formData = new FormData();
        formData.append('file', file);

        const endpoint = fileType === 'logo' ? '/uploads/agency-logo' : '/uploads/agency-letterhead';

        return {
          url: endpoint,
          method: "POST",
          data: formData,
          requiresAuth: true,
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        };
      },
    }),
    listAllAgencies: builder.query<
      ListAgenciesResponse,
      { limit?: number; status?: Agency["status"] }
    >({
      query: ({ limit, status }) => ({
        url: "/agencies",
        method: "GET",
        params: {
          ...(limit ? { limit } : {}),
          ...(status ? { status } : {}),
        },
        requiresAuth: true,
      }),
      providesTags: ["Agencies"],
    }),
    saveDraft: builder.mutation<void, SaveAgencyDraftPayload>({
      query: (data) => ({
        url: `/agencyManagement/saved/agencies`,
        method: "POST",
        data,
        requiresAuth: true
      }),
    }),
    getDraftAgencies: builder.query<
      ListDraftAgenciesResponse,
      void
    >({
      query: () => ({
        url: `/agencyManagement/saved/agencies`,
        method: "GET",
        requiresAuth: true
      }),
    }),
    deleteDraftAgency: builder.mutation<
      { success: boolean, message: string },
      string
    >({
      query: (draftId) => ({
        url: `/agencyManagement/saved/agencies/${draftId}`,
        method: "DELETE",
        requiresAuth: true
      }),
    }),
    getDraftAgency: builder.query<
      GetDraftAgencyResponse,
      string
    >({
      query: (agencyId) => ({
        url: `/agencyManagement/saved/agencies/${agencyId}`,
        method: "GET",
        requiresAuth: true
      }),
    }),
    getAgency: builder.query<
      GetDraftAgencyResponse,
      string
    >({
      query: (agencyId) => ({
        url: `/agencyManagement/agencies/${agencyId}`,
        method: "GET",
        requiresAuth: true
      }),
    }),
    getSummaryAgencyInfo: builder.query<
      GetSummaryAgencyInfoResponse,
      string
    >({
      query: (agencyId) => ({
        url: `/agencyManagement/agencies/${agencyId}/summary`,
        method: "GET",
        requiresAuth: true
      }),
    }),
    updateAgency: builder.mutation<
      void,
      { agencyId: string, data: CreateAgencyWithUserPayload }
    >({
      query: ({agencyId, data}) => ({
        url: `/agencyManagement/agencies/${agencyId}`,
        method: "PATCH",
        data,
        requiresAuth: true
      }),
    }),
    updateAgencyStatus: builder.mutation<
      { success: boolean, message: string },
      { agencyId: string, data: { status: "active" | "inactive" } }
    >({
      query: ({agencyId, data}) => ({
        url: `/agencyManagement/agencies/${agencyId}/status/update`,
        method: "PATCH",
        data,
        requiresAuth: true
      }),
    }),
    getServices: builder.query<
      { services: { code: string; name: string; program?: string }[] },
      string
    >({
      query: (query) => ({
        url: `/services` + (query ? `?${query}` : ""),
        method: "GET",
        requiresAuth: true
      })
    }),
    getSingleAgencyUsers: builder.query<
      GetSingleAgencyUsersItem[],
      string
    >({
      query: (agencyId) => ({
        url: `/agencyManagement/agencies/${agencyId}/users`,
        method: "GET",
        requiresAuth: true
      })
    }),
    getSingleAgencyClients: builder.query<
      GetSingleAgencyUsersItem[],
      string
    >({
      query: (agencyId) => ({
        url: `/agencyManagement/agencies/${agencyId}/clients`,
        method: "GET",
        requiresAuth: true
      })
    }),
  }),
});

export const {
  useCreateAgencyWithUserMutation,
  useUploadAgencyFileMutation,
  useListAllAgenciesQuery,
  useSaveDraftMutation,
  useGetDraftAgenciesQuery,
  useDeleteDraftAgencyMutation,
  useLazyGetDraftAgencyQuery,
  useLazyGetAgencyQuery,
  useGetSummaryAgencyInfoQuery,
  useUpdateAgencyMutation,
  useUpdateAgencyStatusMutation,
  useGetServicesQuery,
  useGetSingleAgencyUsersQuery,
  useGetSingleAgencyClientsQuery
} = superAdminApi;
