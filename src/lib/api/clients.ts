/**
 * Clients and Services API Service
 * Handles all API calls related to clients assigned to the user
 */

import axiosClient from '../axios';
import { ApiResponse } from '@/lib/api-types';
import { createApi } from "@reduxjs/toolkit/query/react";
import { customBaseQuery } from "@/lib/baseQuery";

/**
 * Client interface
 * Represents a client/consumer in the care system
 */
export interface Client {
  // Core identifiers
  id: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  gender?: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string | { _seconds?: number; _nanoseconds?: number } | Date;
  profileImage?: string;

  // DSP information
  primaryDsp?: ClientDsp;
  secondaryDsps?: ClientDsp[];

  // Address information
  location?: { lat: string; lon: string };
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  countyState?: string;
  primaryAddress?: Address;
  secondaryAddress?: Address;
  languagePreference?: string;
  communicationMethod?: string;
  medicaidId?: string;
  dddId?: string;
  ssn?: string;
  tier?: string;
  billingRate?: string;
  services?: ClientService[];
  ispOutcomes?: string;

  // Add Client wizard sections (Stage 2–7)
  guardianName?: string;
  guardianRelationship?: string;
  guardianEmail?: string;
  guardianPhone?: string;
  guardianAddress?: string;
  supportCoordinatorName?: string;
  supportCoordinatorAgency?: string;
  supportCoordinatorContact?: string;
  healthcareSafety?: ClientHealthcareSafety;
  documents?: ClientDocument[];
  // Flattened healthcare fields (when stored at top level)
  medicalConditions?: string[];
  allergies?: string[];
  dietaryRestrictions?: string[];
  seizurePlan?: string;
  mobilitySupportNeeds?: string[];
  behaviorSupportPlan?: string;
  communicationNeeds?: string[];
  emergencyProtocols?: string;
  evvVisitConfig?: ClientEvvVisitConfig;
  goalsAndEmergency?: ClientGoalsAndEmergency;
  systemAiAndAudit?: ClientSystemAiAndAudit;

  // Agency relationship
  agencyId?: string;
  agency?: Agency;

  // Status and dates
  status?: 'active' | 'inactive' | 'pending' | 'archived';
  createdAt?: string | { _seconds?: number; _nanoseconds?: number } | Date;
  updatedAt?: string | { _seconds?: number; _nanoseconds?: number } | Date;
}

/**
 * Add Client Wizard Models (Stage 1–7)
 * These mirror the fields collected in the Add Client flow.
 * NOTE: Backend support may be incremental; keep fields optional on requests.
 */
export interface ClientService {
  id: string;
  name: string;
  code: string;
  hours?: string;
  totalApprovedHours?: string;
  rate?: string;
  payType?: "hourly" | "15-min" | "daily";
  clientRate?: string;
  clientPayType?: "hourly" | "15-min" | "daily";
  ispEffectiveDate?: string;
  startAuthDate?: string;
  endAuthDate?: string;
  pcptDate?: string;
  sdrStartDate?: string;
  sdrEndDate?: string;
}

export interface ClientGuardianInfo {
  guardianName?: string;
  guardianRelationship?: string;
  guardianEmail?: string;
  guardianPhone?: string;
  guardianAddress?: string;
  supportCoordinatorName?: string;
  supportCoordinatorAgency?: string;
  supportCoordinatorContact?: string;
}

export interface ClientHealthcareSafety {
  medicalConditions?: string[];
  allergies?: string[];
  dietaryRestrictions?: string[];
  seizurePlan?: string;
  mobilitySupportNeeds?: string[];
  behaviorSupportPlan?: string;
  communicationNeeds?: string[];
  emergencyProtocols?: string;
}

export type ClientDocumentKey =
  | "isp"
  | "pcpt"
  | "poc"
  | "sdr"
  | "bsp"
  | "medicalDocs"
  | "consents";

export interface ClientDocument {
  key: ClientDocumentKey;
  title?: string;
  fileName?: string;
  url?: string;
  issuedOnDate?: string;
  expiryDate?: string;
  autoReminder?: boolean;
}

/**
 * Upload response for client document files
 */
export interface ClientDocumentUploadResult {
  fileName: string;
  fileSize: number;
  fileType: string;
  url: string;
  storagePath: string;
  uploadedAt: string;
}

