import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { loginUser, signupUser, logoutUser as logoutRedux, setUser } from "../store/authSlice"
import type { AppDispatch, RootState } from "@/store/redux/store"
import {
  loginWithEmail,
  registerWithEmail,
  sendPasswordResetEmail,
  logout as logoutUser,
  getCurrentUser,
  // saveUserSession,
  // clearUserSession,
  getIdToken,
  type AuthResponse,
} from "../services/authService"
import type { User } from "../types"
import { createUser as createBackendUser } from "../api/client"
import { PageLoader } from "@/components/ui/loader"

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, fullName: string) => Promise<void>
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
  const reduxUser = useSelector((state: RootState) => state.auth.user)
  const [user, setUserState] = useState<User | null>(reduxUser)
  const [loading, setLoading] = useState(true)

  // Check for existing session on mount and sync with Redux
  useEffect(() => {
    const checkAuth = async () => {
      const currentUser = await getCurrentUser()
      if (currentUser) {
        setUserState(currentUser)
        dispatch(setUser(currentUser))
      }
      setLoading(false)
    }

    checkAuth()
  }, [dispatch])

  // Sync local state with Redux state
  useEffect(() => {
    setUserState(reduxUser)
  }, [reduxUser])

  /**
   * Login user with email and password
   */
  const login = async (email: string, password: string) => {
    const response = await loginWithEmail(email, password)

    if (!response.success || !response.user) {
      throw new Error(response.error || "Login failed")
    }

    // Save session and update state
    // saveUserSession(response.user)
    setUserState(response.user)
    dispatch(setUser(response.user))
  }

  /**
   * Register new user
   */
  const signup = async (email: string, password: string, fullName: string) => {
    const response = await registerWithEmail(fullName, email, password)

    if (!response.success || !response.user) {
      throw new Error(response.error || "Registration failed")
    }

    // Save session and update state
    // saveUserSession(response.user)
    setUserState(response.user)
    dispatch(setUser(response.user))
    
    // Create user in backend
    try {
      await createBackendUser(fullName)
      console.log('[signup] User created in backend successfully')
    } catch (error: any) {
      console.error('[signup] Failed to create user in backend:', error)
      // Don't throw - Firebase account is already created, just log the error
    }
  }

  /**
   * Create user in backend
   */
  const createUser = async (fullName: string) => {
    try {
      await createBackendUser(fullName)
      console.log('[createUser] User created in backend successfully')
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
    // clearUserSession()
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
