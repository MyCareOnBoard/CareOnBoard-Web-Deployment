import type { ReactNode } from 'react'
import { Navigate } from 'react-router'
import { useAuth } from '@/utils/auth'
import { PageLoader } from './ui/loader'
import { useRequireMfaEnrolled } from '@/hooks/useRequireMfaEnrolled'
import { auth } from '@/lib/firebase'
import { Routes } from '@/routes/constants'

interface ProtectedRouteProps {
  children: ReactNode
}

/**
 * Requires Firebase session + enrolled SMS MFA.
 * Onboarding email OTP (VerifyOTP) is separate and runs after MFA.
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const { ready: mfaReady } = useRequireMfaEnrolled()

  if (loading || !mfaReady) {
    return <PageLoader text="Checking authentication..." />
  }

  if (!auth.currentUser) {
    return <Navigate to={Routes.auth.login} replace />
  }

  if (!user) {
    return <PageLoader text="Loading your profile..." />
  }

  return <>{children}</>
}
