import type React from "react"
import { createContext, useContext, useEffect, useRef, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import type { AppDispatch, RootState } from "@/store/redux/store"
import { persistor } from "@/store/redux/store"
import type { LoginResponse } from "../services/authService"
import { logoutUser, setUser } from "../store/authSlice"
import type { LoginResult } from "../types/login.types"
import { PageLoader } from "@/components/ui/loader"
import { auth } from "@/lib/firebase";
import { clearAuthCache } from "@/lib/axios";
import { getUser } from "@/lib/api/users";
import { clearMfaResolverSession } from "../services/mfaSessionStore";
import type { User } from "../types/user.types"
import { checkPayrollApi } from "@/features/payroll/api/checkPayrollApi"
import { clearPayrollOnboardSessions } from "@/features/payroll/onboard/payrollOnboardSession"

function removeStoredUserData(): void {
  try {
    localStorage.removeItem("auth_user")
  } catch (error) {
    console.error("Failed to remove user data:", error)
  }
}
const accountChangedError = () => Object.assign(new Error('Your signed-in account changed. Continue with the current account.'), { code: 'auth/account-changed' })

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<LoginResult>
  signup: (
    email: string,
    password: string,
    fullName: string,
    agencyId?: string,
    applicantType?: string
  ) => Promise<void>
  logout: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  createUser: (fullName: string) => Promise<void>
  getToken: (forceRefresh?: boolean) => Promise<string | null>
  refreshProfile: () => Promise<User | null>
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
  const initializedRef = useRef(false)
  const refreshGenerationRef = useRef(0)
  const firebaseUidRef = useRef<string | null>(auth.currentUser?.uid ?? null)

  useEffect(() => {
    let cancelled = false
    const restoreProfile = async (currentFirebaseUser: import('firebase/auth').User | null) => {
      const generation = ++refreshGenerationRef.current
      // A persisted role is not authority for mounting product layouts.
      if (!initializedRef.current || firebaseUidRef.current !== currentFirebaseUser?.uid) {
        clearAuthCache()
        setUserState(null)
        dispatch(setUser(null))
        clearPayrollOnboardSessions()
        dispatch(checkPayrollApi.util.resetApiState())
      }
      firebaseUidRef.current = currentFirebaseUser?.uid ?? null
      const stillCurrent = () => !cancelled && refreshGenerationRef.current === generation
        && (auth.currentUser?.uid ?? null) === (currentFirebaseUser?.uid ?? null)
      if (currentFirebaseUser) {
        try {
          const authoritativeUser = await getUser()
          if (stillCurrent() && authoritativeUser?.uid === currentFirebaseUser.uid) {
            setUserState(authoritativeUser)
            dispatch(setUser(authoritativeUser))
          }
        } catch {
          // Auth and enrollment pages remain available; cached product access stays cleared.
          if (stillCurrent()) setUserState(null)
        }
      }
      if (!stillCurrent()) return
      initializedRef.current = true
      setLoading(false)
    }
    const unsubscribe = auth.onAuthStateChanged(current => { void restoreProfile(current) })
    return () => { cancelled = true; unsubscribe() }
  }, [dispatch])
  // Sync local state when Redux state changes (after login/signup)
  useEffect(() => {
    if (initializedRef.current && (!reduxUser || reduxUser.uid === auth.currentUser?.uid)) {
      setUserState(reduxUser ?? null)
    }
  }, [reduxUser])

  /**
   * Login user with email and password
   */
  const login = async (email: string, password: string): Promise<LoginResult> => {
    const { loginWithEmail } = await import("../services/authService")
    const response: LoginResponse = await loginWithEmail(email, password)

    if (response.status === 'error') {
      console.error('[AuthContext] Login failed:', response.error)
      throw new Error(response.error || "Login failed")
    }
    if ('user' in response && response.user.uid !== auth.currentUser?.uid) throw accountChangedError()

    if (response.status === 'success') {
      setUserState(response.user)
    }

    return response
  }

  /**
   * Register new user
   */
  const signup = async (
    email: string,
    password: string,
    fullName: string,
    agencyId?: string,
    applicantType?: string
  ) => {
    const { registerWithEmail } = await import("../services/authService")
    const response = await registerWithEmail(fullName, email, password)

    if (!response.success || !response.user) {
      console.error('[AuthContext] Signup failed:', response.error)
      throw new Error(response.error || "Registration failed")
    }
    const registeredUid = response.user.uid
    if (registeredUid !== auth.currentUser?.uid) throw accountChangedError()

    // Create user in backend FIRST (before updating state so presence/heartbeat don't run)
    try {
      const { createUser: createBackendUser } = await import("../api/client")
      if (registeredUid !== auth.currentUser?.uid) throw accountChangedError()
      await createBackendUser(fullName, agencyId, applicantType)
      if (registeredUid !== auth.currentUser?.uid) throw accountChangedError()
      const { reload } = await import("firebase/auth")
      const registeredUser = auth.currentUser
      if (registeredUser?.uid !== registeredUid) throw accountChangedError()
      await reload(registeredUser)
    } catch (error: any) {
      if (registeredUid !== auth.currentUser?.uid || error?.code === 'auth/account-changed') throw accountChangedError()
      console.error('[signup] Failed to create user in backend:', error)
      try {
        const { deleteCurrentUser } = await import("../services/authService")
        if (registeredUid !== auth.currentUser?.uid) throw accountChangedError()
        await deleteCurrentUser()
      } catch (deleteErr: any) {
        if (deleteErr?.code === 'auth/account-changed') throw deleteErr
        console.error('[signup] Failed to remove Firebase user after backend error:', deleteErr)
      }
      throw error
    }

    // Update local state and Redux AFTER backend user is created
    if (registeredUid !== auth.currentUser?.uid) throw accountChangedError()
    setUserState(response.user)
    dispatch(setUser(response.user))
  }

  /**
   * Create user in backend
   */
  const createUser = async (fullName: string) => {
    try {
      const { createUser: createBackendUser } = await import("../api/client")
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
    refreshGenerationRef.current += 1
    clearMfaResolverSession()
    const { clearRecaptchaVerifier } = await import('@/utils/auth/services/mfaService')
    clearRecaptchaVerifier()
    await dispatch(logoutUser())  // Firebase signOut + triggers root reducer reset (clears all RTK Query caches)
    clearAuthCache()
    removeStoredUserData()
    await persistor.purge()       // clears redux-persist localStorage keys (auth + agencyMode)
    setUserState(null)
  }

  /**
   * Send password reset email
   */
  const resetPassword = async (email: string) => {
    const { sendPasswordResetEmail } = await import("../services/authService")
    const response = await sendPasswordResetEmail(email)

    if (!response.success) {
      throw new Error(response.error || "Failed to send reset email")
    }
  }

  /**
   * Get Firebase ID token for backend authentication
   */
  const getToken = async (forceRefresh = false) => {
    const { getIdToken } = await import("../services/authService")
    return await getIdToken(forceRefresh)
  }

  const refreshProfile = async (): Promise<User | null> => {
    const startingUid = auth.currentUser?.uid
    if (!startingUid) return null

    const refreshGeneration = refreshGenerationRef.current + 1
    refreshGenerationRef.current = refreshGeneration
    const nextUser = await getUser()

    if (
      auth.currentUser?.uid !== startingUid ||
      refreshGenerationRef.current !== refreshGeneration
    ) {
      return null
    }
    if (nextUser.uid !== startingUid) throw accountChangedError()

    if (user?.uid && user.uid !== nextUser.uid) {
      clearPayrollOnboardSessions()
      dispatch(checkPayrollApi.util.resetApiState())
    }

    setUserState(nextUser)
    dispatch(setUser(nextUser))
    return nextUser
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
    refreshProfile,
  }

  // Show loader while checking auth state
  if (loading) {
    return <PageLoader text="Checking authentication..." />
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
