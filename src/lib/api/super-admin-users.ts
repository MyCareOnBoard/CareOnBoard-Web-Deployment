import axios from "axios";
import axiosClient from '../axios';
import type {
  AgencyScopeMode,
  AssignableAgenciesPage,
  RoleTemplateKey,
  SuperAdminAccessConfig,
} from "@/utils/auth/types/user.types";

export type {
  AgencyScopeMode,
  AssignableAgenciesPage,
  RoleTemplateKey,
  SuperAdminAccessConfig,
} from "@/utils/auth/types/user.types";

/**
 * Available Access Scopes for Super Admins
 */
export enum AccessScope {
  AGENCY_DIRECTORY = "Agency Directory",
  USER_ACCESS_CONTROL = "User Access Control",
  COMPLIANCE_MONITOR = "Compliance Monitor",
  GLOBAL_NOTES_QUALITY = "Global Notes Quality",
  AGENCY_BILLING_MONITOR = "Agency Billing Monitor",
  CORPORATE_SUPPORT = "Corporate Support",
  OVERSIGHT_CENTER = "Oversight Center",
  CLIENTS_DIRECTORY = "Clients Directory",
  STAFF_DIRECTORY = "Staff Directory",
  SHIFT_MAINTENANCE = "Shift Maintenance",
  REPORTS = "Reports",
  SERVICES = "Services",
  SYSTEM_SETTINGS = "System Settings",
}

/**
 * Super Admin User Interface
 */
export interface SuperAdminUser {
  id: string;
  uid: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  roleTemplate: RoleTemplateKey;
  accessList: string[];
  agencyScope: AgencyScopeMode;
  agencyIds: string[];
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  createdBy?: string;
}

/**
 * Create Super Admin Request
 */
export interface CreateSuperAdminRequest {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role?: string;
  roleTemplate?: RoleTemplateKey;
  accessList: string[];
  agencyScope?: AgencyScopeMode;
  agencyIds?: string[];
}

/**
 * Update Super Admin Request
 */
export interface UpdateSuperAdminRequest {
  name?: string;
  phone?: string;
  password?: string;
  role?: string;
  roleTemplate?: RoleTemplateKey;
  accessList?: string[];
  agencyScope?: AgencyScopeMode;
  agencyIds?: string[];
}

/**
 * List Super Admin Users Query Parameters
 */
export interface ListAssignableAgenciesParams {
  search?: string;
  cursor?: string;
  limit?: number;
  ids?: string[];
  signal?: AbortSignal;
}

export interface ListSuperAdminUsersParams {
  cursor?: string;
  limit?: number;
  search?: string;
  isActive?: boolean;
}

/**
 * List Super Admin Users Response
 */
export interface ListSuperAdminUsersResponse {
  success: boolean;
  data: SuperAdminUser[];
  pagination: {
    limit: number;
    total: null;
    totalPages: null;
    hasMore: boolean;
    nextCursor: string | null;
    scanned: number;
  };
}

/**
 * Super Admin User Response (single user)
 */
export interface SuperAdminUserResponse {
  success: boolean;
  user?: SuperAdminUser;
  data?: SuperAdminUser;
  message?: string;
}

interface SuperAdminAccessConfigResponse {
  success: boolean;
  data?: SuperAdminAccessConfig;
  message?: string;
}

interface AssignableAgenciesResponse {
  success: boolean;
  data?: AssignableAgenciesPage["agencies"];
  cursor?: string | null;
  message?: string;
}

export async function getSuperAdminAccessConfig(): Promise<SuperAdminAccessConfig> {
  try {
    const response = await axiosClient.get<SuperAdminAccessConfigResponse>(
      "/superAdminUsers/config"
    );

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || "Failed to fetch super admin access config");
    }

    return response.data.data;
  } catch (err: any) {
    console.error("getSuperAdminAccessConfig error:", err);
    throw new Error(
      err.response?.data?.error || err.message || "Failed to fetch super admin access config"
    );
  }
}

function isRequestCancellation(error: unknown): boolean {
  if (axios.isCancel(error)) return true
  if (!error || typeof error !== "object") return false

  const candidate = error as { code?: string; name?: string }
  return candidate.code === "ERR_CANCELED"
    || candidate.name === "CanceledError"
    || candidate.name === "AbortError"
}
export async function listAssignableAgencies(
  params: ListAssignableAgenciesParams = {}
): Promise<AssignableAgenciesPage> {
  try {
    const response = await axiosClient.get<AssignableAgenciesResponse>(
      "/superAdminUsers/assignable-agencies",
      {
        params: {
          search: params.search,
          cursor: params.cursor,
          limit: params.limit || 50,
          ids: params.ids?.join(","),
        },
        signal: params.signal,
      }
    );

    if (!response.data.success || !Array.isArray(response.data.data)) {
      throw new Error(response.data.message || "Failed to fetch assignable agencies");
    }

    return {
      agencies: response.data.data,
      nextCursor: response.data.cursor || null,
    };
  } catch (err: any) {
    if (isRequestCancellation(err)) throw err
    console.error("listAssignableAgencies error:", err);
    throw new Error(
      err.response?.data?.error || err.message || "Failed to fetch assignable agencies"
    );
  }
}
function normalizeLegacyScopeFields<T extends {
  role?: string;
  roleTemplate?: RoleTemplateKey;
  agencyScope?: AgencyScopeMode;
  agencyIds?: string[];
}>(data: T): T & Required<Pick<CreateSuperAdminRequest,
  "role" | "roleTemplate" | "agencyScope" | "agencyIds"
