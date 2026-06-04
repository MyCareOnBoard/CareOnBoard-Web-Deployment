import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { useRequireMfaEnrolled } from './useRequireMfaEnrolled'
import { Routes } from '@/routes/constants'

const navigate = vi.fn()
const hasEnrolledMfa = vi.fn()

vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router')
  return { ...actual, useNavigate: () => navigate }
})

vi.mock('@/lib/firebase', () => ({
  auth: {
    authStateReady: vi.fn().mockResolvedValue(undefined),
    currentUser: { uid: 'u1' },
  },
}))

vi.mock('@/utils/auth/services/mfaService', () => ({
  hasEnrolledMfa: (...args: unknown[]) => hasEnrolledMfa(...args),
}))

function wrapper({ children }: { children: React.ReactNode }) {
  return <MemoryRouter>{children}</MemoryRouter>
}

describe('useRequireMfaEnrolled', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    hasEnrolledMfa.mockResolvedValue(true)
  })

  it('sets ready when user is enrolled', async () => {
    const { result } = renderHook(() => useRequireMfaEnrolled(), { wrapper })
    await waitFor(() => expect(result.current.ready).toBe(true))
    expect(navigate).not.toHaveBeenCalled()
  })

  it('redirects to mfa enroll when not enrolled', async () => {
    hasEnrolledMfa.mockResolvedValue(false)
    const { result } = renderHook(() => useRequireMfaEnrolled(), { wrapper })
    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith(Routes.auth.mfaEnroll, { replace: true })
    )
    expect(result.current.ready).toBe(false)
  })
})
