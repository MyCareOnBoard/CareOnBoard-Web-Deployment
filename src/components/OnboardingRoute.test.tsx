import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { UserType } from '@/utils/auth/types/user.types'

const { getUser, hasEnrolledMfa } = vi.hoisted(() => ({
  getUser: vi.fn(),
  hasEnrolledMfa: vi.fn(),
}))

vi.mock('@/lib/api/users', () => ({ getUser }))
vi.mock('@/utils/auth/services/mfaService', () => ({ hasEnrolledMfa }))

vi.mock('@/lib/firebase', () => ({
  auth: {
    authStateReady: vi.fn().mockResolvedValue(undefined),
    currentUser: { uid: 'u1' },
  },
}))

vi.mock('react-redux', () => ({
  useSelector: vi.fn(() => null),
}))

vi.mock('./ui/loader', () => ({
  PageLoader: () => <div>Loading...</div>,
}))

import { OnboardingRoute } from './OnboardingRoute'

describe('OnboardingRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    hasEnrolledMfa.mockResolvedValue(false)
  })

  it('renders children for applicant without otpVerified', async () => {
    getUser.mockResolvedValue({
      uid: 'u1',
      userType: UserType.APPLICANT,
      otpVerified: false,
    })

    render(
      <MemoryRouter>
        <OnboardingRoute>
          <div>Onboarding content</div>
        </OnboardingRoute>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('Onboarding content')).toBeInTheDocument()
    })
  })

  it('redirects non-applicant to agency dashboard', async () => {
    getUser.mockResolvedValue({
      uid: 'u1',
      userType: UserType.AGENCY,
      otpVerified: true,
    })

    render(
      <MemoryRouter initialEntries={['/onboarding']}>
        <OnboardingRoute>
          <div>Onboarding content</div>
        </OnboardingRoute>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.queryByText('Onboarding content')).not.toBeInTheDocument()
    })
  })

  it('redirects applicant with otpVerified and no MFA to enroll', async () => {
    getUser.mockResolvedValue({
      uid: 'u1',
      userType: UserType.APPLICANT,
      otpVerified: true,
    })
    hasEnrolledMfa.mockResolvedValue(false)

    render(
      <MemoryRouter initialEntries={['/onboarding']}>
        <OnboardingRoute>
          <div>Onboarding content</div>
        </OnboardingRoute>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.queryByText('Onboarding content')).not.toBeInTheDocument()
    })
  })
})
