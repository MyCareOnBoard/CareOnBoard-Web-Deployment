import { describe, expect, it } from 'vitest'
import { maskPhoneNumber } from './mfaCopy'

describe('maskPhoneNumber', () => {
  it('masks E.164 numbers showing last 4 digits', () => {
    expect(maskPhoneNumber('+15551234567')).toBe('*** ***-4567')
  })

  it('returns fallback when phone is missing', () => {
    expect(maskPhoneNumber(null)).toBe('your phone')
    expect(maskPhoneNumber(undefined)).toBe('your phone')
  })
})
