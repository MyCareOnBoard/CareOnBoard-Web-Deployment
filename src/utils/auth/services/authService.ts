/**
 * Auth Service
 * 
 * Helper functions for authentication operations with Firebase and Redux
 */

import { createAsyncThunk } from '@reduxjs/toolkit'
import { auth } from '@/lib/firebase'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  signOut,
  updateProfile,
  verifyPasswordResetCode,
  confirmPasswordReset,
  deleteUser,
  type User as FirebaseUser,
} from 'firebase/auth'
import type { User } from '../types/user.types'
import type { LoginResponse } from '../types/login.types'
import { getAuthErrorMessage } from '../helpers/errorMessages'
import { hasEnrolledMfa, storeMfaResolver } from '@/utils/auth/services/mfaService'
import { clearMfaResolverSession } from '@/utils/auth/services/mfaSessionStore'
import { getUser } from '@/lib/api/users'
import { UserType } from '../types/user.types'
import {
  getLoginProfileErrorMessage,
  isMissingProfileError,
} from '@/utils/auth/helpers/loginProfileError'

export interface AuthResponse {
  success: boolean
  user?: User
  error?: string
}

/**
 * Transform Firebase User to our User type
 */
export function transformFirebaseUser(firebaseUser: FirebaseUser): User {
  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email || '',
    fullName: firebaseUser.displayName || '',
    emailVerified: firebaseUser.emailVerified,
    userType: 'applicant' as any, // Default to applicant, will be updated from backend
    createdAt: firebaseUser.metadata.creationTime
      ? new Date(firebaseUser.metadata.creationTime)
      : new Date(),
    updatedAt: new Date(),
    photoURL: firebaseUser.photoURL || undefined,
    phoneNumber: firebaseUser.phoneNumber || undefined,
  }
}

export type { LoginResponse, LoginResult } from '../types/login.types'

/**
 * Login with email and password using Firebase (MFA-aware)
 */
export async function loginWithEmail(
  email: string,
  password: string
): Promise<LoginResponse> {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password)
    const firebaseUser = userCredential.user
    let user = transformFirebaseUser(firebaseUser)

    try {
      const profile = await getUser()
      user = { ...user, ...profile, uid: profile.uid || user.uid }
      if (
        profile.userType === UserType.APPLICANT &&
        !profile.otpVerified
      ) {
        return { status: 'success', user }
      }
    } catch (profileError) {
      if (!isMissingProfileError(profileError)) {
        console.error('[loginWithEmail] Unexpected profile load failure:', profileError)
        return {
          status: 'error',
          error: getLoginProfileErrorMessage(profileError),
        }
      }
      console.warn('[loginWithEmail] Profile not found, continuing login flow')
    }

    if (!(await hasEnrolledMfa(firebaseUser))) {
      return { status: 'mfa_enrollment_required', user }
    }

    return { status: 'success', user }
  } catch (error: unknown) {
    console.error('Login error:', error)

    const stored = await storeMfaResolver(error, email)
    if (stored) {
      return { status: 'mfa_required' }
    }

    const err = error as { message?: string }
    return {
      status: 'error',
      error: getAuthErrorMessage(error) || err.message || 'Login failed',
    }
  }
}

/**
 * Register new user with Firebase
 */
export async function registerWithEmail(fullName: string, email: string, password: string): Promise<AuthResponse> {
  try {
    // Validate password
    if (password.length < 6) {
      return {
        success: false,
        error: 'Password must be at least 6 characters',
      }
    }

    // Create user account
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)

    // Update user profile with display name
    await updateProfile(userCredential.user, {
      displayName: fullName,
    })

    // Refresh the user object to get updated profile
    await userCredential.user.reload()
    const user = transformFirebaseUser(userCredential.user)

    return {
      success: true,
      user,
    }
  } catch (error: any) {
    console.error('Registration error:', error)

    return {
      success: false,
      error: getAuthErrorMessage(error),
    }
  }
}

/**
 * Send password reset email using Firebase
 */
export async function sendPasswordResetEmail(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    await firebaseSendPasswordResetEmail(auth, email)

    return {
      success: true,
    }
  } catch (error: any) {
    console.error('Password reset error:', error)

    return {
      success: false,
      error: getAuthErrorMessage(error),
    }
  }
}

/**
 * Verify password reset code
 * Used to verify the code from the reset link before showing password form
 */
