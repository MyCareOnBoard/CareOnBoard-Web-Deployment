import { describe, expect, it } from 'vitest'
import {
  isMissingProfileError,
  isMfaEnrollmentRequiredError,
  getLoginProfileErrorMessage,
} from './loginProfileError'

describe('loginProfileError', () => {
  it('treats 404 as missing profile', () => {
    expect(isMissingProfileError({ response: { status: 404 } })).toBe(true)
  })

  it.each([
    { code: 'USER_PROFILE_NOT_FOUND' },
    { error: 'Unauthorized - User not found' },
  ])('recognizes the specific missing-profile 401: %j', data => {
    expect(isMissingProfileError({ response: { status: 401, data } })).toBe(true)
  })

  it.each([
    { error: 'Unauthorized - Invalid token' },
    { error: 'Unauthorized - No token provided' },
    { code: 'USER_DISABLED' },
    {},
  ])('does not treat other 401s as unfinished registration: %j', data => {
    expect(isMissingProfileError({ response: { status: 401, data } })).toBe(false)
  })

  it('treats 500 as unexpected', () => {
    expect(isMissingProfileError({ response: { status: 500 } })).toBe(false)
  })

  it('returns message from error', () => {
    expect(getLoginProfileErrorMessage(new Error('boom'))).toBe('boom')
  })

  it('detects the MFA-enrollment 403 from a gated profile call', () => {
    expect(
      isMfaEnrollmentRequiredError({
        response: { status: 403, data: { code: 'MFA_ENROLLMENT_REQUIRED' } },
      })
    ).toBe(true)
  })

  it('ignores other 403s and non-403 statuses', () => {
    expect(
      isMfaEnrollmentRequiredError({ response: { status: 403, data: { code: 'FORBIDDEN' } } })
    ).toBe(false)
    expect(
      isMfaEnrollmentRequiredError({
        response: { status: 404, data: { code: 'MFA_ENROLLMENT_REQUIRED' } },
      })
    ).toBe(false)
  })
})
