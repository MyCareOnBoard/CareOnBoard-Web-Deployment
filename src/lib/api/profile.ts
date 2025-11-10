import { apiFetch } from './otp'

export interface ProfileInfo {
  id?: string
  fullName: string
  email: string
  phone: string
  address: string
  city: string
  state: string
  zipCode: string
  gender: 'Male' | 'Female'
  dateOfBirth: string
  joiningDate?: string
  summary?: string
  profilePicture?: string
  role?: string
}

/**
 * Convert date string to ISO date string
 */
function convertTimestampToISO(value: any): string {
  if (!value) return ''
  
  // Handle Firestore timestamp format with _seconds
  if (value && typeof value === 'object' && '_seconds' in value) {
    const date = new Date(value._seconds * 1000)
    return date.toISOString().split('T')[0]
  }
  
  // Handle Firestore timestamp format with seconds
  if (value && typeof value === 'object' && 'seconds' in value) {
    const date = new Date(value.seconds * 1000)
    return date.toISOString().split('T')[0]
  }
  
  // Handle standard Date object
  if (value instanceof Date) {
    return value.toISOString().split('T')[0]
  }
  
  // Handle string dates
  if (typeof value === 'string') {
    // Check if it's already in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return value
    }
    // Try to parse and format
    const date = new Date(value)
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0]
    }
    return value.split('T')[0]
  }
  
  return ''
}

/**
 * Get user profile information - matches AccountTab endpoint
 */
export async function getProfileInfo(): Promise<ProfileInfo> {
  try {
    console.log('🔄 Fetching profile info from /userProfile/account-info...')
    
    const response = await apiFetch('/userProfile/account-info', {
      method: 'GET',
    })
    
    console.log('📥 Raw API response:', JSON.stringify(response, null, 2))
    
    // Extract accountInfo from response
    let data = response
    if (response && response.accountInfo) {
      data = response.accountInfo
      console.log('📦 Data extracted from response.accountInfo')
    } else if (response && response.data) {
      data = response.data
      console.log('📦 Data extracted from response.data')
    } else if (response && response.user) {
      data = response.user
      console.log('📦 Data extracted from response.user')
    }
    
    console.log('📊 Processing data:', JSON.stringify(data, null, 2))
    
    // Log each field extraction
    console.log('🔍 Extracting fields:')
    console.log('  phoneNumber from API:', data.phoneNumber)
    console.log('  address from API:', data.address)
    console.log('  city from API:', data.city)
    console.log('  state from API:', data.state)
    console.log('  zipCode from API:', data.zipCode)
    console.log('  professionalSummary from API:', data.professionalSummary)
    
    // Map API fields to ProfileInfo interface
    const profile: ProfileInfo = {
      id: data.id || data.uid || data.userId || '',
      fullName: data.fullName || data.name || data.displayName || '',
      email: data.email || data.emailAddress || '',
      // API returns phoneNumber, we map it to phone
      phone: data.phoneNumber || data.phone || data.mobile || '',
      address: data.address || data.location || data.fullAddress || '',
      city: data.city || '',
      state: data.state || '',
      zipCode: data.zipCode || '',
      gender: (data.gender === 'Male' || data.gender === 'Female') ? data.gender : 'Male',
      dateOfBirth: convertTimestampToISO(data.dateOfBirth || data.dob),
      joiningDate: convertTimestampToISO(data.joiningDate || data.createdAt),
      // API returns professionalSummary, we map it to summary
      summary: data.professionalSummary || data.summary || data.bio || '',
      profilePicture: data.profilePicture || data.photo || data.photoURL || '',
      role: data.role || data.userRole || 'DSP',
    }
    
    console.log('✅ Parsed profile:')
    console.log('  ID:', profile.id)
    console.log('  Full Name:', profile.fullName)
    console.log('  Email:', profile.email)
    console.log('  Phone (mapped from phoneNumber):', profile.phone)
    console.log('  Address:', profile.address)
    console.log('  City:', profile.city)
    console.log('  State:', profile.state)
    console.log('  Zip Code:', profile.zipCode)
    console.log('  Gender:', profile.gender)
    console.log('  DOB:', profile.dateOfBirth)
    console.log('  Profile Picture:', profile.profilePicture)
    console.log('  Summary (mapped from professionalSummary):', profile.summary)
    console.log('  Role:', profile.role)
    
    return profile
  } catch (error: any) {
    console.error('❌ Failed to fetch profile:', error)
    throw new Error(error?.message || 'Failed to load profile information')
  }
}

