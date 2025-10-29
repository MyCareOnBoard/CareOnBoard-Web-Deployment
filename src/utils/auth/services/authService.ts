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
  type User as FirebaseUser,
} from 'firebase/auth'
import type { User } from '../types'

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
    createdAt: firebaseUser.metadata.creationTime
      ? new Date(firebaseUser.metadata.creationTime)
      : new Date(),
    updatedAt: new Date(),
    photoURL: firebaseUser.photoURL || undefined,
    phoneNumber: firebaseUser.phoneNumber || undefined,
  }
}

/**
 * Login with email and password using Firebase
 */
export async function loginWithEmail(email: string, password: string): Promise<AuthResponse> {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password)
    const user = transformFirebaseUser(userCredential.user)

    return {
      success: true,
      user,
    }
  } catch (error: any) {
    console.error('Login error:', error)

    let errorMessage = 'Failed to login'

    // Handle Firebase auth errors
    switch (error.code) {
      case 'auth/invalid-email':
        errorMessage = 'Invalid email address'
        break
      case 'auth/user-disabled':
        errorMessage = 'This account has been disabled'
        break
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        errorMessage = 'Invalid email or password'
        break
      case 'auth/too-many-requests':
        errorMessage = 'Too many failed attempts. Please try again later'
        break
      default:
        errorMessage = error.message || 'Failed to login'
    }

    return {
      success: false,
      error: errorMessage,
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

    let errorMessage = 'Failed to create account'

    // Handle Firebase auth errors
    switch (error.code) {
      case 'auth/email-already-in-use':
        errorMessage = 'Email already registered'
        break
      case 'auth/invalid-email':
        errorMessage = 'Invalid email address'
        break
      case 'auth/weak-password':
        errorMessage = 'Password is too weak'
        break
      default:
        errorMessage = error.message || 'Failed to create account'
    }

    return {
      success: false,
      error: errorMessage,
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

    let errorMessage = 'Failed to send reset email'

    // Handle Firebase auth errors
    switch (error.code) {
      case 'auth/invalid-email':
        errorMessage = 'Invalid email address'
        break
      case 'auth/user-not-found':
        errorMessage = 'No account found with this email'
        break
      default:
        errorMessage = error.message || 'Failed to send reset email'
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
    await signOut(auth)
  } catch (error) {
    console.error('Logout error:', error)
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
