
/**
 * Firebase Timestamp structure
 */
export interface FirebaseTimestamp {
  _seconds: number
  _nanoseconds: number
}

export enum UserType {
  APPLICANT = "applicant",
  EMPLOYEE = "employee",
  AGENCY = "agency",
  AGENCY_STAFF = "agency_staff",
  SUPER_ADMIN = "super_admin",
  FAMILY_MEMBER = "family_member",
}

export interface EmergencyContact {
  name: string
  relationship: string
  phone: string
}

/**
 * Employee/DSP payload shape returned by employee endpoints.
 * Matches the API object shown in the request.
 */
export interface Employee {
  id: string
  userId: string
  fullName: string
  email: string
  dateOfBirth: string
  workAvailability: boolean
  hireDate: string
  profilePicture: string
  tagId: string
  role: string
  address: string
  phoneNumber: string
  emergencyContact: EmergencyContact
}


export interface Profile {
  id?: string
  uid?: string
  email?: string
  fullName?: string
  name?: string  // Agency name or user display name
  phoneNumber?: string
  address?: string | {
    address: string
    city: string
    zipCode: string
    latlon?: {
      lat: string
      lon: string
    }
  }
  city?: string
  state?: string
  zipCode?: string
  gender?: string
  dateOfBirth?: string
  profilePicture?: string
  professionalSummary?: string
  workAvailability?: boolean
  tagId?: string
  // Super Admin specific
  accessList?: string[]  // List of access scopes for super admins
  supportedClientTypes?: ("ddd" | "hha")[]
  // Agency staff HR fields (surfaced from the agencyStaff doc for the staff timesheet)
  role?: string
  employmentType?: "full_time" | "part_time"
  billingType?: "hourly" | "monthly"
  billingRate?: number
}

/**
 * Lightweight embedded agency shape (some endpoints embed agency details on the user)
 */
export interface UserAgency {
  id?: string
  name?: string
  email?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  zipCode?: string
  supportedClientTypes?: ("ddd" | "hha")[]
}


/**
 * User Profile data shape matching backend API response
 * This structure maintains a profile sub-object while extracting commonly used fields to the top level
 */
export interface User {
  // Core user fields
  id?: string
  uid: string
  email: string
  fullName: string
  emailVerified: boolean
  userType: UserType
  // Onboarding and verification (extracted from profile for convenience)
  otpVerified?: boolean
  otpVerifiedAt?: FirebaseTimestamp
  onboardingCompleted?: boolean
  // Timestamps
  createdAt: FirebaseTimestamp | Date
  updatedAt: FirebaseTimestamp | Date
  // Profile fields at top level for backward compatibility
  phone?: string
  gender?: "Male" | "Female" | "Other" | string
  joiningDate?: string
  photo?: string
  photoURL?: string
  phoneNumber?: string
  role?: string
  profilePicture?: string
  dateOfBirth?: string
  // Employee/DSP fields (used in user panel + employee endpoints)
  workAvailability?: boolean
  tagId?: string
  hireDate?: string | FirebaseTimestamp | Date | null
  // Family member fields (only set for userType === "family_member")
  clientId?: string
  relationship?: string
  // Applicant subtype: "dsp" | "hha" (default "dsp")
  applicantType?: string
  // Agency reference
  agencyId?: string
  // Some endpoints embed agency details rather than only agencyId
  agency?: UserAgency
  // Profile sub-object containing all profile-related data
  profile?: Profile
}

/**
 * Auth state for Redux
 */
export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

/**
 * Login credentials
 */
export interface LoginCredentials {
  email: string
  password: string
}

/**
 * Signup credentials
 */
export interface SignupCredentials {
  email: string
  password: string
  fullName: string
}
