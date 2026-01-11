import axiosClient from '../axios';

/**
 * Available Access Scopes for Super Admins
 */
export enum AccessScope {
  AGENCY_MANAGEMENT = "Agency Management",
  USER_ACCESS_CONTROL = "User Access Control",
  COMPLIANCE_MONITOR = "Compliance Monitor",
  GLOBAL_NOTES_QUALITY = "Global Notes Quality",
  AGENCY_BILLING_MONITOR = "Agency Billing Monitor",
  CORPORATE_SUPPORT = "Corporate Support",
  OVERSIGHT_CENTER = "Oversight Center",
  CLIENT_DIRECTORY = "Client Directory",
  STAFF_DIRECTORY = "Staff Directory",
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
  accessList: string[];
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
  accessList: string[];
}

/**
 * Update Super Admin Request
 */
export interface UpdateSuperAdminRequest {
  name?: string;
  phone?: string;
  password?: string;
  accessList?: string[];
}

/**
 * List Super Admin Users Query Parameters
 */
export interface ListSuperAdminUsersParams {
  page?: number;
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
    page: number;
    limit: number;
    total: number;
    totalPages: number;
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
      data
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
          page: params?.page || 1,
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
      data
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
