
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
  SUPER_ADMIN = "super_admin",
}


export interface Profile {
  id?: string
  uid?: string
  email?: string
  fullName?: string
  name?: string  // Agency name or user display name
  phoneNumber?: string
  address?: string
  city?: string
  state?: string
  zipCode?: string
  gender?: string
  dateOfBirth?: string
  profilePicture?: string
  professionalSummary?: string
  workAvailability?: boolean
  tagId?: string
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
  userType?: UserType
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
