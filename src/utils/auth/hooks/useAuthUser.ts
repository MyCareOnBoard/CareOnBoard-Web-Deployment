/**
 * useAuthUser Hook
 * 
 * Custom hook to access the current authenticated user from Redux
 */

import { useAppSelector } from '@/store/redux/hooks'
import { selectUser, selectIsAuthenticated, selectIsLoading } from '../store/authSelectors'

/**
 * Hook to get current user and auth status
 */
export function useAuthUser() {
  const user = useAppSelector(selectUser)
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  const isLoading = useAppSelector(selectIsLoading)

  return {
    user,
    isAuthenticated,
    isLoading,
  }
}
