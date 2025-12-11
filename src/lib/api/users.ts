
import axiosClient from '../axios';
import { User } from '@/utils/auth/types/user.types';
import { UserType } from '@/utils/auth/types/user.types';
import { seedAgency } from './agencies';

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
  agencyId?: string;         // Filter by agency ID (for employees under an agency)
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

/**
 * Get the authenticated user's data
 * Used during onboarding to check if data exists
 * @returns Promise with user data data
 */
export async function getUser(): Promise<User> {
  try {
    const response = await axiosClient.get<UserResponse>("/users/profile");

    if (!response.data.success || !response.data.user) {
      throw new Error("Invalid response format from server");
    }

    let user = response.data.user as any;

    // Handle backend response - extract nested profile data if present
    if (user.profile && typeof user.profile === 'object') {
      const profileData = user.profile;
      
      // Extract critical fields to top level for easy access
      if (profileData.agencyId && !user.agencyId) {
        user.agencyId = profileData.agencyId;
      }
      if (profileData.id && !user.id) {
        user.id = profileData.id;
      }
      
      // Keep profile as a clean sub-object (not the entire agency)
      user.profile = {
        email: profileData.email,
        fullName: profileData.fullName,
        name: profileData.name,
        phoneNumber: profileData.phoneNumber || profileData.phone,
        address: profileData.address,
        city: profileData.city,
        state: profileData.state,
        zipCode: profileData.zipCode,
        gender: profileData.gender,
        dateOfBirth: profileData.dateOfBirth,
        profilePicture: profileData.profilePicture,
        professionalSummary: profileData.professionalSummary,
        agencyId: profileData.agencyId
      };
    }

    // Load agency data for agency users if needed
    if (user.userType === UserType.AGENCY && !user.agencyId) {
      try {
        const agency = await seedAgency();
        // Set agencyId at top level (single source of truth)
        user.agencyId = agency.id;
        // Store only agency name in profile for display
        user.profile = {
          ...user.profile,
          agencyId: agency.id,
          name: agency.name,
          email: agency.email,
          phoneNumber: agency.phone,
          address: agency.address,
          city: agency.city,
          state: agency.state,
          zipCode: agency.zipCode
        };
      } catch (error: any) {
        console.error('Failed to seed agency:', error);
      }
    }

    return user as User;
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
