import { Navigate } from "react-router"
import { useAuth } from "@/utils/auth"
import { useSelector } from "react-redux"
import type { RootState } from "@/store/redux/store"
import { PageLoader } from "./ui/loader"
import { useEffect } from "react"

interface ProtectedRouteProps {
  children: React.ReactNode
}

/**
 * ProtectedRoute Component
 * Wraps routes that require authentication
 * Redirects to login if user is not authenticated
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const reduxUser = useSelector((state: RootState) => state.auth?.user)

  useEffect(() => {
    console.log('[ProtectedRoute] Auth check:', { 
      user: user?.email, 
      loading,
      reduxUser: reduxUser?.email 
    })
  }, [user, loading, reduxUser])

  if (loading) {
    console.log('[ProtectedRoute] Still loading...')
    return <PageLoader text="Checking authentication..." />
  }

  if (!user) {
    console.log('[ProtectedRoute] No user, redirecting to login')
    return <Navigate to="/login" replace />
  }

  console.log('[ProtectedRoute] User authenticated, rendering protected content')
  return <>{children}</>
}
