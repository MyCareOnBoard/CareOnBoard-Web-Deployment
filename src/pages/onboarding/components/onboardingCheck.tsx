import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router'
import { getOnboardingStatus } from '@/lib/api/onboarding'
import { getAuth } from 'firebase/auth'
import { Routes } from '@/routes/constants'

interface OnboardingCheckProps {
  children: React.ReactNode
}

/**
 * Component that checks if user needs to see onboarding
 * Redirects to onboarding if not completed
 */
export function OnboardingCheck({ children }: OnboardingCheckProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    checkOnboardingStatus()
  }, [])

  const checkOnboardingStatus = async () => {
    try {
      // Don't check if already on onboarding pages or auth pages
      const isOnboardingPage = location.pathname.startsWith('/onboarding')
      const isAuthPage = [
        Routes.auth.login,
        Routes.auth.signup,
        Routes.auth.forgotPassword,
        Routes.auth.resetPassword
      ].includes(location.pathname)
      
      if (isOnboardingPage || isAuthPage) {        setChecking(false)
        return
      }

      // Check if user is authenticated
      const auth = getAuth()
      await auth.authStateReady?.()
      const currentUser = auth.currentUser

      if (!currentUser) {        setChecking(false)
        return
      }
      // Get onboarding status from API
      const status = await getOnboardingStatus()
      if (!status.completed) {        navigate(Routes.onboarding.index, { replace: true })
      } else {        setChecking(false)
      }
    } catch (error) {      // On error, allow access (fail open to prevent blocking users)
      setChecking(false)
    }
  }

  // Show loading screen while checking
  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#eef4f5]">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 border-2 border-gray-300 rounded-full animate-spin border-t-[#00B4B8]"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}