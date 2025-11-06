import { apiFetch } from "./otp" // Reuse your existing Firebase-aware fetch helper

// Define user data shape for type safety
export interface UserProfile {
  id?: string
  name?: string
  email?: string
  phone?: string
  address?: string
  gender?: "Male" | "Female" | "Other" | string
  summary?: string
  joiningDate?: string
  photo?: string
}

/**
 * ✅ Get the authenticated user's profile
 * Endpoint: GET /users/profile
 */
export async function getUserProfile(): Promise<UserProfile> {
  try {
    return await apiFetch("/users/profile")
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
 * Endpoint: PUT /users/update
 */
export async function updateUserProfile(profileData: UserProfile): Promise<UserProfile> {
  try {
    const data = await apiFetch("/users/profile", {
      method: "PUT",
      body: JSON.stringify(profileData),
    })

    if (!data || typeof data !== "object") {
      throw new Error("Invalid response format")
    }

    return data
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
