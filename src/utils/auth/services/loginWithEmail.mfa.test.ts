import { describe, expect, it, vi, beforeEach } from 'vitest'

const { signInWithEmailAndPassword, hasEnrolledMfa, storeMfaResolver } = vi.hoisted(() => ({
  signInWithEmailAndPassword: vi.fn(),
  hasEnrolledMfa: vi.fn(),
  storeMfaResolver: vi.fn(),
}))

vi.mock('@/lib/firebase', () => ({
  auth: {},
}))

vi.mock('firebase/auth', () => ({
  signInWithEmailAndPassword,
}))

vi.mock('@/utils/auth/services/mfaService', () => ({
  hasEnrolledMfa,
  storeMfaResolver,
}))

import { loginWithEmail } from './authService'

describe('loginWithEmail MFA branching', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    storeMfaResolver.mockResolvedValue(false)
  })

  it('returns mfa_enrollment_required when user has no enrolled factors', async () => {
    signInWithEmailAndPassword.mockResolvedValue({
      user: { uid: 'u1', email: 'a@b.com', emailVerified: true, metadata: {} },
    })
    hasEnrolledMfa.mockResolvedValue(false)

    const result = await loginWithEmail('a@b.com', 'pass')
    expect(result.status).toBe('mfa_enrollment_required')
    if (result.status === 'mfa_enrollment_required') {
      expect(result.user.uid).toBe('u1')
    }
  })

  it('returns success when MFA is enrolled', async () => {
    signInWithEmailAndPassword.mockResolvedValue({
      user: { uid: 'u1', email: 'a@b.com', emailVerified: true, metadata: {} },
    })
    hasEnrolledMfa.mockResolvedValue(true)

    const result = await loginWithEmail('a@b.com', 'pass')
    expect(result.status).toBe('success')
  })

  it('returns mfa_required when resolver is stored from error', async () => {
    signInWithEmailAndPassword.mockRejectedValue({ code: 'auth/multi-factor-auth-required' })
    storeMfaResolver.mockResolvedValue(true)

    const result = await loginWithEmail('a@b.com', 'pass')
    expect(result).toEqual({ status: 'mfa_required' })
  })

  it('returns error for other failures', async () => {
    signInWithEmailAndPassword.mockRejectedValue({ code: 'auth/wrong-password' })
    storeMfaResolver.mockResolvedValue(false)

    const result = await loginWithEmail('a@b.com', 'pass')
    expect(result.status).toBe('error')
  })
})
