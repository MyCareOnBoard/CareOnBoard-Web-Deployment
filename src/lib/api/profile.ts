import axiosClient from '../axios'

export interface ProfileInfo {
  id?: string
  fullName: string
  email: string
  phone: string
  address: string | {
    address: string
    city: string
    zipCode: string
    latlon?: {
      lat: string
      lon: string
    }
  }
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

function resolveProfileSource(raw: any): any {
  if (!raw) return {}

  if (raw.accountInfo) return raw.accountInfo
  if (raw.data?.accountInfo) return raw.data.accountInfo
  if (raw.data?.user) return raw.data.user
  if (raw.data) return raw.data
  if (raw.user) return raw.user

  return raw
}

function mapToProfileInfo(source: any, fallback: Partial<ProfileInfo> = {}): ProfileInfo {
  const resolved = source ?? {}
  return {
    id: resolved.id ?? resolved.uid ?? resolved.userId ?? fallback.id ?? '',
    fullName: resolved.fullName ?? resolved.name ?? resolved.displayName ?? fallback.fullName ?? '',
    email: resolved.email ?? resolved.emailAddress ?? fallback.email ?? '',
    phone: resolved.phoneNumber ?? resolved.phone ?? resolved.mobile ?? fallback.phone ?? '',
    address: resolved.address ?? resolved.location ?? resolved.fullAddress ?? fallback.address ?? '',
    city: resolved.city ?? fallback.city ?? '',
    state: resolved.state ?? fallback.state ?? '',
    zipCode: resolved.zipCode ?? fallback.zipCode ?? '',
    gender:
      resolved.gender === 'Male' || resolved.gender === 'Female'
        ? resolved.gender
        : fallback.gender ?? 'Male',
    dateOfBirth: convertTimestampToISO(
      resolved.dateOfBirth ?? resolved.dob ?? fallback.dateOfBirth ?? ''
    ),
    joiningDate: convertTimestampToISO(resolved.joiningDate ?? resolved.createdAt ?? fallback.joiningDate ?? ''),
    summary: resolved.professionalSummary ?? resolved.summary ?? resolved.bio ?? fallback.summary ?? '',
    profilePicture:
      resolved.profilePicture ??
      resolved.photo ??
      resolved.photoURL ??
      fallback.profilePicture ??
      '',
    role: resolved.role ?? resolved.userRole ?? fallback.role ?? 'DSP',
  }
}

/**
 * Get user profile information - matches AccountTab endpoint
 */
export async function getProfileInfo(): Promise<ProfileInfo> {
  try {
    const response = await axiosClient.get('/userProfile/account-info')
    const data = resolveProfileSource(response.data)
    return mapToProfileInfo(data)
  } catch (error) {
    console.error('Failed to fetch profile info:', error)
    throw error
  }
}

/**
 * Update user profile information - matches AccountTab endpoint
 */
export async function updateProfileInfo(data: Partial<ProfileInfo>): Promise<ProfileInfo> {
  try {
    const updatePayload: any = {}

    if (data.fullName !== undefined && data.fullName !== null) {
      updatePayload.fullName = data.fullName
    }
    if (data.phone !== undefined && data.phone !== null) {
      updatePayload.phoneNumber = data.phone
    }
    if (data.address !== undefined && data.address !== null) {
      updatePayload.address = data.address
    }
    if (data.city !== undefined && data.city !== null) {
      updatePayload.city = data.city
    }
    if (data.state !== undefined && data.state !== null) {
      updatePayload.state = data.state
    }
    if (data.zipCode !== undefined && data.zipCode !== null) {
      updatePayload.zipCode = data.zipCode
    }
    if (data.gender !== undefined && data.gender !== null) {
      updatePayload.gender = data.gender
    }
    if (data.dateOfBirth !== undefined && data.dateOfBirth !== null) {
      updatePayload.dateOfBirth = data.dateOfBirth
    }
    if (data.summary !== undefined && data.summary !== null) {
      updatePayload.professionalSummary = data.summary
    }
    if (data.role !== undefined && data.role !== null) {
      updatePayload.role = data.role
    }
    if (data.profilePicture !== undefined && data.profilePicture !== null) {
      updatePayload.profilePicture = data.profilePicture
    }

    const response = await axiosClient.put('/userProfile/account-info', updatePayload)
    const responseData = resolveProfileSource(response.data)

    return mapToProfileInfo(responseData, data)
  } catch (error) {
    console.error('Failed to update profile info:', error)
    throw error
  }
}

/**
 * Upload profile picture - matches AccountTab implementation
 * NOTE: Currently commented out - not in use
 */
export async function uploadProfilePicture(file: File): Promise<{ url: string }> {
  try {
    const formData = new FormData()
    formData.append('profilePicture', file)

    const response = await axiosClient.post('/profilePictureUpload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })

    const data = response.data
    const imageUrl =
      data?.profilePicture ??
      data?.url ??
      data?.photoURL ??
      data?.photo ??
      data?.image ??
      data?.data?.profilePicture ??
      data?.data?.url ??
      data?.data?.photoURL ??
      data?.data?.photo ??
      data?.data?.image ??
      ''

    if (!imageUrl) {
      throw new Error('Upload succeeded but no image URL returned')
    }

    return { url: imageUrl }
  } catch (error) {
    console.error('Failed to upload profile picture:', error)
    throw error
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
    await axiosClient.delete('/userProfile/account')
  } catch (error) {
    console.error('Failed to delete account:', error)
    throw error
  }
}

/**
 * Get account information
 * Retrieve user's account information (name, email, profile picture)
 */
export async function getAccountInfo(): Promise<ProfileInfo> {
  try {
    const response = await axiosClient.get('/userProfile/account-info')
    const source = resolveProfileSource(response.data)
    return mapToProfileInfo(source)
  } catch (err: any) {
    console.error('getAccountInfo error:', err)
    throw new Error(err.response?.data?.message || 'Failed to fetch account info')
  }
}

/**
 * Update account information
 * Update user's full name (email cannot be changed)
 */
export async function updateAccountInfo(data: { fullName: string }): Promise<any> {
  try {
    const response = await axiosClient.put('/userProfile/account-info', data)
    return response.data
  } catch (err: any) {
    console.error('updateAccountInfo error:', err)
    throw new Error(err.response?.data?.message || 'Failed to update account info')
  }
}

/**
 * Get notification preferences
 * Retrieve user's notification preferences
 */
export async function getNotificationPreferences(): Promise<any> {
  try {
    const response = await axiosClient.get('/userProfile/notifications')
    return response.data
  } catch (err: any) {
    console.error('getNotificationPreferences error:', err)
    throw new Error(err.response?.data?.message || 'Failed to fetch notification preferences')
  }
}