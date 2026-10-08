import { useEffect, useRef, useState } from 'react'
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
  const currentUser = auth.currentUser
  const returnTo = useRef<string | null>(null)
  returnTo.current = agencyCareReturnTo(`${location.pathname}${location.search}`)
  const redirect = useRef(navigate)
  redirect.current = navigate
  const [verifiedUser, setVerifiedUser] = useState<typeof currentUser>(null)

  useEffect(() => {
    let cancelled = false

    const check = async () => {
      setVerifiedUser(null)
      await auth.authStateReady?.()

      if (cancelled || auth.currentUser !== currentUser) return

      const current = auth.currentUser
      if (!current) {
        redirect.current(authRouteWithReturnTo(Routes.auth.login, returnTo.current), { replace: true })
        return
      }

      const enrolled = await hasEnrolledMfa(current)
      if (cancelled || auth.currentUser !== current) return

      if (!enrolled) {
        redirect.current(authRouteWithReturnTo(Routes.auth.mfaEnroll, returnTo.current), { replace: true })
        return
      }

      setVerifiedUser(current)
    }

    void check()
    return () => {
      cancelled = true
    }
  }, [currentUser])

  return { ready: currentUser !== null && verifiedUser === currentUser }
}
