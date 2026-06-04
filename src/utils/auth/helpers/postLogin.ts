import type { NavigateFunction } from 'react-router'
import type { AppDispatch } from '@/store/redux/store'
import { setUser } from '../store/authSlice'
import { getUser } from '@/lib/api/users'
import { getOnboardingStatus } from '@/lib/api/onboarding'
import { getSuccessMessage } from '@/utils/auth/helpers/errorMessages'
import { UserType } from '@/utils/auth/types/user.types'
import { Routes } from '@/routes/constants'
const dashboardRoutes: Record<UserType, string> = {
  [UserType.APPLICANT]: Routes.applicant.dashboard,
  [UserType.EMPLOYEE]: Routes.userPanel.dashboard,
  [UserType.AGENCY]: Routes.agency.dashboard,
  [UserType.AGENCY_STAFF]: Routes.agency.dashboard,
  [UserType.SUPER_ADMIN]: Routes.superAdmin.dashboard,
}

export type PostLoginToast = (opts: {
  title: string
  description?: string
  variant?: 'default' | 'destructive'
}) => void

/**
 * Completes login after password + MFA are satisfied.
 * Firebase onboarding email OTP is a separate step (VerifyOTP).
 */
export async function completePostLogin(
  dispatch: AppDispatch,
  navigate: NavigateFunction,
  toast: PostLoginToast
): Promise<void> {
  await getOnboardingStatus()

  const successMsg = getSuccessMessage('login')
  toast({
    title: successMsg.title,
    description: successMsg.description,
  })

  const user = await getUser()
  dispatch(setUser(user))

  if (user.userType !== UserType.APPLICANT) {
    navigate(dashboardRoutes[user.userType as UserType], { replace: true })
    return
  }

  if (user.onboardingCompleted) {
    navigate(dashboardRoutes[UserType.APPLICANT], { replace: true })
    return
  }

  navigate(Routes.onboarding.index, { replace: true })
}
