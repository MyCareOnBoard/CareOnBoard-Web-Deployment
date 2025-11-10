import { apiFetch } from './otp'
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

/**
 * Get account information from /users/profile or Firebase auth
 */
export async function getAccountInfo(): Promise<AccountInfo> {
  console.log('🔄 [Settings] Fetching account info...')
  
  // Get Firebase auth data first
  const auth = getAuth()
  await auth.authStateReady?.()
  const currentUser = auth.currentUser
  
  if (!currentUser) {
    throw new Error('User not authenticated')
  }
  
  // Start with Firebase data as base
  const baseInfo: AccountInfo = {
    email: currentUser.email || '',
    fullName: currentUser.displayName || '',
    profilePicture: currentUser.photoURL || undefined,
  }
  
  console.log('📥 [Settings] Firebase base info:', baseInfo)
  
  // Try to get additional data from API
  try {
    const response = await apiFetch('/users/profile', {
      method: 'GET',
    })
    
    console.log('📥 [Settings] API profile response:', response)
    
    if (response.success && response.user) {
      const user = response.user
      
      // Merge API data with Firebase data (API takes precedence)
      return {
        email: user.email || baseInfo.email,
        fullName: user.fullName || baseInfo.fullName,
        profilePicture: user.profilePicture || baseInfo.profilePicture,
      }
    }
  } catch (error: any) {
    console.warn('⚠️ [Settings] API call failed, using Firebase data only:', error.message)
    // Continue with Firebase data
  }
  
  return baseInfo
}

/**
 * Upload profile picture to /profilePictureUpload
 */
async function uploadProfilePicture(file: File): Promise<string> {
  console.log('📤 [Settings] Uploading profile picture:', file.name, file.size, 'bytes')
  
  const formData = new FormData()
  formData.append('profilePicture', file)
  
  const response = await apiFetch('/profilePictureUpload', {
    method: 'POST',
    body: formData,
    headers: undefined, // Let browser set Content-Type with boundary
  })
  
  console.log('✅ [Settings] Profile picture upload response:', response)
  
  if (!response.success || !response.data?.url) {
    throw new Error(response.message || 'Failed to upload profile picture')
  }
  
  return response.data.url
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
  console.log('📤 [Settings] Updating account info:', {
    fullName: data.fullName,
    hasImage: !!data.profilePictureFile,
  })

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
      try {
        uploadedImageUrl = await uploadProfilePicture(data.profilePictureFile)
        console.log('✅ [Settings] Image uploaded successfully:', uploadedImageUrl)
      } catch (uploadError: any) {
        console.error('❌ [Settings] Image upload failed:', uploadError)
        throw new Error('Failed to upload profile picture. Please try again.')
      }
    }

    // Step 2: Update profile with name and/or image URL
    if (data.fullName || uploadedImageUrl) {
      const updatePayload: any = {}
      
      if (data.fullName) {
        updatePayload.fullName = data.fullName
      }
      
      if (uploadedImageUrl) {
        updatePayload.profilePicture = uploadedImageUrl
      }
      
      console.log('📤 [Settings] Updating profile with:', updatePayload)
      
      const response = await apiFetch('/users/profile', {
        method: 'PUT',
        body: JSON.stringify(updatePayload),
      })
      
      console.log('✅ [Settings] Profile update successful:', response)
      
      if (response.success && response.user) {
        // Also update Firebase profile
        try {
          await updateProfile(currentUser, {
            displayName: response.user.fullName || data.fullName,
            photoURL: response.user.profilePicture || uploadedImageUrl,
          })
          console.log('✅ [Settings] Firebase profile updated')
        } catch (fbError) {
          console.warn('⚠️ [Settings] Firebase profile update failed:', fbError)
        }

        return {
          email: response.user.email || currentUser.email || '',
          fullName: response.user.fullName || data.fullName || '',
          profilePicture: response.user.profilePicture || uploadedImageUrl || undefined,
        }
      }
    }
  } catch (error: any) {
    console.error('❌ [Settings] API update failed:', error.message)
    
    // Fallback: Update Firebase Auth profile only (name only)
    if (data.fullName && !data.profilePictureFile) {
      console.log('🔄 [Settings] Falling back to Firebase-only update for name')
      
      try {
        await updateProfile(currentUser, {
          displayName: data.fullName,
        })
        console.log('✅ [Settings] Firebase profile updated (fallback mode)')
        
        // Return updated info from Firebase
        return {
          email: currentUser.email || '',
          fullName: data.fullName,
          profilePicture: currentUser.photoURL || undefined,
        }
      } catch (fbError: any) {
        console.error('❌ [Settings] Firebase update also failed:', fbError)
        throw new Error('Failed to update profile. Please try again.')
      }
    }
    
    if (data.profilePictureFile) {
      // For image uploads, we need the API
      throw new Error('Image upload requires server connection. Please check your network and try again.')
    }
    
    throw error
  }

  // This shouldn't be reached, but just in case
  return {
    email: currentUser.email || '',
    fullName: currentUser.displayName || data.fullName || '',
    profilePicture: currentUser.photoURL || undefined,
  }
}

