import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { Navigate } from 'react-router'
import { useSelector } from 'react-redux'
import { auth } from '@/lib/firebase'
import { Routes } from '@/routes/constants'
import { PageLoader } from './ui/loader'
import { getUser } from '@/lib/api/users'
import { UserType, type User } from '@/utils/auth/types/user.types'
import { getDashboardRouteForUserType } from '@/utils/auth/helpers/roleDashboard'
import { hasEnrolledMfa } from '@/utils/auth/services/mfaService'
import type { RootState } from '@/store/redux/store'

interface OnboardingRouteProps {
  children: ReactNode
}

function isApplicantProfile(profile: User | null | undefined): boolean {
  return profile?.userType === UserType.APPLICANT
}

/**
 * Onboarding-only guard: applicants only, Firebase session required, MFA after OTP.
 */
export function OnboardingRoute({ children }: OnboardingRouteProps) {
  const reduxUser = useSelector((state: RootState) => state.auth?.user)
  const [ready, setReady] = useState(false)
  const [redirectTo, setRedirectTo] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const check = async () => {
      setReady(false)
      setRedirectTo(null)
      await auth.authStateReady?.()

      if (cancelled) return

      if (!auth.currentUser) {
        setRedirectTo(Routes.auth.login)
        setReady(true)
        return
      }

      let profile: User | null = reduxUser?.uid === auth.currentUser.uid ? reduxUser : null
      if (!profile?.userType) {
        try {
          profile = await getUser()
        } catch {
          setRedirectTo(Routes.auth.login)
          setReady(true)
          return
        }
      }

      if (cancelled) return

      if (!isApplicantProfile(profile)) {
        setRedirectTo(
          getDashboardRouteForUserType((profile?.userType as UserType) ?? UserType.APPLICANT),
        )
        setReady(true)
        return
      }

      if (profile.otpVerified) {
        const enrolled = await hasEnrolledMfa(auth.currentUser)
        if (cancelled) return
        setRedirectTo(
          enrolled ? Routes.applicant.dashboard : Routes.auth.mfaEnroll,
        )
        setReady(true)
        return
      }

      setReady(true)
    }

    void check()
    return () => {
      cancelled = true
    }
  }, [reduxUser])

  if (!ready) {
    return <PageLoader text="Checking authentication..." />
  }

  if (redirectTo) {
    return <Navigate to={redirectTo} replace />
  }

  return <>{children}</>
}
