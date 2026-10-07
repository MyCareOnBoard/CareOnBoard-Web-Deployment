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

  it('routes authoritative limited accounts without applicant onboarding requests', async () => {
    getUser.mockResolvedValue({ uid: 'partner-1', userType: 'agency_care' })
    getOnboardingStatus.mockRejectedValue(new Error('External accounts cannot use applicant APIs'))

    await completePostLogin(dispatch as never, navigate, toast)

    expect(getOnboardingStatus).not.toHaveBeenCalled()
    expect(navigate).toHaveBeenCalledWith('/agency-care', { replace: true })
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ payload: expect.objectContaining({ uid: 'partner-1', userType: 'agency_care' }) }))
  })

  it('preserves an internal identity while continuing a care invitation', async () => {
    getUser.mockResolvedValue({ uid: 'provider-1', userType: UserType.EMPLOYEE })
    await completePostLogin(dispatch as never, navigate, toast, '/agency-care/invitations/token?intent=login')
    expect(getOnboardingStatus).toHaveBeenCalledOnce()
    expect(navigate).toHaveBeenCalledWith('/agency-care/invitations/token?intent=login', { replace: true })
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ payload: expect.objectContaining({ uid: 'provider-1', userType: UserType.EMPLOYEE }) }))
  })

  it.each(['https://example.test/agency-care', '//example.test/agency-care', '/agency/dashboard', '/agency-care/../agency', '/agency-care/%2e%2e/agency'])('rejects unsafe continuation %s', async (returnTo) => {
    getUser.mockResolvedValue({ userType: 'agency_care' })
    await completePostLogin(dispatch as never, navigate, toast, returnTo)
    expect(navigate).toHaveBeenCalledWith('/agency-care', { replace: true })
  })
})
