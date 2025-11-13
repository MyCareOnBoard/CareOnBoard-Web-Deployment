import axiosClient from '../axios';

/**
 * Firebase Timestamp structure
 */
export interface FirebaseTimestamp {
  _seconds: number
  _nanoseconds: number
}

export enum UserType {
  APPLICANT = "pre_employee_user",
  USER = "employee_user",
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
}

/**
 * API Response wrapper for user profile
 */
export interface UserProfileResponse {
  success: boolean
  user: UserProfile
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
