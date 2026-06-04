import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { handleMfaApiError } from './handleMfaApiError'
import { Routes } from '@/routes/constants'

describe('handleMfaApiError', () => {
  const originalLocation = window.location

  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...originalLocation, pathname: '/agency/dashboard', href: '' },
    })
  })

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      writable: true,
      value: originalLocation,
    })
  })

  it('redirects to mfa enroll on MFA_ENROLLMENT_REQUIRED', () => {
    const handled = handleMfaApiError(403, { code: 'MFA_ENROLLMENT_REQUIRED' })
    expect(handled).toBe(true)
    expect(window.location.href).toBe(Routes.auth.mfaEnroll)
  })

  it('redirects to mfa challenge on MFA_VERIFICATION_REQUIRED', () => {
    const handled = handleMfaApiError(403, { code: 'MFA_VERIFICATION_REQUIRED' })
    expect(handled).toBe(true)
    expect(window.location.href).toBe(Routes.auth.mfaChallenge)
  })

  it('returns false for non-MFA errors', () => {
    expect(handleMfaApiError(403, { code: 'FORBIDDEN' })).toBe(false)
    expect(handleMfaApiError(401, { code: 'MFA_ENROLLMENT_REQUIRED' })).toBe(false)
  })
})
