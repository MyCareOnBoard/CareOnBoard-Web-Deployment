import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { setUser } from "@/utils/auth"
import type { AppDispatch, RootState } from "@/store/redux/store"
import {
  loginWithEmail,
  registerWithEmail,
  sendPasswordResetEmail,
  logout as logoutUser,
  getIdToken,
  deleteCurrentUser,
} from "../services/authService"
import { createUser as createBackendUser } from "../api/client"
import { PageLoader } from "@/components/ui/loader"
import { auth } from "@/lib/firebase";
import type { User } from "../types/user.types"

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (
    email: string,
    password: string,
    fullName: string,
    agencyId?: string
  ) => Promise<void>
  logout: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  createUser: (fullName: string) => Promise<void>
  getToken: (forceRefresh?: boolean) => Promise<string | null>
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType)

/**
 * Hook to access authentication context
 * @returns Authentication context with user state and auth methods
 */
export const useAuth = () => useContext(AuthContext)

/**
 * Authentication Provider Component
 * Wraps the app to provide auth state to all components
 * Syncs with Redux for state persistence
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch<AppDispatch>()
  const reduxUser = useSelector((state: RootState) => state.auth?.user)
  const [user, setUserState] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    const initAuth = async () => {
      // Use onAuthStateChanged for reliable auth detection (auth.currentUser may not
      // be populated yet at component mount time on a fresh page load).
      const currentFirebaseUser = await new Promise<import('firebase/auth').User | null>(
        (resolve) => {
          const unsub = auth.onAuthStateChanged((u) => { unsub(); resolve(u); });
        }
      );

      if (reduxUser) {
        // Only reuse cached state when the Firebase session still belongs to the
        // same user.  A UID mismatch means stale data from a previous session.
        if (currentFirebaseUser && currentFirebaseUser.uid === reduxUser.uid) {
          setUserState(reduxUser)
          setIsInitialized(true)
          setLoading(false)
          return
        }
        // Stale cache — clear it so the correct user gets loaded below.
        dispatch(setUser(null))
      }

      if (currentFirebaseUser) {
        // We have a Firebase session but no matching Redux cache.
        // Set a minimal placeholder; the login page (or any protected page's
        // redirect-to-login → re-login flow) will dispatch the real profile.
        const user = {
          uid: currentFirebaseUser.uid,
          email: currentFirebaseUser.email || '',
          fullName: currentFirebaseUser.displayName || '',
          emailVerified: currentFirebaseUser.emailVerified,
          createdAt: currentFirebaseUser.metadata.creationTime
            ? new Date(currentFirebaseUser.metadata.creationTime)
            : new Date(),
          updatedAt: new Date(),
          photoURL: currentFirebaseUser.photoURL || undefined,
          phoneNumber: currentFirebaseUser.phoneNumber || undefined,
          userType: 'applicant' as any,
        }
        setUserState(user)
        // Do NOT dispatch to Redux here — avoid persisting 'applicant' as the
        // real type.  The login page dispatches the real profile after getUser().
      }

      setIsInitialized(true)
      setLoading(false)
    }

    initAuth()
  }, []) // Only run once on mount

  // Sync local state when Redux state changes (after login/signup)
  useEffect(() => {
    if (isInitialized) {
      setUserState(reduxUser ?? null)
    }
  }, [reduxUser, isInitialized])

  /**
   * Login user with email and password
   */
  const login = async (email: string, password: string) => {
    const response = await loginWithEmail(email, password)

    if (!response.success || !response.user) {
      console.error('[AuthContext] Login failed:', response.error)
      throw new Error(response.error || "Login failed")
    }

    // Update local React state only for immediate feedback.
    // The login page dispatches the real user (with correct userType from the
    // backend) to Redux after calling getUser() — so we never persist the
    // 'applicant' placeholder to redux-persist.
    setUserState(response.user)
  }

  /**
   * Register new user
   */
  const signup = async (
    email: string,
    password: string,
    fullName: string,
    agencyId?: string
  ) => {
    const response = await registerWithEmail(fullName, email, password)

    if (!response.success || !response.user) {
      console.error('[AuthContext] Signup failed:', response.error)
      throw new Error(response.error || "Registration failed")
    }

    // Create user in backend FIRST (before updating state so presence/heartbeat don't run)
    try {
      await createBackendUser(fullName, agencyId)
    } catch (error: any) {
      console.error('[signup] Failed to create user in backend:', error)
      try {
        await deleteCurrentUser()
      } catch (deleteErr: any) {
        console.error('[signup] Failed to remove Firebase user after backend error:', deleteErr)
      }
      throw error
    }

    // Update local state and Redux AFTER backend user is created
    setUserState(response.user)
    dispatch(setUser(response.user))
  }

  /**
   * Create user in backend
   */
  const createUser = async (fullName: string) => {
    try {
      await createBackendUser(fullName)
    } catch (error: any) {
      console.error('[createUser] Failed to create user in backend:', error)
      throw error
    }
  }

  /**
   * Logout current user
   */
  const logout = async () => {
    await logoutUser()
    setUserState(null)
    dispatch(setUser(null))
  }

  /**
   * Send password reset email
   */
  const resetPassword = async (email: string) => {
    const response = await sendPasswordResetEmail(email)

    if (!response.success) {
      throw new Error(response.error || "Failed to send reset email")
    }
  }

  /**
   * Get Firebase ID token for backend authentication
   */
  const getToken = async (forceRefresh = false) => {
    return await getIdToken(forceRefresh)
  }

  const value = {
    user,
    loading,
    login,
    signup,
    logout,
    resetPassword,
    getToken,
    createUser,
  }

  // Show loader while checking auth state
  if (loading) {
    return <PageLoader text="Checking authentication..." />
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
