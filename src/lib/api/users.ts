import { apiFetch } from "./otp" // Reuse your existing Firebase-aware fetch helper

/**
 * Firebase Timestamp structure
 */
export interface FirebaseTimestamp {
  _seconds: number
  _nanoseconds: number
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
  userType?: string
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
  profileImage?: string
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
    const response: UserProfileResponse = await apiFetch("/users/profile")

    if (!response.success || !response.user) {
      throw new Error("Invalid response format from server")
    }

    return response.user
  } catch (err: any) {
    // Re-throw with more context
    if (err.message?.includes("404")) {
      throw new Error("Profile not found. Please complete your onboarding first.")
    }
    throw err
  }
}

/**
 * ✅ Update the authenticated user's profile
 * Endpoint: PUT /users/profile
 */
export async function updateUserProfile(profileData: Partial<UserProfile>): Promise<UserProfile> {
  try {
    const response: UserProfileResponse = await apiFetch("/users/profile", {
      method: "PUT",
      body: JSON.stringify(profileData),
    })

    if (!response.success || !response.user) {
      throw new Error("Invalid response format from server")
    }

    return response.user
  } catch (err: any) {
    console.error("updateUserProfile error:", err)
    throw new Error(err.message || "Failed to update user profile")
  }
}

/**
 * ✅ Upload user profile photo
 * Endpoint: POST /users/upload-photo
 * Accepts multipart/form-data (handled separately in the component)
 */
export async function uploadUserPhoto(file: File): Promise<{ url: string }> {
  try {
    const formData = new FormData()
    formData.append("photo", file)

    const data = await apiFetch("/users/upload-photo", {
      method: "POST",
      body: formData,
      // Important: apiFetch already adds the Firebase token automatically
      headers: {
        // omit Content-Type to allow browser to set multipart boundary
      } as any,
    })

    if (!data || !data.url) {
      throw new Error("Upload failed: no file URL returned")
    }

    return data
  } catch (err: any) {
    console.error("uploadUserPhoto error:", err)
    throw new Error(err.message || "Failed to upload photo")
  }
}
