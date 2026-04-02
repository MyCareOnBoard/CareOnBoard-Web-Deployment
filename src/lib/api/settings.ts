import axiosClient from '../axios';
import { getAuth, updateProfile } from 'firebase/auth'

export interface AccountInfo {
  email: string
  fullName: string
  profilePicture?: string
}

export interface NotificationSettings {
  emailNotifications: boolean
  inAppNotifications: boolean
  appointmentChanges: boolean
  systemWarnings: boolean
}

// helpers
function parseAccount(raw: any): AccountInfo {
  const u =
    raw?.user ??
    raw?.account ??
    raw?.data?.user ??
    raw?.data ??
    raw ??
    {}

  const fullName =
    u.fullName ??
    u.full_name ??
    u.name ??
    u.full_Name ??
    u.FullName ??
    (u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : u.firstName) ??
    u.displayName ??
    ""

  const profilePicture =
    u.profilePicture ??
    u.profile_picture ??
    u.photoURL ??
    u.avatar ??
    u.profile_image ??
    u.profilePictureUrl ??
    u.picture ??
    ""

  return {
    email: u.email ?? "",
    fullName: fullName ?? "",
    profilePicture: profilePicture || undefined,
  }
}

// Account info
export async function getAccountInfo(): Promise<AccountInfo> {
  try {
    // First try Firebase Auth for immediate data
    const auth = getAuth()
    await auth.authStateReady?.()
    const currentUser = auth.currentUser
    
    const firebaseData: AccountInfo = {
      email: currentUser?.email || '',
      fullName: currentUser?.displayName || '',
      profilePicture: currentUser?.photoURL || undefined,
    }

    // Then try API
    try {
      const primaryResponse = await axiosClient.get("/userProfile/account-info")
      let responseData = primaryResponse.data

      if (!responseData || (!responseData.email && !responseData.fullName && !responseData?.user?.email)) {
        const fallbackResponse = await axiosClient.get("/users/profile")
        responseData = fallbackResponse.data
      }

      const apiData = parseAccount(responseData)
      
      // Merge: prefer API data, fallback to Firebase
      return {
        email: apiData.email || firebaseData.email,
        fullName: apiData.fullName || firebaseData.fullName,
        profilePicture: apiData.profilePicture || firebaseData.profilePicture,
      }
    } catch (apiError) {
      console.warn('⚠️ [Settings] API failed, using Firebase data only:', apiError)
      return firebaseData
    }
  } catch (error) {
    console.error("Failed to fetch account info:", error)
    throw error
  }
}

export async function updateFullName(fullName: string): Promise<void> {
  try {
    await axiosClient.put("/userProfile/account-info", { fullName })
  } catch (primaryError) {
    console.error("Failed to update full name via /userProfile/account-info:", primaryError)
    try {
      await axiosClient.put("/users/profile", { fullName })
    } catch (fallbackError) {
      console.error("Failed to update full name via fallback endpoint:", fallbackError)
      throw fallbackError
    }
  }
}

export async function updateProfilePicture(profilePicture: string): Promise<void> {
  try {
    await axiosClient.put("/userProfile/account-info", { profilePicture })
  } catch (primaryError) {
    console.error("Failed to update profile picture via /userProfile/account-info:", primaryError)
    try {
      await axiosClient.put("/users/profile", { profilePicture })
    } catch (fallbackError) {
      console.error("Failed to update profile picture via fallback endpoint:", fallbackError)
      throw fallbackError
    }
  }
}

/**
 * Upload profile picture to /profilePictureUpload
 */
