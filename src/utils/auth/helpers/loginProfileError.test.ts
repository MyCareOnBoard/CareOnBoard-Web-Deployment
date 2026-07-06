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
