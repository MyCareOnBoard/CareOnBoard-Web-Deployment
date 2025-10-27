import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import {
  loginWithEmail,
  registerWithEmail,
  sendPasswordResetEmail,
  logout as logoutUser,
  getCurrentUser,
  saveUserSession,
  clearUserSession,
  getIdToken,
  type User,
} from "./auth"

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, fullName: string) => Promise<void>
  logout: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
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
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      const currentUser = await getCurrentUser()
      setUser(currentUser)
      setLoading(false)
    }

    checkAuth()
  }, [])

  /**
   * Login user with email and password
   */
  const login = async (email: string, password: string) => {
    const response = await loginWithEmail(email, password)

    if (!response.success || !response.user) {
      throw new Error(response.error || "Login failed")
    }

    // Save session and update state
    saveUserSession(response.user)
    setUser(response.user)
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
    saveUserSession(response.user)
    setUser(response.user)
  }

  /**
   * Logout current user
   */
  const logout = async () => {
    await logoutUser()
    clearUserSession()
    setUser(null)
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
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