async function uploadProfilePicture(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('profilePicture', file)
  
  const response = await axiosClient.post('/profilePictureUpload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  
  if (!response.data?.success || !response.data?.data?.url) {
    throw new Error(response.data?.message || 'Failed to upload profile picture')
  }
  
  // Return the URL from response.data.data.url
  const uploadedUrl = response.data.data.url
  return uploadedUrl
}

/**
 * Update account information via /users/profile
 * Uses /profilePictureUpload for image uploads
 * Falls back to Firebase Auth update if API is unavailable
 */
export async function updateAccountInfo(data: {
  fullName?: string
  profilePictureFile?: File
}): Promise<AccountInfo> {
  const auth = getAuth()
  await auth.authStateReady?.()
  const currentUser = auth.currentUser

  if (!currentUser) {
    throw new Error('User not authenticated')
  }

  try {
    let uploadedImageUrl: string | undefined

    // Step 1: Upload image if provided
    if (data.profilePictureFile) {
      uploadedImageUrl = await uploadProfilePicture(data.profilePictureFile)
      
      if (!uploadedImageUrl) {
        throw new Error('Image upload returned empty URL')
      }
    }

    // Step 2: Build update payload
    const updatePayload: any = {}
    
    if (data.fullName) {
      updatePayload.fullName = data.fullName
    }
    
    if (uploadedImageUrl) {
      updatePayload.profilePicture = uploadedImageUrl
    }
    
    // Step 3: Update via API
    const response = await axiosClient.put('/users/profile', updatePayload)
    
    // Step 4: Also update Firebase Auth
    try {
      const firebaseUpdate: any = {}
      if (data.fullName) firebaseUpdate.displayName = data.fullName
      if (uploadedImageUrl) firebaseUpdate.photoURL = uploadedImageUrl
      
      if (Object.keys(firebaseUpdate).length > 0) {
        await updateProfile(currentUser, firebaseUpdate)
      }
    } catch (fbError) {
      console.warn('⚠️ [Settings] Firebase sync failed (non-fatal):', fbError)
    }
    
    // Step 5: Build and return final account info
    const finalInfo: AccountInfo = {
      email: currentUser.email || '',
      fullName: data.fullName || currentUser.displayName || '',
      profilePicture: uploadedImageUrl || currentUser.photoURL || undefined,
    }
    
    return finalInfo
  } catch (error: any) {
    console.error('❌ [Settings] Update failed:', error.message)
    
    // Fallback: Update Firebase Auth only (name only, no image)
    if (data.fullName && !data.profilePictureFile) {
      console.log('🔄 [Settings] Falling back to Firebase-only name update')
      
      try {
        await updateProfile(currentUser, {
          displayName: data.fullName,
        })
        
        return {
          email: currentUser.email || '',
          fullName: data.fullName,
          profilePicture: currentUser.photoURL || undefined,
        }
      } catch (fbError: any) {
        console.error('❌ [Settings] Firebase fallback also failed:', fbError)
        throw new Error('Failed to update profile. Please try again.')
      }
    }
    
    // For image uploads, we need the API
    if (data.profilePictureFile) {
      throw new Error('Image upload requires server connection. Please check your network and try again.')
    }
    
    throw error
  }
}

// Notifications
export async function getNotificationSettings(): Promise<NotificationSettings> {
  // Prefer locally persisted user choices first
  const stored = localStorage.getItem('notification_settings')
  if (stored) {
    try {
      const parsed = JSON.parse(stored)
      return parsed
    } catch {
      console.warn('⚠️ [Settings] Failed to parse localStorage notification_settings')
    }
  }

  try {
    const response = await axiosClient.get('/userProfile/notifications')
    const res = response.data
    const n = res?.notifications || res || {}
    
    const settings = {
      emailNotifications: n.emailNotifications ?? true,
      inAppNotifications: n.inAppNotifications ?? true,
      appointmentChanges: n.appointmentChanges ?? false,
      systemWarnings: n.systemWarnings ?? false,
    }
    
    // Cache to localStorage
    localStorage.setItem('notification_settings', JSON.stringify(settings))
    return settings
  } catch (e) {
    console.error('❌ [Settings] API fetch failed; using defaults')
    const defaults: NotificationSettings = {
      emailNotifications: true,
      inAppNotifications: true,
      appointmentChanges: false,
      systemWarnings: false,
    }
    localStorage.setItem('notification_settings', JSON.stringify(defaults))
    return defaults
  }
}

export async function updateNotificationSettings(
  settings: NotificationSettings
): Promise<NotificationSettings> {
  // Optimistic local persistence
  localStorage.setItem('notification_settings', JSON.stringify(settings))

  try {
    const response = await axiosClient.put('/userProfile/notifications', settings)

    const serverSettings = response.data?.notifications || settings
    
    // Defensive: never allow server to flip false to true
    const final: NotificationSettings = {
      emailNotifications: serverSettings.emailNotifications ?? settings.emailNotifications,
      inAppNotifications: serverSettings.inAppNotifications ?? settings.inAppNotifications,
      appointmentChanges: serverSettings.appointmentChanges ?? settings.appointmentChanges,
      systemWarnings: serverSettings.systemWarnings ?? settings.systemWarnings,
    }

    for (const key of Object.keys(settings) as (keyof NotificationSettings)[]) {
      if (settings[key] === false && final[key] === true) {
        console.warn(`⚠️ [Settings] Server flipped ${key} to true; restoring user value false.`)
        final[key] = false
      }
    }

    localStorage.setItem('notification_settings', JSON.stringify(final))
    return final
  } catch (e) {
    console.error('❌ [Settings] API update failed; retaining optimistic local settings')
    return settings
  }
}

export async function deleteAccount(): Promise<void> {
  try {
    await axiosClient.delete("/userProfile/account")
  } catch (error) {
    console.error("Failed to delete account:", error)
    throw error
  }
}