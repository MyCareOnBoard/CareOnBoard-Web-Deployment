import { describe, expect, it } from 'vitest'
import { getDashboardRouteForUserType } from './roleDashboard'
import { UserType } from '@/utils/auth/types/user.types'
import { Routes } from '@/routes/constants'

describe('getDashboardRouteForUserType', () => {
  it('maps agency to agency dashboard', () => {
    expect(getDashboardRouteForUserType(UserType.AGENCY)).toBe(Routes.agency.dashboard)
  })

  it('maps applicant to applicant dashboard', () => {
    expect(getDashboardRouteForUserType(UserType.APPLICANT)).toBe(
      Routes.applicant.dashboard,
    )
  })
})
