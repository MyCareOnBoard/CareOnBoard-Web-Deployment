/**
 * Auth Selectors
 * 
 * Redux selectors for accessing auth state
 */

import type { RootState } from '@/store/redux/store'

/**
 * Select the current user
 */
export const selectUser = (state: RootState) => state.auth.user

/**
 * Select authentication status
 */
export const selectIsAuthenticated = (state: RootState) => state.auth.isAuthenticated

/**
 * Select loading state
 */
export const selectIsLoading = (state: RootState) => state.auth.isLoading

/**
 * Select error state
 */
export const selectError = (state: RootState) => state.auth.error
