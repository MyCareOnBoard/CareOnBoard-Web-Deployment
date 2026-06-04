import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { auth } from '@/lib/firebase'
import { Routes } from '@/routes/constants'
import { hasEnrolledMfa } from '@/utils/auth/services/mfaService'

/**
 * Redirects unauthenticated users to login and users without SMS MFA to enroll.
 * Use only in dashboard/onboarding layouts — not on /auth/* routes.
 */
export function useRequireMfaEnrolled() {
  const navigate = useNavigate()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    const check = async () => {
      setReady(false)
      await auth.authStateReady?.()

      if (cancelled) return

      const current = auth.currentUser
      if (!current) {
        navigate(Routes.auth.login, { replace: true })
        return
      }

      const enrolled = await hasEnrolledMfa(current)
      if (cancelled) return

      if (!enrolled) {
        navigate(Routes.auth.mfaEnroll, { replace: true })
        return
      }

      setReady(true)
    }

    void check()
    return () => {
      cancelled = true
    }
  }, [navigate])

  return { ready }
}
