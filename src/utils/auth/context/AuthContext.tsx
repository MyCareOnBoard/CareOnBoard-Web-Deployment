import type React from "react"
import {createContext, useContext, useEffect, useState} from "react"
import {useDispatch, useSelector} from "react-redux"
import {setUser, setProfile, selectProfile} from "@/utils/auth"
import type {AppDispatch, RootState} from "@/store/redux/store"
import {
  loginWithEmail,
  registerWithEmail,
  sendPasswordResetEmail,
  logout as logoutUser,
  getIdToken,
} from "../services/authService"
import type {User} from "../types"
import {createUser as createBackendUser} from "../api/client"
import {PageLoader} from "@/components/ui/loader"
import {UserProfileResponse, UserProfile} from "@/lib/api/users";
import axiosClient from "@/lib/axios";
import {auth} from "@/lib/firebase";

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
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
export function AuthProvider({children}: { children: React.ReactNode }) {
  const dispatch = useDispatch<AppDispatch>()
  const reduxUser = useSelector((state: RootState) => state.auth?.user)
  const reduxProfile = useSelector(selectProfile)
  const [user, setUserState] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    const initAuth = async () => {

      try {
        const profile = await axiosClient.get<UserProfileResponse>("/users/profile");
        if (profile.data.success || profile.data.user) {
          dispatch(setProfile(profile.data.user))
        }
      } catch (error) {
        console.error('[AuthContext] Error fetching user profile:', error)
      }

      if (reduxUser) {
        setUserState(reduxUser)
        setIsInitialized(true)
        setLoading(false)
        return
      }

      // If no Redux user, check Firebase auth state synchronously
      const currentUser = auth.currentUser;
      if (currentUser) {
        const user = {
          uid: currentUser.uid,
          email: currentUser.email || '',
          fullName: currentUser.displayName || '',
          emailVerified: currentUser.emailVerified,
          createdAt: currentUser.metadata.creationTime
            ? new Date(currentUser.metadata.creationTime)
            : new Date(),
          updatedAt: new Date(),
          photoURL: currentUser.photoURL || undefined,
          phoneNumber: currentUser.phoneNumber || undefined,
        }
        setUserState(user)
        dispatch(setUser(user))
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
    console.log('[AuthContext] Login attempt for:', email)
    const response = await loginWithEmail(email, password)

    if (!response.success || !response.user) {
      console.error('[AuthContext] Login failed:', response.error)
      throw new Error(response.error || "Login failed")
    }

    console.log('[AuthContext] Login successful, updating state and Redux')
    console.log('[AuthContext] User object:', response.user)

    // Update local state and Redux
    setUserState(response.user)
    dispatch(setUser(response.user))

    console.log('[AuthContext] User dispatched to Redux')
  }

  /**
   * Register new user
   */
  const signup = async (email: string, password: string, fullName: string) => {
    console.log('[AuthContext] Signup attempt for:', email)
    const response = await registerWithEmail(fullName, email, password)

    if (!response.success || !response.user) {
      console.error('[AuthContext] Signup failed:', response.error)
      throw new Error(response.error || "Registration failed")
    }

    console.log('[AuthContext] Signup successful, updating state and Redux')
    console.log('[AuthContext] User object:', response.user)

    // Update local state and Redux
    setUserState(response.user)
    dispatch(setUser(response.user))

    console.log('[AuthContext] User dispatched to Redux')

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
    console.log('[AuthContext] Logging out user')
    await logoutUser()
    setUserState(null)
    dispatch(setUser(null))
    console.log('[AuthContext] User logged out, Redux cleared')
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
    profile: reduxProfile,
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
    return <PageLoader text="Checking authentication..."/>
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
