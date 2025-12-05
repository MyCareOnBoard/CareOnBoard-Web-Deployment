
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

/**
 * Agency interface
 * Represents an agency in the system
 */
export interface Agency {
  id: string;
  uid: string; // Links to the user account who created/manages the agency
  name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  logo?: string;
  website?: string;
  description?: string;

  // Business details
  taxId?: string;
  npi?: string;
  licenseNumber?: string;

  // Status and timestamps
  status: 'active' | 'inactive' | 'pending' | 'suspended';
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;

  // Optional owner profile
  owner?: UserProfile;
}

/**
 * User object structure
 */
export interface User {
  id: string
  uid: string
  email: string
  fullName: string
  emailVerified: boolean
  createdAt: string
  updatedAt: string
  photoURL?: string
  phoneNumber?: string
  userType?: UserType
  profile?: Record<string, any>
  [key: string]: any
}

/**
 * User Profile data shape matching backend API response
 */
export interface UserProfile {
  id?: string
  uid: string
  email: string
  fullName: string
  emailVerified: boolean
  userType?: UserType
  otpVerified?: boolean
  otpVerifiedAt?: FirebaseTimestamp
  onboardingCompleted?: boolean
  createdAt: FirebaseTimestamp | Date
  updatedAt: FirebaseTimestamp | Date
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
  dateOfBirth?: string;
  agency?: Agency;
  profile?: Record<string, any>; // UserType-specific data (e.g., agency for AGENCY users)
}

/**
 * Auth state for Redux
 */
export interface AuthState {
  user: UserProfile | null
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
