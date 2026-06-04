import { describe, expect, it, vi, beforeEach } from 'vitest'
import { UserType } from '../types/user.types'
import { Routes } from '@/routes/constants'

const { getUser, getOnboardingStatus } = vi.hoisted(() => ({
  getUser: vi.fn(),
  getOnboardingStatus: vi.fn(),
}))

vi.mock('@/lib/api/users', () => ({ getUser }))
vi.mock('@/lib/api/onboarding', () => ({ getOnboardingStatus }))

import { completePostLogin } from './postLogin'

const navigate = vi.fn()
const dispatch = vi.fn()
const toast = vi.fn()

describe('completePostLogin applicant routing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getOnboardingStatus.mockResolvedValue({ completed: true })
  })

  it('sends applicant without otpVerified to onboarding', async () => {
    getUser.mockResolvedValue({
      userType: UserType.APPLICANT,
      otpVerified: false,
      onboardingCompleted: true,
    })

    await completePostLogin(dispatch as never, navigate, toast)

    expect(navigate).toHaveBeenCalledWith(Routes.onboarding.index, { replace: true })
  })

  it('sends applicant with otpVerified to dashboard', async () => {
    getUser.mockResolvedValue({
      userType: UserType.APPLICANT,
      otpVerified: true,
      onboardingCompleted: false,
    })

    await completePostLogin(dispatch as never, navigate, toast)

    expect(navigate).toHaveBeenCalledWith(Routes.applicant.dashboard, { replace: true })
  })
})
