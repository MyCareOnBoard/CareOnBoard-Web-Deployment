import { describe, expect, it } from 'vitest'
import { isMissingProfileError, getLoginProfileErrorMessage } from './loginProfileError'

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
})
