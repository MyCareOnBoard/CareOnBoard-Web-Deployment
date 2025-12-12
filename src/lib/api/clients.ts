/**
 * Clients and Services API Service
 * Handles all API calls related to clients assigned to the user
 */

import axiosClient from '../axios';

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
  dateOfBirth?: string;
  profileImage?: string;

  // Address information
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
  nursingLevel?: string;

  // Service information
  service?: string;
  serviceCode?: string;
  billingRate?: string;
  services?: ClientService[];

  // Plan of care
  planOfCare?: {
    id: string;
    name: string;
    url?: string;
    uploadedAt?: string;
  };
  ispOutcome?: string;

  // Add Client wizard sections (Stage 2–7)
  guardianInfo?: ClientGuardianInfo;
  healthcareSafety?: ClientHealthcareSafety;
  documents?: ClientDocument[];
  evvVisitConfig?: ClientEvvVisitConfig;
  staffAssignment?: ClientStaffAssignmentAndRestrictions;
  goalsAndEmergency?: ClientGoalsAndEmergency;
  systemAiAndAudit?: ClientSystemAiAndAudit;

  // Agency relationship
  agencyId?: string;

  // Status and dates
  status?: 'active' | 'inactive' | 'pending' | 'archived';
  createdAt?: string;
  updatedAt?: string;
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
  rate?: string;
  ispEffectiveDate?: string;
  startAuthDate?: string;
  endAuthDate?: string;
  pcptDate?: string;
  sdrDate?: string;
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
  medicalConditions?: string;
  allergies?: string;
  dietaryRestrictions?: string;
  seizurePlan?: string;
  mobilitySupportNeeds?: string;
  behaviorSupportPlan?: string;
  communicationNeeds?: string;
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
  /**
   * Storage URL (when uploaded). If the frontend is still holding a File, it should not be sent as JSON.
   */
  url?: string;
  uploadDate?: string;
  expiryDate?: string;
  autoReminder?: boolean;
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

export interface ClientStaffAssignmentAndRestrictions {
  primaryDspAssigned?: string;
  primaryDspId?: string;
  secondaryDsps?: string;
  secondaryDspId?: string;
  genderPreference?: string;
  requiredCertifications?: string;
  specialConditions?: string;
  prefersFamiliar?: ClientYesNo;
  noMaleFemaleStaff?: ClientYesNo;
  medicalRestrictionsTrained?: ClientYesNo;
  autoChecks?: Record<ClientAutoCheckKey, boolean>;
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

/**
 * List Clients Response (new format)
 */
export interface ListClientsResponse {
  success: boolean;
  clients: Client[];
  total: number;
  count: number;
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
}

/**
 * Create Client Request
 */
export interface CreateClientRequest {
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
  nursingLevel?: string;
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

  medicalConditions?: string;
  allergies?: string;
  dietaryRestrictions?: string;
  seizurePlan?: string;
  mobilitySupportNeeds?: string;
  behaviorSupportPlan?: string;
  communicationNeeds?: string;
  emergencyProtocols?: string;

  evvRequirement?: ClientYesNo;
  primaryVisitLocationGps?: ClientYesNo;
  allowedSecondaryLocations?: ClientYesNo;
  minShiftLength?: string;
  maxShiftLength?: string;
  backToBackAllowed?: ClientYesNo;
  travelTimeAllowed?: ClientYesNo;

  primaryDspAssigned?: string;
  primaryDspId?: string;
  secondaryDsps?: string;
  secondaryDspId?: string;
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
  staffAssignment?: ClientStaffAssignmentAndRestrictions;
  goalsAndEmergency?: ClientGoalsAndEmergency;
  systemAiAndAudit?: ClientSystemAiAndAudit;
  agencyId?: string; // Required for employees, defaults to own agencyId for agencies
}

/**
 * Update Client Request
 */
export interface UpdateClientRequest {
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
  nursingLevel?: string;
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
  medicalConditions?: string | null;
  allergies?: string | null;
  dietaryRestrictions?: string | null;
  seizurePlan?: string | null;
  mobilitySupportNeeds?: string | null;
  behaviorSupportPlan?: string | null;
  communicationNeeds?: string | null;
  emergencyProtocols?: string | null;
  evvRequirement?: ClientYesNo | null;
  primaryVisitLocationGps?: ClientYesNo | null;
  allowedSecondaryLocations?: ClientYesNo | null;
  minShiftLength?: string | null;
  maxShiftLength?: string | null;
  backToBackAllowed?: ClientYesNo | null;
  travelTimeAllowed?: ClientYesNo | null;
  primaryDspAssigned?: string | null;
  primaryDspId?: string | null;
  secondaryDsps?: string | null;
  secondaryDspId?: string | null;
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
  staffAssignment?: ClientStaffAssignmentAndRestrictions | null;
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
 * ✅ Create a new client
 * Endpoint: POST /clients
 * Agencies default to their own agencyId
 * Employees must supply agencyId
 */
export async function createClient(data: CreateClientRequest): Promise<Client> {
  try {
    const response = await axiosClient.post<{ success: boolean; data: Client }>('/clients', data);

    if (!response.data.success) {
      throw new Error('Failed to create client');
    }

    return response.data.data;
  } catch (err: any) {
    console.error('createClient error:', err);
    throw new Error(err.message || 'Failed to create client');
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
 * ✅ Seed clients with dummy data
 * Endpoint: POST /clients/seed
 * Automatically uses all existing agencies from database
 * Distributes clients randomly across agencies
 */
export async function seedClients(data: SeedClientsRequest): Promise<{ success: boolean; message: string; count: number }> {
  try {
    const response = await axiosClient.post<{ success: boolean; message: string; count: number }>('/clients/seed', data);

    if (!response.data.success) {
      throw new Error('Failed to seed clients');
    }

    return response.data;
  } catch (err: any) {
    console.error('seedClients error:', err);
    throw new Error(err.message || 'Failed to seed clients');
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