>> {
  return {
    ...data,
    role: data.role || "Super Admin",
    roleTemplate: data.roleTemplate || "custom",
    agencyScope: data.agencyScope || "all",
    agencyIds: data.agencyIds || [],
  };
}
/**
 * Create a new super admin user
 * @param data - Super admin user data
 * @returns Promise with created super admin user
 */
export async function createSuperAdminUser(
  data: CreateSuperAdminRequest
): Promise<SuperAdminUser> {
  try {
    const response = await axiosClient.post<SuperAdminUserResponse>(
      "/superAdminUsers/users",
      normalizeLegacyScopeFields(data)
    );

    if (!response.data.success || !response.data.user) {
      throw new Error(response.data.message || "Failed to create super admin user");
    }

    return response.data.user;
  } catch (err: any) {
    console.error("createSuperAdminUser error:", err);
    throw new Error(
      err.response?.data?.error || err.message || "Failed to create super admin user"
    );
  }
}

/**
 * Get all super admin users with optional filtering
 * @param params - Query parameters for filtering and pagination
 * @returns Promise with paginated list of super admin users
 */
export async function listSuperAdminUsers(
  params?: ListSuperAdminUsersParams
): Promise<ListSuperAdminUsersResponse> {
  try {
    const response = await axiosClient.get<ListSuperAdminUsersResponse>(
      "/superAdminUsers/users",
      {
        params: {
          cursor: params?.cursor,
          limit: params?.limit || 10,
          search: params?.search || "",
          isActive: params?.isActive,
        },
      }
    );

    if (!response.data.success) {
      throw new Error("Failed to fetch super admin users");
    }

    return response.data;
  } catch (err: any) {
    console.error("listSuperAdminUsers error:", err);
    throw new Error(
      err.response?.data?.error || err.message || "Failed to list super admin users"
    );
  }
}

/**
 * Get a single super admin user by ID
 * @param id - Super admin user document ID
 * @returns Promise with super admin user data
 */
export async function getSuperAdminUser(id: string): Promise<SuperAdminUser> {
  try {
    const response = await axiosClient.get<SuperAdminUserResponse>(
      `/superAdminUsers/users/${id}`
    );

    if (!response.data.success || !response.data.data) {
      throw new Error("Super admin user not found");
    }

    return response.data.data;
  } catch (err: any) {
    console.error("getSuperAdminUser error:", err);
    if (err.response?.status === 404) {
      throw new Error("Super admin user not found");
    }
    throw new Error(
      err.response?.data?.error || err.message || "Failed to get super admin user"
    );
  }
}

/**
 * Update a super admin user
 * @param id - Super admin user document ID
 * @param data - Updated super admin data
 * @returns Promise with updated super admin user
 */
export async function updateSuperAdminUser(
  id: string,
  data: UpdateSuperAdminRequest
): Promise<SuperAdminUser> {
  try {
    const response = await axiosClient.patch<SuperAdminUserResponse>(
      `/superAdminUsers/users/${id}`,
      normalizeLegacyScopeFields(data)
    );

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || "Failed to update super admin user");
    }

    return response.data.data;
  } catch (err: any) {
    console.error("updateSuperAdminUser error:", err);
    throw new Error(
      err.response?.data?.error || err.message || "Failed to update super admin user"
    );
  }
}

/**
 * Permanently delete a super admin user (hard delete from Firebase Auth and Firestore)
 * WARNING: This action cannot be undone!
 * @param id - Super admin user document ID
 * @returns Promise with success message
 */
export async function removeSuperAdminUser(id: string): Promise<void> {
  try {
    const response = await axiosClient.delete<{ success: boolean; message: string }>(
      `/superAdminUsers/users/${id}`
    );

    if (!response.data.success) {
      throw new Error(response.data.message || "Failed to delete super admin user");
    }
  } catch (err: any) {
    console.error("removeSuperAdminUser error:", err);
    throw new Error(
      err.response?.data?.error || err.message || "Failed to delete super admin user"
    );
  }
}

/**
 * [DEPRECATED] Restore functionality is no longer available with hard delete
 * @deprecated Hard delete is permanent and cannot be restored
 */
// export async function restoreSuperAdminUser(id: string): Promise<void> {
//   throw new Error("Restore functionality is not available. Deleted users are permanently removed.");
// }

/**
 * Get all available access scopes
 * @returns Array of access scope values
 */
export function getAccessScopes(): string[] {
  return Object.values(AccessScope);
}