export type ClientYesNo = "yes" | "no" | "";

export interface ClientEvvVisitConfig {
  evvRequirement?: ClientYesNo;
  primaryVisitLocationGps?: ClientYesNo;
  allowedSecondaryLocations?: ClientYesNo;
  minShiftLength?: string;
  maxShiftLength?: string;
  backToBackAllowed?: ClientYesNo;
  travelTimeAllowed?: ClientYesNo;
}

export type ClientAutoCheckKey = "compliance" | "training" | "background" | "expired";

/**
 * DSP (Direct Support Professional) interface
 * Represents a DSP assigned to a client
 */
export interface ClientDsp {
  id: string;
  name: string;
}

export interface ClientGoalsAndEmergency {
  // Goals
  clientGoals?: string;
  communityGoals?: string;
  dailyLivingGoals?: string;
  behavioralGoals?: string;
  skillBuildingGoals?: string;
  ispOutcomes?: string;
  targetBehaviors?: string;
  supportStrategies?: string;

  // Emergency
  emergencyName?: string;
  emergencyRelationship?: string;
  primaryPhone?: string;
  secondaryPhone?: string;
  hospitalPreference?: string;
  emergencyProtocol?: string;
  medicationList?: string;
}

export type ClientAuditCycle = "monthly" | "quarterly";

export interface ClientSystemAiAndAudit {
  aiNotesReview?: boolean;
  aiPlanOfCareBuilder?: boolean;
  aiGoalTracking?: boolean;
  expiringDocsReminder?: boolean;
  renewalsReminder?: boolean;
  auditCycle?: ClientAuditCycle;
  assignedQaStaff?: string;
  requiredVisitDocumentation?: string;
  notesReviewRules?: string;
  billingValidationRules?: string;
}

export interface Agency {
  id: string;
  name: string;
}

/**
 * List Clients Response (new format)
 */
export interface ListClientsResponse {
  success: boolean;
  agency?: Agency;
  clients: Client[];
  total: number;
  count: number;
}

/**
 * List Agency Clients Response (new format)
 */
export interface ListAgencyClientsResponse {
  success: boolean,
  count: number;
  agencyId: string;
  clients: Client[];
  pagination: {
    limit: number;
    offset: number;
    count: number;
  }
}

/**
 * Clients Response (legacy format for backward compatibility)
 */