/**
 * Update user profile information - matches AccountTab endpoint
 */
export async function updateProfileInfo(data: Partial<ProfileInfo>): Promise<ProfileInfo> {
  try {
    console.log('📤 Updating profile...')
    console.log('📤 Input data:', JSON.stringify(data, null, 2))
    
    const updatePayload: any = {}
    
    // Map ProfileInfo fields to API field names
    if (data.fullName !== undefined && data.fullName !== null) {
      updatePayload.fullName = data.fullName
      console.log('  ✓ Including fullName:', data.fullName)
    }
    if (data.phone !== undefined && data.phone !== null) {
      // We send phoneNumber to the API (not phone)
      updatePayload.phoneNumber = data.phone
      console.log('  ✓ Including phoneNumber (from phone):', data.phone)
    }
    if (data.address !== undefined && data.address !== null) {
      updatePayload.address = data.address
      console.log('  ✓ Including address:', data.address)
    }
    if (data.city !== undefined && data.city !== null) {
      updatePayload.city = data.city
      console.log('  ✓ Including city:', data.city)
    }
    if (data.state !== undefined && data.state !== null) {
      updatePayload.state = data.state
      console.log('  ✓ Including state:', data.state)
    }
    if (data.zipCode !== undefined && data.zipCode !== null) {
      updatePayload.zipCode = data.zipCode
      console.log('  ✓ Including zipCode:', data.zipCode)
    }
    if (data.gender !== undefined && data.gender !== null) {
      updatePayload.gender = data.gender
      console.log('  ✓ Including gender:', data.gender)
    }
    if (data.dateOfBirth !== undefined && data.dateOfBirth !== null) {
      updatePayload.dateOfBirth = data.dateOfBirth
      console.log('  ✓ Including dateOfBirth:', data.dateOfBirth)
    }
    if (data.summary !== undefined && data.summary !== null) {
      // We send professionalSummary to the API (not summary)
      updatePayload.professionalSummary = data.summary
      console.log('  ✓ Including professionalSummary (from summary):', data.summary)
    }
    if (data.role !== undefined && data.role !== null) {
      updatePayload.role = data.role
      console.log('  ✓ Including role:', data.role)
    }
    if (data.profilePicture !== undefined && data.profilePicture !== null) {
      updatePayload.profilePicture = data.profilePicture
      console.log('  ✓ Including profilePicture:', data.profilePicture)
    }
    
    console.log('📤 Final update payload:', JSON.stringify(updatePayload, null, 2))
    
    const response = await apiFetch('/userProfile/account-info', {
      method: 'PUT',
      body: JSON.stringify(updatePayload),
    })
    
    console.log('📬 Update response:', JSON.stringify(response, null, 2))
    
    // Extract data from response
    let responseData = response
    if (response && response.accountInfo) {
      responseData = response.accountInfo
      console.log('📦 Response data extracted from response.accountInfo')
    } else if (response && response.data) {
      responseData = response.data
      console.log('📦 Response data extracted from response.data')
    } else if (response && response.user) {
      responseData = response.user
      console.log('📦 Response data extracted from response.user')
    }
    
    console.log('🔍 Response fields:')
    console.log('  phoneNumber:', responseData.phoneNumber)
    console.log('  address:', responseData.address)
    console.log('  city:', responseData.city)
    console.log('  state:', responseData.state)
    console.log('  zipCode:', responseData.zipCode)
    console.log('  professionalSummary:', responseData.professionalSummary)
    
    // Map response back to ProfileInfo interface
    const updatedProfile: ProfileInfo = {
      id: responseData.id || responseData.uid || data.id || '',
      fullName: responseData.fullName || data.fullName || '',
      email: responseData.email || data.email || '',
      // API returns phoneNumber, we map it back to phone
      phone: responseData.phoneNumber || data.phone || '',
      address: responseData.address || data.address || '',
      city: responseData.city || data.city || '',
      state: responseData.state || data.state || '',
      zipCode: responseData.zipCode || data.zipCode || '',
      gender: responseData.gender || data.gender || 'Male',
      dateOfBirth: convertTimestampToISO(responseData.dateOfBirth || data.dateOfBirth),
      joiningDate: convertTimestampToISO(responseData.joiningDate),
      // API returns professionalSummary, we map it back to summary
      summary: responseData.professionalSummary || data.summary || '',
      profilePicture: responseData.profilePicture || data.profilePicture || '',
      role: responseData.role || data.role || 'DSP',
    }
    
    console.log('✅ Updated profile mapped back:')
    console.log('  phone (from phoneNumber):', updatedProfile.phone)
    console.log('  address:', updatedProfile.address)
    console.log('  city:', updatedProfile.city)
    console.log('  state:', updatedProfile.state)
    console.log('  zipCode:', updatedProfile.zipCode)
    console.log('  summary (from professionalSummary):', updatedProfile.summary)
    
    return updatedProfile
  } catch (error: any) {
    console.error('❌ Failed to update profile:', error)
    throw new Error(error?.message || 'Failed to save changes')
  }
}

