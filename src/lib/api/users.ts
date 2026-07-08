
import axiosClient from '../axios';
import { User } from '@/utils/auth/types/user.types';
import { Employee } from '@/utils/auth/types/user.types';
import { UserType } from '@/utils/auth/types/user.types';
import { resolveEmailVerified } from '@/utils/auth/helpers/resolveEmailVerified';

/**
 * API Response wrapper for user data
 */
export interface UserResponse {
  success: boolean
  user: User
}

/**
 * List Users Query Parameters
 */
export interface ListUsersParams {
  userType?: UserType;       // Filter by user type (applicant, employee, agency)
  agencyId?: string;
  status?: string;
  role?: string;
  workAvailability?: boolean;  // Filter by work availability (for employees)
  search?: string;          // Search by name or email
  page?: number;             // Page number for pagination (default: 1)
  limit?: number;            // Number of items per page (default: 50, max: 100)
  sortBy?: 'fullName' | 'email' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

/**
 * List Users API Response
 */
export interface ListUsersResponse {
  success: boolean;
  count: number;
  total: number;
  page: number;
  totalPages: number;
  users: User[];
}

export interface ListEmployeesResponse {
  success: boolean;
  count: number;
  total: number;
  page: number;
  totalPages: number;
  employees: Employee[];
}

/**
 * Get the authenticated user's data
 * Used during onboarding to check if data exists
 * @returns Promise with user data
 */
export async function getUser(): Promise<User> {
  try {
    const response = await axiosClient.get<UserResponse>("/users/profile");

    if (!response.data.success || !response.data.user) {
      throw new Error("Invalid response format from server");
    }

    const backendUser = response.data.user as any;

    // Build clean User object with profile data in the correct location
    const user: User = {
      // Core user fields only
      id: backendUser.id || backendUser.uid,
      uid: backendUser.uid,
      email: backendUser.email,
      fullName: backendUser.fullName,
      emailVerified: resolveEmailVerified(),
      userType: backendUser.userType,
      applicantType: backendUser.applicantType,
      otpVerified: backendUser.otpVerified,
      otpVerifiedAt: backendUser.otpVerifiedAt,
      onboardingCompleted: backendUser.onboardingCompleted,
      createdAt: backendUser.createdAt,
      updatedAt: backendUser.updatedAt,
      agencyId: backendUser.agencyId,

      // Profile data goes ONLY in profile sub-object
      profile: {},

      // Agency data goes ONLY in agency sub-object
      agency: {},
    };

    // Extract profile data from backend response
    const profileSource = backendUser.profile || backendUser;

    // Build profile sub-object from available data
    user.profile = {
      id: profileSource.id,
      email: profileSource.email || backendUser.email,
      fullName: profileSource.fullName || backendUser.fullName,
      name: profileSource.name || backendUser.displayName,
      phoneNumber: profileSource.phoneNumber || profileSource.phone,
      address: profileSource.address,
      city: profileSource.city,
      state: profileSource.state,
      zipCode: profileSource.zipCode,
      gender: profileSource.gender,
      dateOfBirth: profileSource.dateOfBirth,
      profilePicture: profileSource.profilePicture || profileSource.photo || profileSource.photoURL,
      professionalSummary: profileSource.professionalSummary || profileSource.summary,
      workAvailability: profileSource.workAvailability,
      tagId: profileSource.tagId,
      supportedClientTypes: profileSource?.supportedClientTypes || [],
    };

    // Add agency details if user is an employee
    if ([UserType.EMPLOYEE, UserType.APPLICANT].includes(user.userType)) {
      user.agency = {
        id: backendUser.agencyId,
        name: backendUser.agency?.name,
        email: backendUser.agency?.email,
        phone: backendUser.agency?.phone,
        address: backendUser.agency?.address,
        city: backendUser.agency?.city,
        state: backendUser.agency?.state,
        supportedClientTypes: backendUser.agency?.supportedClientTypes,
      };
    }

    // Agency owners/staff: surface the agency's supported client types so the
    // staff-management labels (DSP / Caregiver) can be derived from the auth
    // user without an extra fetch. For an agency owner the agency document is
    // the profile; for agency staff it is the embedded `agency`.
    if ([UserType.AGENCY, UserType.AGENCY_STAFF].includes(user.userType)) {
      const agencyDoc =
        user.userType === UserType.AGENCY ? profileSource : backendUser.agency;
      user.agency = {
        ...user.agency,
        id: backendUser.agencyId || agencyDoc?.id,
        name: agencyDoc?.name || user.agency?.name,
        supportedClientTypes: agencyDoc?.supportedClientTypes,
      };
    }

    if ([UserType.SUPER_ADMIN, UserType.AGENCY_STAFF].includes(user.userType)) {
      user.profile = {
        ...user.profile,
        accessList: profileSource.accessList,
        // Agency staff HR fields — used to prefill the staff timesheet (role) and
        // shown read-only. Pay rate stays server-authoritative for actual payroll.
        role: profileSource.role,
        employmentType: profileSource.employmentType,
        billingType: profileSource.billingType,
        billingRate: profileSource.billingRate,
      } as User['profile'];
    }

    return user;
  } catch (err: any) {
    // Re-throw with more context
    if (err.response?.status === 404) {
      throw new Error("Profile not found. Please complete your onboarding first.");
    }
    console.error('Failed to get user profile:', err);
    throw err;
  }
}

/**
 * ✅ Update the authenticated user's data
 * Endpoint: PUT /users/profile
 */
export async function updateUser(userData: Partial<User>): Promise<User> {
  try {
    const response = await axiosClient.put<UserResponse>("/users/profile", userData);

    if (!response.data.success || !response.data.user) {
      throw new Error("Invalid response format from server");
    }

    return response.data.user;
  } catch (err: any) {
    console.error("updateUser error:", err);
    throw new Error(err.message || "Failed to update user data");
  }
}

/**
 * ✅ Upload user profile photo
 * Endpoint: POST /users/upload-photo
 * Accepts multipart/form-data (handled separately in the component)
 */
export async function uploadUserPhoto(file: File): Promise<{ url: string }> {
  try {
    const formData = new FormData();
    formData.append("photo", file);

    const response = await axiosClient.post<{ url: string }>("/users/upload-photo", formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (!response.data || !response.data.url) {
      throw new Error("Upload failed: no file URL returned");
    }

    return response.data;
  } catch (err: any) {
    console.error("uploadUserPhoto error:", err);
    throw new Error(err.message || "Failed to upload photo");
  }
}

/**
 * ✅ List users with optional filtering
 * Endpoint: GET /users
 * @param params - Query parameters for filtering and pagination
 * @returns Promise with paginated list of users
 */
export async function listUsers(params?: ListUsersParams): Promise<ListUsersResponse> {
  try {
    const response = await axiosClient.get<ListUsersResponse>("/users", {
      params: {
        userType: params?.userType,
        agencyId: params?.agencyId,
        page: params?.page || 1,
        limit: params?.limit || 50,
        sortBy: params?.sortBy,
        sortOrder: params?.sortOrder,
      },
    });

    if (!response.data.success) {
      throw new Error("Failed to fetch users");
    }

    return response.data;
  } catch (err: any) {
    console.error("listUsers error:", err);
    throw new Error(err.message || "Failed to list users");
  }
}

/**
 * ✅ Search users by name or email
 * Endpoint: GET /users/search
 * @param query - Search query string
 * @returns Promise with matching users
 */
export async function searchUsers(query: string): Promise<User[]> {
  try {
    const response = await axiosClient.get<{ data: User[] }>('/users/search', {
      params: { q: query }
    });
    return response.data.data;
  } catch (error) {
    console.error('Failed to search users:', error);
    throw error;
  }
}

/**
 * ✅ Get a user by ID
 * Endpoint: GET /users/:id
 * @param userId - The user ID
 * @returns Promise with user data
 */
export async function getUserById(userId: string): Promise<User> {
  try {
    const response = await axiosClient.get<UserResponse>(`/users/${userId}`);

    if (!response.data.success || !response.data.user) {
      throw new Error("User not found");
    }

    return response.data.user;
  } catch (err: any) {
    if (err.response?.status === 404) {
      throw new Error("User not found");
    }
    console.error("getUserById error:", err);
    throw new Error(err.message || "Failed to get user");
  }
}

/**
 * ✅ List all employees with optional filtering
 * Endpoint: GET /users
 * @param params - Query parameters for filtering and pagination
 * @returns Promise with paginated list of users
 */
export async function listEmployees(params?: ListUsersParams): Promise<ListEmployeesResponse> {
  try {
    const response = await axiosClient.get<ListEmployeesResponse>("/employees", {
      params: {
        agencyId: params?.agencyId,
        status: params?.status,
        role: params?.role,
        workAvailability: params?.workAvailability,
        search: params?.search,
        page: params?.page || 1,
        limit: params?.limit || 50,
        sortBy: params?.sortBy,
        sortOrder: params?.sortOrder,
      },
    });

    if (!response.data.success) {
      throw new Error("Failed to fetch users");
    }

    return response.data;
  } catch (err: any) {
    console.error("listUsers error:", err);
    throw new Error(err.message || "Failed to list users");
  }
}


/**
 * ✅ Get employees/DSPs under an agency
 * Endpoint: GET /users/employees
 * @param agencyId - The agency ID
 * @param search - Optional search query
 * @returns Promise with list of employees
 */
export async function getAgencyEmployees(
  agencyId: string,
  search?: string
): Promise<User[]> {
  try {
    const response = await axiosClient.get<{ success: boolean; users: User[] }>("/users/employees", {
      params: {
        agencyId,
        search,
      },
    });

    if (!response.data.success) {
      throw new Error("Failed to fetch employees");
    }

    return response.data.users;
  } catch (err: any) {
    console.error("getAgencyEmployees error:", err);
    throw new Error(err.message || "Failed to fetch employees");
  }
}