export interface ClientsResponse {
  data: Client[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Client statistics
 */
export interface ClientStats {
  active: number;
  inactive: number;
  total: number;
}

/**
 * Client statistics API response
 */
export interface ClientStatsResponse {
  success: boolean;
  stats: ClientStats;
}

/**
 * List Clients Query Parameters
 */
export interface ListClientsParams {
  agencyId?: string; // Required for employees
  status?: 'active' | 'inactive' | 'pending' | 'archived';
  service?: string;
  search?: string;
  limit?: number;
  agency?: boolean;
}

export interface Address {
  address?: string;
  location?: { lat: string; lon: string };
  countyState?: string;
  zipCode?: string;
}

/**
 * Create Client Request
 */
export interface CreateClientRequest {
  agencyId?: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  gender?: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  location?: { lat: string; lon: string };
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  countyState?: string;
  primaryAddress?: Address;
  secondaryAddress?: Address;
  languagePreference?: string;
  communicationMethod?: string;
  medicaidId?: string;
  dddId?: string;
  ssn?: string;
  tier?: string;
  service?: string;
  serviceCode?: string;
  billingRate?: string;
  services?: ClientService[];

  /**
   * Flattened wizard fields (Stage 2–7)
   * (Preferred for create/update payloads; stored as top-level fields in Firestore)
   */
  guardianName?: string;
  guardianRelationship?: string;
  guardianEmail?: string;
  guardianPhone?: string;
  guardianAddress?: string;
  supportCoordinatorName?: string;
  supportCoordinatorAgency?: string;
  supportCoordinatorContact?: string;

  medicalConditions?: string[];
  allergies?: string[];
  dietaryRestrictions?: string[];
  seizurePlan?: string;
  mobilitySupportNeeds?: string[];
  behaviorSupportPlan?: string;
  communicationNeeds?: string[];
  emergencyProtocols?: string;

  evvRequirement?: ClientYesNo;
  primaryVisitLocationGps?: ClientYesNo;
  allowedSecondaryLocations?: ClientYesNo;
  minShiftLength?: string;
  maxShiftLength?: string;
  backToBackAllowed?: ClientYesNo;
  travelTimeAllowed?: ClientYesNo;

  primaryDsp?: ClientDsp;
  secondaryDsps?: ClientDsp[];
  genderPreference?: string;
  requiredCertifications?: string;
  specialConditions?: string;
  prefersFamiliar?: ClientYesNo;
  noMaleFemaleStaff?: ClientYesNo;
  medicalRestrictionsTrained?: ClientYesNo;
  autoChecks?: Record<ClientAutoCheckKey, boolean>;

  clientGoals?: string;
  communityGoals?: string;
  dailyLivingGoals?: string;
  behavioralGoals?: string;
  skillBuildingGoals?: string;
  ispOutcomes?: string;
  targetBehaviors?: string;
  supportStrategies?: string;

  emergencyName?: string;
  emergencyRelationship?: string;
  primaryPhone?: string;
  secondaryPhone?: string;
  hospitalPreference?: string;
  emergencyProtocol?: string;
  medicationList?: string;

  aiNotesReview?: boolean;
  aiPlanOfCareBuilder?: boolean;
  aiGoalTracking?: boolean;
  expiringDocsReminder?: boolean;
  renewalsReminder?: boolean;
  auditCycle?: ClientAuditCycle;
  assignedQaStaff?: string;
  requiredVisitDocumentation?: string;
  notesReviewRules?: string;
  billingValidationRules?: string;
  guardianInfo?: ClientGuardianInfo;
  healthcareSafety?: ClientHealthcareSafety;
  documents?: ClientDocument[];
  evvVisitConfig?: ClientEvvVisitConfig;

  goalsAndEmergency?: ClientGoalsAndEmergency;
  systemAiAndAudit?: ClientSystemAiAndAudit;
}

/**
 * Update Client Request
 */
export interface UpdateClientRequest {
  agencyId?: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  gender?: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  location?: { lat: string; lon: string };
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  countyState?: string;
  languagePreference?: string;
  communicationMethod?: string;
  medicaidId?: string;
  dddId?: string;
  ssn?: string;
  tier?: string;
  service?: string;
  serviceCode?: string;
  billingRate?: string;
  services?: ClientService[];
  guardianName?: string | null;
  guardianRelationship?: string | null;
  guardianEmail?: string | null;
  guardianPhone?: string | null;
  guardianAddress?: string | null;
  supportCoordinatorName?: string | null;
  supportCoordinatorAgency?: string | null;
  supportCoordinatorContact?: string | null;
  medicalConditions?: string[] | null;
  allergies?: string[] | null;
  dietaryRestrictions?: string[] | null;
  seizurePlan?: string | null;
  mobilitySupportNeeds?: string[] | null;
  behaviorSupportPlan?: string | null;
  communicationNeeds?: string[] | null;
  emergencyProtocols?: string | null;
  evvRequirement?: ClientYesNo | null;
  primaryVisitLocationGps?: ClientYesNo | null;
  allowedSecondaryLocations?: ClientYesNo | null;
  minShiftLength?: string | null;
  maxShiftLength?: string | null;
  backToBackAllowed?: ClientYesNo | null;
  travelTimeAllowed?: ClientYesNo | null;
  primaryDsp?: ClientDsp | null;
  secondaryDsps?: ClientDsp[] | null;
  genderPreference?: string | null;
  requiredCertifications?: string | null;
  specialConditions?: string | null;
  prefersFamiliar?: ClientYesNo | null;
  noMaleFemaleStaff?: ClientYesNo | null;
  medicalRestrictionsTrained?: ClientYesNo | null;
  autoChecks?: Record<ClientAutoCheckKey, boolean> | null;
  clientGoals?: string | null;
  communityGoals?: string | null;
  dailyLivingGoals?: string | null;
  behavioralGoals?: string | null;
  skillBuildingGoals?: string | null;
  ispOutcomes?: string | null;
  targetBehaviors?: string | null;
  supportStrategies?: string | null;
  emergencyName?: string | null;
  emergencyRelationship?: string | null;
  primaryPhone?: string | null;
  secondaryPhone?: string | null;
  hospitalPreference?: string | null;
  emergencyProtocol?: string | null;
  medicationList?: string | null;
  aiNotesReview?: boolean | null;
  aiPlanOfCareBuilder?: boolean | null;
  aiGoalTracking?: boolean | null;
  expiringDocsReminder?: boolean | null;
  renewalsReminder?: boolean | null;
  auditCycle?: ClientAuditCycle | null;
  assignedQaStaff?: string | null;
  requiredVisitDocumentation?: string | null;
  notesReviewRules?: string | null;
  billingValidationRules?: string | null;
  guardianInfo?: ClientGuardianInfo | null;
  healthcareSafety?: ClientHealthcareSafety | null;
  documents?: ClientDocument[] | null;
  evvVisitConfig?: ClientEvvVisitConfig | null;
  goalsAndEmergency?: ClientGoalsAndEmergency | null;
  systemAiAndAudit?: ClientSystemAiAndAudit | null;
  status?: 'active' | 'inactive' | 'pending' | 'archived';
}

/**
 * Seed Clients Request
 */
export interface SeedClientsRequest {
  activeCount?: number;
  inactiveCount?: number;
  pendingCount?: number;
  archivedCount?: number;
  overwrite?: boolean;
}

/**
 * ✅ Create a new agency client
 * Endpoint: POST /clientManagement
 * Agencies default to their own agencyId
 * Employees must supply agencyId
 */
export async function createClient(data: CreateClientRequest): Promise<Client> {
  try {
    const response = await axiosClient.post<ApiResponse<Client>>('/clients', data);
    return response.data.data;
  } catch (error) {
    console.error('Failed to create client for agency:', error);
    throw error;
  }
}

/**
 * ✅ List agency clients
 * Endpoint: GET /clientManagement
 * Query params: agencyId (required for employees), status, service, search, limit
 */
export async function listAgencyClients(params?: ListClientsParams): Promise<Client[]> {
  try {
    const response = await axiosClient.get<ListAgencyClientsResponse>('/clientManagement', {
      params: {
        agencyId: params?.agencyId,
        status: params?.status,
        service: params?.service,
        search: params?.search,
        limit: params?.limit,
      }
    });

    if (!response.data.success) {
      throw new Error('Failed to fetch clients');
    }

    return response.data.clients || [];
  } catch (error) {
    console.error('Failed to fetch clients:', error);
    throw error;
  }
}

/**
 * ✅ Upload a single client document file
 * Endpoint: POST /clients/uploads/:documentType?clientId={clientId}
 */
export async function uploadClientDocument(
  clientId: string,
  documentType: string,
  file: File,
): Promise<ClientDocumentUploadResult> {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const response = await axiosClient.post<ApiResponse<ClientDocumentUploadResult>>(
      `/clients/uploads/${encodeURIComponent(documentType)}`,
      formData,
      {
        params: { clientId },
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );

    if (!response.data.success) {
      throw new Error('Failed to upload client document');
    }

    return response.data.data;
  } catch (error) {
    console.error("Failed to upload client document:", error);
    throw error;
  }
}

/**
 * ✅ Get a single client by ID
 * Endpoint: GET /clientManagement/:clientId
 * Employees must supply agencyId via query parameter
 */
export async function getAgencyClientById(clientId: string): Promise<Client> {
  try {
    const response = await axiosClient.get<ApiResponse<Client>>(`/clientManagement/${clientId}`);
    return response.data.data;
  } catch (error) {
    console.error(`Failed to fetch client ${clientId}:`, error);
    throw error;
  }
}

/**
 * ✅ List clients
 * Endpoint: GET /clients
 * Query params: agencyId (required for employees), status, service, search, limit
 */
export async function listClients(params?: ListClientsParams): Promise<Client[]> {
  try {
    const response = await axiosClient.get<ListClientsResponse>('/clients', {
      params: {
        agencyId: params?.agencyId,
        status: params?.status,
        service: params?.service,
        search: params?.search,
        limit: params?.limit,
        agency: params?.agency,
      }
    });

    if (!response.data.success) {
      throw new Error('Failed to fetch clients');
    }

    return response.data.clients || [];
  } catch (error) {
    console.error('Failed to fetch clients:', error);
    throw error;
  }
}

/**
 * @deprecated Use listClients instead
 * Get all clients assigned to the current user
 * @param page - Page number for pagination (deprecated, use limit instead)
 * @param pageSize - Number of items per page (deprecated, use limit instead)
 * @returns Promise with clients list
 */
export async function getClients(page: number = 1, pageSize: number = 10): Promise<ClientsResponse> {
  try {
    const response = await axiosClient.get<ClientsResponse>('/clients', {
      params: { limit: pageSize }
    });

    // Transform response to match old format for backward compatibility
    return {
      data: response.data.data,
      total: response.data.total,
      page: page,
      pageSize: pageSize,
    };
  } catch (error) {
    console.error('Failed to fetch clients:', error);
    throw error;
  }
}

/**
 * ✅ Get a single client by ID
 * Endpoint: GET /clients/:clientId
 * Employees must supply agencyId via query parameter
 */
export async function getClientById(clientId: string, agencyId?: string): Promise<Client> {
  try {
    const response = await axiosClient.get<{ success: boolean; data: Client }>(`/clients/${clientId}`, {
      params: agencyId ? { agencyId } : undefined
    });

    if (!response.data.success) {
      throw new Error('Client not found');
    }

    return response.data.data;
  } catch (error) {
    console.error(`Failed to fetch client ${clientId}:`, error);
    throw error;
  }
}

/**
 * ✅ Update client information
 * Endpoint: PUT /clients/:clientId
 * agencyId cannot be changed
 * Employees must supply agencyId via query parameter
 */
export async function updateClient(clientId: string, data: UpdateClientRequest, agencyId?: string): Promise<Client> {
  try {
    const response = await axiosClient.put<{ success: boolean; data: Client }>(`/clients/${clientId}`, data, {
      params: agencyId ? { agencyId } : undefined
    });

    if (!response.data.success) {
      throw new Error('Failed to update client');
    }

    return response.data.data;
  } catch (err: any) {
    console.error('updateClient error:', err);
    throw new Error(err.message || 'Failed to update client');
  }
}

/**
 * ✅ Delete client
 * Endpoint: DELETE /clients/:clientId
 * Employees must supply agencyId via query parameter
 */
export async function deleteClient(clientId: string, agencyId?: string): Promise<{ success: boolean; message: string }> {
  try {
    const response = await axiosClient.delete<{ success: boolean; message: string }>(`/clients/${clientId}`, {
      params: agencyId ? { agencyId } : undefined
    });

    if (!response.data.success) {
      throw new Error('Failed to delete client');
    }

    return response.data;
  } catch (err: any) {
    console.error('deleteClient error:', err);
    throw new Error(err.message || 'Failed to delete client');
  }
}

/**
 * ✅ Search clients by name or other criteria
 * Endpoint: GET /clients/search
 * @param query - Search query string
 * @param agencyId - Optional agency ID filter
 * @returns Promise with matching clients
 */
export async function searchClients(query: string, agencyId?: string): Promise<Client[]> {
  try {
    const response = await axiosClient.get<{ success: boolean; clients: Client[] }>('/clients', {
      params: { search: query, agencyId }
    });

    if (!response.data.success) {
      throw new Error('Failed to search clients');
    }

    return response.data.clients || [];
  } catch (error) {
    console.error('Failed to search clients:', error);
    throw error;
  }
}

/**
 * ✅ Get client statistics for an agency
 * Endpoint: GET /clients/stats
 * Query params: agencyId (optional)
 */
export async function getClientStats(agencyId?: string): Promise<ClientStats> {
  try {
    const response = await axiosClient.get<ClientStatsResponse>('/clients/stats', {
      params: agencyId ? { agencyId } : undefined,
    });

    if (!response.data.success) {
      throw new Error('Failed to fetch client stats');
    }

    return response.data.stats;
  } catch (err: any) {
    console.error('getClientStats error:', err);
    throw new Error(err.message || 'Failed to fetch client stats');
  }
}

export const clientsApi = createApi({
  reducerPath: "clientsApi",
  baseQuery: customBaseQuery,
  tagTypes: ['Clients', 'ClientStats'],
  endpoints: (builder) => ({
    listClients: builder.query<
      ListClientsResponse,
      ListClientsParams | void
    >({
      query: (params = {}) => {
        const queryParams = new URLSearchParams();
        if (params?.agencyId) queryParams.append('agencyId', params.agencyId);
        if (params?.status) queryParams.append('status', params.status);
        if (params?.service) queryParams.append('service', params.service);
        if (params?.search) queryParams.append('search', params.search);
        if (params?.limit) queryParams.append('limit', params.limit.toString());
        if (params?.agency !== undefined) queryParams.append('agency', params.agency.toString());

        return {
          url: `/clients${queryParams.toString() ? `?${queryParams.toString()}` : ''}`,
          method: "GET",
          requiresAuth: true
        };
      },
      providesTags: ['Clients'],
    }),
    listAgencyClients: builder.query<
      ListAgencyClientsResponse,
      ListClientsParams | void
    >({
      query: (params = {}) => {
        const queryParams = new URLSearchParams();
        if (params?.agencyId) queryParams.append('agencyId', params.agencyId);
        if (params?.status) queryParams.append('status', params.status);
        if (params?.service) queryParams.append('service', params.service);
        if (params?.search) queryParams.append('search', params.search);
        if (params?.limit) queryParams.append('limit', params.limit.toString());

        return {
          url: `/clientManagement${queryParams.toString() ? `?${queryParams.toString()}` : ''}`,
          method: "GET",
          requiresAuth: true
        };
      },
      providesTags: ['Clients'],
    }),
    getClient: builder.query<
      { success: boolean; data: Client },
      { clientId: string; agencyId?: string }
    >({
      query: ({ clientId, agencyId }) => {
        const queryParams = new URLSearchParams();
        if (agencyId) queryParams.append('agencyId', agencyId);

        return {
          url: `/clients/${clientId}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`,
          method: "GET",
          requiresAuth: true
        };
      },
      providesTags: (result, error, { clientId }) => [{ type: 'Clients', id: clientId }],
    }),
    getAgencyClient: builder.query<
      { success: boolean; data: Client },
      string
    >({
      query: (clientId) => ({
        url: `/clientManagement/${clientId}`,
        method: "GET",
        requiresAuth: true
      }),
      providesTags: (result, error, clientId) => [{ type: 'Clients', id: clientId }],
    }),
    getClientStats: builder.query<
      ClientStatsResponse,
      string | void
    >({
      query: (agencyId) => {
        const queryParams = new URLSearchParams();
        if (agencyId) queryParams.append('agencyId', agencyId);

        return {
          url: `/clients/stats${queryParams.toString() ? `?${queryParams.toString()}` : ''}`,
          method: "GET",
          requiresAuth: true
        };
      },
      providesTags: ['ClientStats'],
    }),
    createClient: builder.mutation<
      { success: boolean; data: Client },
      CreateClientRequest
    >({
      query: (data) => ({
        url: `/clients`,
        method: "POST",
        data,
        requiresAuth: true
      }),
      invalidatesTags: ['Clients', 'ClientStats'],
    }),
    updateClient: builder.mutation<
      { success: boolean; data: Client },
      { clientId: string; data: UpdateClientRequest; agencyId?: string }
    >({
      query: ({ clientId, data, agencyId }) => {
        const queryParams = new URLSearchParams();
        if (agencyId) queryParams.append('agencyId', agencyId);

        return {
          url: `/clients/${clientId}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`,
          method: "PUT",
          data,
          requiresAuth: true
        };
      },
      invalidatesTags: (result, error, { clientId }) => [
        { type: 'Clients', id: clientId },
        'Clients',
        'ClientStats'
      ],
    }),
    deleteClient: builder.mutation<
      { success: boolean; message: string },
      { clientId: string; agencyId?: string }
    >({
      query: ({ clientId, agencyId }) => {
        const queryParams = new URLSearchParams();
        if (agencyId) queryParams.append('agencyId', agencyId);

        return {
          url: `/clients/${clientId}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`,
          method: "DELETE",
          requiresAuth: true
        };
      },
      invalidatesTags: ['Clients', 'ClientStats'],
    }),
  }),
});

export const {
  useListClientsQuery,
  useListAgencyClientsQuery,
  useGetClientQuery,
  useGetAgencyClientQuery,
  useGetClientStatsQuery,
  useCreateClientMutation,
  useUpdateClientMutation,
  useDeleteClientMutation,
} = clientsApi;
