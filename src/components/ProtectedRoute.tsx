import { useState, type ReactNode } from 'react'
import { Navigate } from 'react-router'
import { useAuth } from '@/utils/auth'
import { PageLoader } from './ui/loader'
import { useRequireMfaEnrolled } from '@/hooks/useRequireMfaEnrolled'
import { auth } from '@/lib/firebase'
import { Routes } from '@/routes/constants'
import { UserType } from '@/utils/auth/types/user.types'
import { AgencyCareEmailVerification } from '@/utils/auth/components/AgencyCareEmailVerification'

interface ProtectedRouteProps {
  children: ReactNode
  allowAgencyCare?: boolean
}

/**
 * Requires Firebase session + enrolled SMS MFA.
 * Applicants complete onboarding (incl. email OTP) before MFA; other roles require MFA here.
 */
export function ProtectedRoute({ children, allowAgencyCare = false }: ProtectedRouteProps) {
  const [, refreshEmail] = useState(0)
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

  if (user.userType === UserType.AGENCY_CARE && !allowAgencyCare) {
    return <Navigate to="/agency-care" replace />
  }

  if (allowAgencyCare && !auth.currentUser.emailVerified) {
    return <AgencyCareEmailVerification key={auth.currentUser.uid} onVerified={() => refreshEmail(value => value + 1)} />
  }

  return <>{children}</>
}
