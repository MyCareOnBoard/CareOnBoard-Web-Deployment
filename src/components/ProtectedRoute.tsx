import { Navigate } from "react-router"
import { useAuth } from "@/features/auth"
import { PageLoader } from "./ui/loader"

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

  if (loading) {
    return <PageLoader text="Checking authentication..." />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
