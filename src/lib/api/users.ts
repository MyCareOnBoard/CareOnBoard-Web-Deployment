import axiosClient from '../axios';
import { Agency } from './agencies';

/**
 * Firebase Timestamp structure
 */
export interface FirebaseTimestamp {
  _seconds: number
  _nanoseconds: number
}

export enum UserType {
  APPLICANT = "applicant",
  USER = "employee",
  AGENCY = "agency",
}

/**
 * User Profile data shape matching backend API response
 */
export interface UserProfile {
  id: string
  uid: string
  email: string
  fullName: string
  emailVerified: boolean
  userType?: UserType
  otpVerified?: boolean
  otpVerifiedAt?: FirebaseTimestamp
  onboardingCompleted?: boolean
  createdAt: FirebaseTimestamp
  updatedAt: FirebaseTimestamp
  // Profile-specific fields
  phone?: string
  address?: string
  gender?: "Male" | "Female" | "Other" | string
  summary?: string
  joiningDate?: string
  photo?: string
  photoURL?: string
  phoneNumber?: string
  role?: string
  profilePicture?: string
  dateOfBirth?: string;
  agency?: Agency;
  data?: Record<string, any>; // UserType-specific data (e.g., agency for AGENCY users)
}

/**
 * API Response wrapper for user profile
 */
export interface UserProfileResponse {
  success: boolean
  user: UserProfile
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
  users: UserProfile[];
}

/**
 * ✅ Get the authenticated user's profile
 * Endpoint: GET /users/profile
 */
export async function getUserProfile(): Promise<UserProfile> {
  try {
    const response = await axiosClient.get<UserProfileResponse>("/users/profile");

    if (!response.data.success || !response.data.user) {
      throw new Error("Invalid response format from server");
    }

    return response.data.user;
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
 * ✅ Update the authenticated user's profile
 * Endpoint: PUT /users/profile
 */
export async function updateUserProfile(profileData: Partial<UserProfile>): Promise<UserProfile> {
  try {
    const response = await axiosClient.put<UserProfileResponse>("/users/profile", profileData);

    if (!response.data.success || !response.data.user) {
      throw new Error("Invalid response format from server");
    }

    return response.data.user;
  } catch (err: any) {
    console.error("updateUserProfile error:", err);
    throw new Error(err.message || "Failed to update user profile");
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
export async function searchUsers(query: string): Promise<UserProfile[]> {
  try {
    const response = await axiosClient.get<{ data: UserProfile[] }>('/users/search', {
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
 * @returns Promise with user profile
 */
export async function getUserById(userId: string): Promise<UserProfile> {
  try {
    const response = await axiosClient.get<UserProfileResponse>(`/users/${userId}`);

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
): Promise<UserProfile[]> {
  try {
    const response = await axiosClient.get<{ success: boolean; users: UserProfile[] }>("/users/employees", {
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
