/**
 * Auth Feature Barrel Export
 * 
 * Central export point for auth-related functionality
 */

// Types
export type { User, AuthState, LoginCredentials, SignupCredentials } from './types'

// Store
export { default as authReducer } from './store/authSlice'
export * from './store/authSlice'
export * from './store/authSelectors'

// Services
export * from './services/authService'
export { 
  loginWithEmail, 
  registerWithEmail, 
  sendPasswordResetEmail,
  logout,
  getCurrentUser,
  getIdToken,
  saveUserSession,
  clearUserSession
} from './services/firebase-auth'

// Helpers
export {
  getAuthErrorMessage,
  getSuccessMessage,
  getValidationMessage,
  isNetworkError,
  requiresReauth,
  isExpiredActionCode,
  AUTH_SUCCESS_MESSAGES,
  VALIDATION_MESSAGES
} from './helpers/errorMessages'

// Hooks
export * from './hooks'

// Context
export * from './context/AuthContext'
