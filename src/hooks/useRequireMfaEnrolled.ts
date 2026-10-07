import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { auth } from '@/lib/firebase'
import { Routes } from '@/routes/constants'
import { hasEnrolledMfa } from '@/utils/auth/services/mfaService'
import { agencyCareReturnTo, authRouteWithReturnTo } from '@/utils/auth/helpers/agencyCareReturnTo'

/**
 * Redirects unauthenticated users to login and users without SMS MFA to enroll.
 * Use only in dashboard/onboarding layouts — not on /auth/* routes.
 */
export function useRequireMfaEnrolled() {
  const navigate = useNavigate()
  const location = useLocation()
  const returnTo = agencyCareReturnTo(`${location.pathname}${location.search}`)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    const check = async () => {
      setReady(false)
      await auth.authStateReady?.()

      if (cancelled) return

      const current = auth.currentUser
      if (!current) {
        navigate(authRouteWithReturnTo(Routes.auth.login, returnTo), { replace: true })
        return
      }

      const enrolled = await hasEnrolledMfa(current)
      if (cancelled) return

      if (!enrolled) {
        navigate(authRouteWithReturnTo(Routes.auth.mfaEnroll, returnTo), { replace: true })
        return
      }

      setReady(true)
    }

    void check()
    return () => {
      cancelled = true
    }
  }, [navigate, returnTo])

  return { ready }
}
