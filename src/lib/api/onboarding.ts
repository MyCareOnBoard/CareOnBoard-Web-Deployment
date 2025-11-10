import { apiFetch } from './otp'

export interface OnboardingStatus {
  completed: boolean
  completedAt?: string
}

export interface UserProfile {
  id: string
  uid: string
  email: string
  fullName: string
  emailVerified: boolean
  otpVerified: boolean
  otpVerifiedAt?: string
  onboardingCompleted: boolean
}

/**
 * Get user profile from backend
 */
export async function getUserProfile(): Promise<UserProfile> {
  try {
    console.log('🔄 [Onboarding] Fetching user profile...')
    
    const response = await apiFetch('/users/profile', {
      method: 'GET',
    })
    
    console.log('📥 [Onboarding] User profile response:', response)
    
    if (!response.success || !response.user) {
      throw new Error('Invalid profile response')
    }
    
    return response.user
  } catch (error: any) {
    console.error('❌ [Onboarding] Failed to fetch user profile:', error)
    throw error
  }
}

/**
 * Get onboarding completion status for the current user
 */
export async function getOnboardingStatus(): Promise<OnboardingStatus> {
  try {
    console.log('🔄 [Onboarding] Fetching onboarding status...')
    
    // Get user profile which includes onboardingCompleted field
    const profile = await getUserProfile()
    
    console.log('📥 [Onboarding] Profile data:', profile)
    console.log('✅ [Onboarding] Status from API - completed:', profile.onboardingCompleted)
    
    return {
      completed: profile.onboardingCompleted || false,
      completedAt: profile.otpVerifiedAt, // Use OTP verification time as proxy for completion time
    }
  } catch (error: any) {
    console.warn('⚠️ [Onboarding] API call failed:', error.message)
    
    // Fallback to localStorage when API is not available or fails
    const localCompleted = localStorage.getItem('onboarding_completed') === 'true'
    const localCompletedAt = localStorage.getItem('onboarding_completed_at')
    
    console.log('📦 [Onboarding] Using localStorage fallback - completed:', localCompleted)
    
    return {
      completed: localCompleted,
      completedAt: localCompletedAt || undefined,
    }
  }
}

/**
 * Mark onboarding as completed for the current user
 */
export async function completeOnboarding(): Promise<void> {
  try {
    console.log('📤 [Onboarding] Marking onboarding as completed...')
    
    const completedAt = new Date().toISOString()
    
    // Update user profile with onboardingCompleted flag
    const response = await apiFetch('/users/profile', {
      method: 'PUT',
      body: JSON.stringify({
        onboardingCompleted: true,
      }),
    })
    
    console.log('✅ [Onboarding] API updated successfully:', response)
    
    // Also set localStorage as backup/fallback
    localStorage.setItem('onboarding_completed', 'true')
    localStorage.setItem('onboarding_completed_at', completedAt)
    console.log('📦 [Onboarding] localStorage updated successfully')
    
  } catch (error: any) {
    console.error('❌ [Onboarding] Failed to complete onboarding via API:', error)
    
    // Still set localStorage as fallback
    const completedAt = new Date().toISOString()
    localStorage.setItem('onboarding_completed', 'true')
    localStorage.setItem('onboarding_completed_at', completedAt)
    console.log('📦 [Onboarding] localStorage fallback set')
    
    // Don't throw error - allow continuation with localStorage
    console.warn('⚠️ [Onboarding] Continuing with localStorage fallback')
  }
}

/**
 * Update user profile
 */
export async function updateUserProfile(data: {
  fullName?: string
  onboardingCompleted?: boolean
}): Promise<UserProfile> {
  try {
    console.log('📤 [Onboarding] Updating user profile:', data)
    
    const response = await apiFetch('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    })
    
    console.log('✅ [Onboarding] Profile updated successfully:', response)
    
    if (!response.success || !response.user) {
      throw new Error('Invalid update response')
    }
    
    return response.user
  } catch (error: any) {
    console.error('❌ [Onboarding] Failed to update profile:', error)
    throw error
  }
}

/**
 * Reset onboarding status (for testing/debugging)
 */
export function resetOnboardingStatus(): void {
  console.log('🔄 [Onboarding] Resetting onboarding status...')
  localStorage.removeItem('onboarding_completed')
  localStorage.removeItem('onboarding_completed_at')
  console.log('✅ [Onboarding] Status reset complete')
}