/**
 * Auth Redux Slice
 * 
 * Manages authentication state in Redux store
 */

import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  type User as FirebaseUser,
} from 'firebase/auth'
import { auth } from '@/lib/firebase'
import type { AuthState, LoginCredentials, SignupCredentials } from '../types'
import { transformFirebaseUser } from '@/utils/auth'
import type { User } from '../types/user.types'

// Initial state
const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
}

/**
 * Login async thunk
 */
export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials: LoginCredentials, { rejectWithValue }) => {
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        credentials.email,
        credentials.password
      )
      const user = transformFirebaseUser(userCredential.user)
      return user
    } catch (error: any) {
      return rejectWithValue(error.message || 'Login failed')
    }
  }
)

/**
 * Signup async thunk
 */
export const signupUser = createAsyncThunk(
  'auth/signup',
  async (credentials: SignupCredentials, { rejectWithValue }) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        credentials.email,
        credentials.password
      )

      // Update profile with display name
      await updateProfile(userCredential.user, {
        displayName: credentials.fullName,
      })

      const user = transformFirebaseUser(userCredential.user)
      // Update name since we just set it
      user.fullName = credentials.fullName

      return user
    } catch (error: any) {
      return rejectWithValue(error.message || 'Signup failed')
    }
  }
)

/**
 * Logout async thunk
 */
export const logoutUser = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await signOut(auth)
    } catch (error: any) {
      return rejectWithValue(error.message || 'Logout failed')
    }
  }
)

/**
 * Reset password async thunk
 */
export const resetPassword = createAsyncThunk(
  'auth/resetPassword',
  async (email: string, { rejectWithValue }) => {
    try {
      await firebaseSendPasswordResetEmail(auth, email)
    } catch (error: any) {
      return rejectWithValue(error.message || 'Password reset failed')
    }
  }
)

/**
 * Check auth state async thunk
 */
export const checkAuthState = createAsyncThunk(
  'auth/checkState',
  async (_, { rejectWithValue }) => {
    return new Promise<User | null>((resolve) => {
      const unsubscribe = auth.onAuthStateChanged(
        (firebaseUser: FirebaseUser | null) => {
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

// Create slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    },
    setUser: (state, action: PayloadAction<User | null>) => {
      state.user = action.payload
      state.isAuthenticated = !!action.payload
    },
    /**
     * Update user profile data in Redux state
     * Saves profile data ONLY in the nested profile sub-object
     * Matches /userProfile/account-info response structure
     */
    updateUserProfile: (state, action: PayloadAction<{
      fullName?: string
      email?: string
      profilePicture?: string
      dateOfBirth?: string
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
      professionalSummary?: string
      gender?: string
    }>) => {
      if (state.user) {
        // Update ONLY the profile sub-object, not top-level fields
        state.user.profile = {
          ...state.user.profile,
          ...action.payload,
        }
      }
    }
  },
  extraReducers: (builder) => {
    // Login
    builder
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false
        state.user = action.payload
        state.isAuthenticated = true
        state.error = null
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })

    // Signup
    builder
      .addCase(signupUser.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(signupUser.fulfilled, (state, action) => {
        state.isLoading = false
        state.user = action.payload
        state.isAuthenticated = true
        state.error = null
      })
      .addCase(signupUser.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })

    // Logout
    builder
      .addCase(logoutUser.pending, (state) => {
        state.isLoading = true
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.isLoading = false
        state.user = null
        state.isAuthenticated = false
        state.error = null
      })
      .addCase(logoutUser.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })

    // Reset password
    builder
      .addCase(resetPassword.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(resetPassword.fulfilled, (state) => {
        state.isLoading = false
        state.error = null
      })
      .addCase(resetPassword.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })

    // Check auth state
    builder
      .addCase(checkAuthState.fulfilled, (state, action) => {
        state.user = action.payload
        state.isAuthenticated = !!action.payload
        state.isLoading = false
      })
  },
})

export const { clearError, setUser, updateUserProfile } = authSlice.actions
export default authSlice.reducer