export async function verifyResetCode(code: string): Promise<{ success: boolean; email?: string; error?: string }> {
  try {
    const email = await verifyPasswordResetCode(auth, code)

    return {
      success: true,
      email,
    }
  } catch (error: any) {
    console.error('Reset code verification error:', error)

    let errorMessage = 'Invalid or expired reset code'

    switch (error.code) {
      case 'auth/expired-action-code':
        errorMessage = 'This reset link has expired. Please request a new one.'
        break
      case 'auth/invalid-action-code':
        errorMessage = 'This reset link is invalid. Please request a new one.'
        break
      case 'auth/user-disabled':
        errorMessage = 'This account has been disabled.'
        break
      case 'auth/user-not-found':
        errorMessage = 'No account found for this reset link.'
        break
      default:
        errorMessage = error.message || 'Invalid or expired reset code'
    }

    return {
      success: false,
      error: errorMessage,
    }
  }
}

/**
 * Confirm password reset with new password
 * Completes the password reset process
 */
export async function confirmReset(code: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
  try {
    await confirmPasswordReset(auth, code, newPassword)

    return {
      success: true,
    }
  } catch (error: any) {
    console.error('Password reset confirmation error:', error)

    let errorMessage = 'Failed to reset password'

    switch (error.code) {
      case 'auth/expired-action-code':
        errorMessage = 'This reset link has expired. Please request a new one.'
        break
      case 'auth/invalid-action-code':
        errorMessage = 'This reset link is invalid. Please request a new one.'
        break
      case 'auth/weak-password':
        errorMessage = 'Password is too weak. Please choose a stronger password.'
        break
      default:
        errorMessage = error.message || 'Failed to reset password'
    }

    return {
      success: false,
      error: errorMessage,
    }
  }
}

/**
 * Logout current user
 */
export async function logout(): Promise<void> {
  try {
    clearMfaResolverSession()
    const { clearRecaptchaVerifier } = await import('@/utils/auth/services/mfaService')
    clearRecaptchaVerifier()
    await signOut(auth)
  } catch (error) {
    console.error('Logout error:', error)
    throw error
  }
}

/**
 * Delete the current Firebase Auth user (e.g. when backend user creation fails after signup)
 */
export async function deleteCurrentUser(): Promise<void> {
  const user = auth.currentUser
  if (!user) return
  try {
    await deleteUser(user)
  } catch (error) {
    console.error('Error deleting Firebase user:', error)
    throw error
  }
}

/**
 * Get current authenticated user
 */
export async function getCurrentUser(): Promise<User | null> {
  return new Promise((resolve) => {
    // Use Firebase auth state observer
    const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
      unsubscribe()

      if (firebaseUser) {
        resolve(transformFirebaseUser(firebaseUser))
      } else {
        resolve(null)
      }
    })
  })
}

/**
 * Get Firebase ID token for the current user
 * Use this to send authenticated requests to your backend
 * 
 * @param forceRefresh - Force token refresh even if not expired
 * @returns Firebase ID token or null if not authenticated
 */
export async function getIdToken(forceRefresh = false): Promise<string | null> {
  const user = auth.currentUser

  if (!user) {
    return null
  }

  try {
    return await user.getIdToken(forceRefresh)
  } catch (error) {
    console.error('Error getting ID token:', error)
    return null
  }
}

/**
 * Save user session - Firebase handles this automatically
 * Kept for backward compatibility
 */
// export function saveUserSession(user: User): void {
//   // Firebase handles session persistence automatically
//   // This function is kept for backward compatibility
//   console.log('User session saved (handled by Firebase)', user.uid)
// }

/**
 * Clear user session - Firebase handles this automatically
 * Kept for backward compatibility
 */
// export function clearUserSession(): void {
// //   // Firebase handles session clearing automatically via signOut
// //   // This function is kept for backward compatibility
// //   console.log('User session cleared (handled by Firebase)')
// }

/**
 * Store user data in localStorage
 */
export function storeUserData(user: User): void {
  try {
    localStorage.setItem('auth_user', JSON.stringify(user))
  } catch (error) {
    console.error('Failed to store user data:', error)
  }
}

/**
 * Remove user data from localStorage
 */
export function removeUserData(): void {
  try {
    localStorage.removeItem('auth_user')
  } catch (error) {
    console.error('Failed to remove user data:', error)
  }
}

/**
 * Sync Firebase auth state with Redux
 * This thunk can be dispatched to check and sync the current auth state
 */
export const syncAuthState = createAsyncThunk(
  'auth/syncState',
  async (_, { rejectWithValue }) => {
    return new Promise<User | null>((resolve) => {
      const unsubscribe = auth.onAuthStateChanged(
        (firebaseUser) => {
          unsubscribe()
          if (firebaseUser) {
            const user = transformFirebaseUser(firebaseUser)
            resolve(user)
          } else {
            resolve(null)
          }
        },
        (error) => {
          unsubscribe()
          console.error('Auth state sync error:', error)
          resolve(null)
        }
      )
    })
  }
)
