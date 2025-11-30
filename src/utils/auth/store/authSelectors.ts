/**
 * Auth Selectors
 * 
 * Redux selectors for accessing auth state
 */

import type { RootState } from '@/store/redux/store'

/**
 * Select the current user
 */
export const selectUser = (state: RootState) => state.auth?.user ?? null

/**
 * Select authentication status
 */
export const selectIsAuthenticated = (state: RootState) => state.auth?.isAuthenticated ?? false

/**
 * Select loading state
 */
export const selectIsLoading = (state: RootState) => state.auth?.isLoading ?? false

/**
 * Select error state
 */
export const selectError = (state: RootState) => state.auth?.error ?? null

/**
 * Select user profile
 */
export const selectProfile = (state: RootState) => state.auth?.profile ?? null