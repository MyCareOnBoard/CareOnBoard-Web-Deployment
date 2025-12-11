import { Navigate } from "react-router"
import { useAuth } from "@/utils/auth"
import { useSelector } from "react-redux"
import type { RootState } from "@/store/redux/store"
import { PageLoader } from "./ui/loader"
import { useEffect } from "react"
import {Routes} from "@/routes/constants";

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

  if (loading) {
    return <PageLoader text="Checking authentication..." />
  }

  if (!user) {
    return <Navigate to={Routes.auth.login} replace />
  }

  return <>{children}</>
}
