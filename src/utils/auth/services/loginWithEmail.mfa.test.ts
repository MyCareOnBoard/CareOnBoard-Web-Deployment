import { describe, expect, it, vi, beforeEach } from 'vitest'

const { signInWithEmailAndPassword, hasEnrolledMfa, storeMfaResolver, getUser } =
  vi.hoisted(() => ({
    signInWithEmailAndPassword: vi.fn(),
    hasEnrolledMfa: vi.fn(),
    storeMfaResolver: vi.fn(),
    getUser: vi.fn(),
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

vi.mock('@/lib/api/users', () => ({
  getUser,
}))

import { loginWithEmail } from './authService'

describe('loginWithEmail MFA branching', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    storeMfaResolver.mockResolvedValue(false)
    getUser.mockRejectedValue(new Error('no profile'))
  })

  it('returns success for applicant without otpVerified without MFA check', async () => {
    signInWithEmailAndPassword.mockResolvedValue({
      user: {
        uid: 'u1',
        email: 'a@b.com',
        emailVerified: true,
        metadata: { creationTime: '2020-01-01' },
      },
    })
    getUser.mockResolvedValue({
      uid: 'u1',
      email: 'a@b.com',
      userType: 'applicant',
      otpVerified: false,
    })

    const result = await loginWithEmail('a@b.com', 'pass')
    expect(result.status).toBe('success')
    expect(hasEnrolledMfa).not.toHaveBeenCalled()
  })

  it('returns mfa_enrollment_required when user has no enrolled factors', async () => {
    signInWithEmailAndPassword.mockResolvedValue({
      user: { uid: 'u1', email: 'a@b.com', emailVerified: true, metadata: { creationTime: '2020-01-01' } },
    })
    getUser.mockResolvedValue({
      uid: 'u1',
      userType: 'agency',
      otpVerified: true,
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
      user: { uid: 'u1', email: 'a@b.com', emailVerified: true, metadata: { creationTime: '2020-01-01' } },
    })
    getUser.mockResolvedValue({
      uid: 'u1',
      userType: 'agency',
      otpVerified: true,
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

  it('returns error when profile load fails unexpectedly', async () => {
    signInWithEmailAndPassword.mockResolvedValue({
      user: {
        uid: 'u1',
        email: 'a@b.com',
        emailVerified: true,
        metadata: { creationTime: '2020-01-01' },
      },
    })
    getUser.mockRejectedValue({ response: { status: 500 }, message: 'Server error' })

    const result = await loginWithEmail('a@b.com', 'pass')
    expect(result.status).toBe('error')
    if (result.status === 'error') {
      expect(result.error).toContain('Server error')
    }
    expect(hasEnrolledMfa).not.toHaveBeenCalled()
  })

  it('returns error for other failures', async () => {
    signInWithEmailAndPassword.mockRejectedValue({ code: 'auth/wrong-password' })
    storeMfaResolver.mockResolvedValue(false)

    const result = await loginWithEmail('a@b.com', 'pass')
    expect(result.status).toBe('error')
  })

  it.each([
    { response: { status: 404 } },
    { response: { status: 401, data: { code: 'USER_PROFILE_NOT_FOUND' } } },
    { response: { status: 401, data: { error: 'Unauthorized - User not found' } } },
  ])('returns only the Firebase identity for a missing product profile: %j', async (error) => {
    signInWithEmailAndPassword.mockResolvedValue({
      user: { uid: 'external-1', email: 'external@example.com', metadata: { creationTime: '2020-01-01' } },
    })
    getUser.mockRejectedValue(error)

    expect(await loginWithEmail('external@example.com', 'secret')).toEqual({
      status: 'profile_required',
      uid: 'external-1',
    })
    expect(getUser).toHaveBeenCalledWith({ allowMissingProfile: true })
    expect(hasEnrolledMfa).not.toHaveBeenCalled()
  })

  it('does not treat an invalid token as a missing profile', async () => {
    signInWithEmailAndPassword.mockResolvedValue({
      user: { uid: 'external-1', email: 'external@example.com', metadata: {} },
    })
    getUser.mockRejectedValue({ response: { status: 401, data: { error: 'Unauthorized - Invalid token' } } })

    expect(await loginWithEmail('external@example.com', 'secret')).toMatchObject({ status: 'error' })
    expect(hasEnrolledMfa).not.toHaveBeenCalled()
  })
})