/**
 * Get notification settings from /userProfile/notifications
 * Using localStorage as fallback if API is unavailable
 */
export async function getNotificationSettings(): Promise<NotificationSettings> {
  // Prefer locally persisted user choices first
  const stored = localStorage.getItem('notification_settings')
  if (stored) {
    try {
      const parsed = JSON.parse(stored)
      console.log('📦 [Settings] Loaded from localStorage (authoritative):', parsed)
      return parsed
    } catch {
      console.warn('⚠️ [Settings] Failed to parse localStorage notification_settings')
    }
  }

  console.log('🔄 [Settings] Fetching from API /userProfile/notifications (no local cached settings)')
  try {
    const response = await apiFetch('/userProfile/notifications', { method: 'GET' })
    let api = response?.notifications
    if (!api) {
      console.warn('⚠️ [Settings] API did not return notifications object; using defaults')
      api = {
        emailNotifications: true,
        inAppNotifications: true,
        appointmentChanges: false,
        systemWarnings: false,
      }
    }
    // Persist exactly what we got
    localStorage.setItem('notification_settings', JSON.stringify(api))
    console.log('💾 [Settings] Cached API settings to localStorage:', api)
    return api
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
  console.log('📤 [Settings] User wants to save:', settings)

  // Optimistic local persistence (authoritative)
  localStorage.setItem('notification_settings', JSON.stringify(settings))
  console.log('💾 [Settings] Optimistically wrote to localStorage:', settings)

  try {
    const response = await apiFetch('/userProfile/notifications', {
      method: 'PUT',
      body: JSON.stringify(settings),
    })
    console.log('📥 [Settings] API response:', response)

    let server = response?.notifications
    if (!server) {
      console.warn('⚠️ [Settings] API missing notifications; keeping user settings')
      return settings
    }

    // Defensive merge: never allow server to flip a false to true unintentionally
    const final: NotificationSettings = {
      emailNotifications: server.emailNotifications ?? settings.emailNotifications,
      inAppNotifications: server.inAppNotifications ?? settings.inAppNotifications,
      appointmentChanges: server.appointmentChanges ?? settings.appointmentChanges,
      systemWarnings: server.systemWarnings ?? settings.systemWarnings,
    }

    for (const key of Object.keys(settings) as (keyof NotificationSettings)[]) {
      if (settings[key] === false && final[key] === true) {
        console.warn(`⚠️ [Settings] Server flipped ${key} to true; restoring user value false.`)
        final[key] = false
      }
    }

    localStorage.setItem('notification_settings', JSON.stringify(final))
    console.log('✅ [Settings] Final persisted settings:', final)
    return final
  } catch (e) {
    console.error('❌ [Settings] API update failed; retaining optimistic local settings')
    return settings
  }
}