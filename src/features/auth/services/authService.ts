/**
 * Auth Service
 * 
 * Helper functions for authentication operations with Redux
 */

import { createAsyncThunk } from '@reduxjs/toolkit'
import { auth } from '@/lib/firebase'
import type { User as FirebaseUser } from 'firebase/auth'
import type { User } from '../types'

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
          resolve(null)
        }
      )
    })
  }
)
