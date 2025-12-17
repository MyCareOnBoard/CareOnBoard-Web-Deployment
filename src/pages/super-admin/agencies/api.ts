import { createApi } from "@reduxjs/toolkit/query/react";
import { customBaseQuery } from "@/lib/baseQuery";
import { Agency } from "@/lib/api/agencies";
import { ListAgenciesResponse } from "@/lib/api/agencies";

export interface CreateAgencyWithUserPayload {
  agency: {
    // Step 1: Agency Identity Information
    name: string;
    legalBusinessName?: string;
    dba?: string;
    agencyType?: string;
    ein?: string;
    npi?: string;
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
    // Step 4: Service Configuration
    services?: string[];
    serviceCodeMapping?: Record<string, any>;
    evvSettings?: Record<string, any>;
    // Step 5: Operational Settings
    schedulingRules?: string;
    maxShiftPerDay?: number;
    travelTimeRules?: string;
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
    // Legacy fields
    description?: string;
    taxId?: string;
    licenseNumber?: string;
  };
  user: {
    fullName: string;
    email: string;
    password: string;
    phone?: string;
    userType: string;
  };
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
  endpoints: (builder) => ({
    createAgencyWithUser: builder.mutation<CreateAgencyWithUserResponse, CreateAgencyWithUserPayload>({
      query: (data) => ({
        url: `/superAdmin/agencies`,
        method: "POST",
        data,
        requiresAuth: true
      }),
      invalidatesTags: ['Agencies']
    }),
    uploadAgencyFile: builder.mutation<UploadFileResponse, { file: File; fileType: 'logo' | 'letterhead'; agencyId?: string }>({
      query: ({ file, fileType, agencyId }) => {
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
            ...(agencyId && { 'x-agency-id': agencyId }),
          },
        };
      },
    }),
    listAllAgencies: builder.query<ListAgenciesResponse, { limit?: number }>({
      query: ({ limit = 100 }) => ({
        url: `/agencies?limit=${limit}`,
        method: "GET",
        requiresAuth: true
      }),
      providesTags: ['Agencies']
    })
  }),
});

export const {
  useCreateAgencyWithUserMutation,
  useUploadAgencyFileMutation,
  useListAllAgenciesQuery,
} = superAdminApi;