/**
 * Upload profile picture - matches AccountTab implementation
 * NOTE: Currently commented out - not in use
 */
export async function uploadProfilePicture(file: File): Promise<{ url: string }> {
  try {
    console.log('📤 Uploading profile picture:', file.name, file.size, 'bytes', file.type)
    
    const formData = new FormData()
    formData.append('profilePicture', file)

    const base = import.meta.env.VITE_API_BASE_URL || ''
    const prefix = import.meta.env.VITE_API_PREFIX || '/api'
    const url = `${base}${prefix}/profilePictureUpload`

    console.log('📤 Upload URL:', url)

    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    })

    console.log('📬 Upload response status:', response.status)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('❌ Upload error:', errorData)
      throw new Error(errorData?.message || `Upload failed with status ${response.status}`)
    }

    const data = await response.json()
    console.log('📬 Upload response data:', JSON.stringify(data, null, 2))
    
    // Try various response field names
    const imageUrl = 
      data.profilePicture ||
      data.url || 
      data.photoURL || 
      data.photo ||
      data.image ||
      data.data?.profilePicture ||
      data.data?.url || 
      data.data?.photoURL ||
      data.data?.photo ||
      data.data?.image
    
    if (!imageUrl) {
      console.error('❌ No image URL in response:', data)
      throw new Error('No image URL returned from server')
    }
    
    console.log('✅ Image uploaded successfully:', imageUrl)
    return { url: imageUrl }
  } catch (error: any) {
    console.error('❌ Upload failed:', error)
    throw new Error(error?.message || 'Failed to upload profile picture')
  }
}

/**
 * Delete user account permanently
 * Uses the correct endpoint: DELETE /userProfile/account
 * 
 * Response format:
 * {
 *   "success": true,
 *   "message": "string"
 * }
 */
export async function deleteAccount(): Promise<void> {
  try {
    console.log('🗑️ Deleting account via DELETE /userProfile/account...')
    
    const response = await apiFetch('/userProfile/account', {
      method: 'DELETE',
    })
    
    console.log('✅ Account deletion response:', JSON.stringify(response, null, 2))
    
    // Check if deletion was successful
    if (response && (response.success === true || response.message)) {
      console.log('✅ Account deleted successfully:', response.message || 'Account deleted')
      return
    }
    
    // If we get here, the response didn't indicate success clearly
    console.warn('⚠️ Unexpected response format:', response)
    
    // Still proceed if no error was thrown
    console.log('✅ Proceeding with account deletion (no error returned)')
    
  } catch (error: any) {
    console.error('❌ Failed to delete account:', error)
    
    // Provide user-friendly error messages
    let errorMessage = 'Failed to delete account. '
    
    if (error.message?.includes('Network error') || error.message?.includes('fetch')) {
      errorMessage = 'Network error: Unable to reach the server. Please check your internet connection and try again.'
    } else if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
      errorMessage = 'Authentication error: Please log in again and try deleting your account.'
    } else if (error.message?.includes('403') || error.message?.includes('Forbidden')) {
      errorMessage = 'Permission denied: You do not have permission to delete this account.'
    } else if (error.message?.includes('404')) {
      errorMessage = 'Account deletion endpoint not found. Please contact support.'
    } else if (error.message) {
      errorMessage += error.message
    } else {
      errorMessage += 'Please try again or contact support.'
    }
    
    throw new Error(errorMessage)
  }
}