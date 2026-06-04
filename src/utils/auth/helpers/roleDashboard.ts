import { Routes } from '@/routes/constants'
import { UserType } from '@/utils/auth/types/user.types'

const dashboardRoutes: Record<UserType, string> = {
  [UserType.APPLICANT]: Routes.applicant.dashboard,
  [UserType.EMPLOYEE]: Routes.userPanel.dashboard,
  [UserType.AGENCY]: Routes.agency.dashboard,
  [UserType.AGENCY_STAFF]: Routes.agency.dashboard,
  [UserType.SUPER_ADMIN]: Routes.superAdmin.dashboard,
}

export function getDashboardRouteForUserType(userType: UserType): string {
  return dashboardRoutes[userType] ?? Routes.auth.login
}
