import { describe, expect, it, vi, beforeEach } from 'vitest'

const { authMock } = vi.hoisted(() => ({
  authMock: {
    currentUser: null as { emailVerified: boolean } | null,
  },
}))

vi.mock('@/lib/firebase', () => ({ auth: authMock }))

import { resolveEmailVerified } from './resolveEmailVerified'

describe('resolveEmailVerified', () => {
  beforeEach(() => {
    authMock.currentUser = null
  })

  it('returns true when Firebase user is email verified', () => {
    authMock.currentUser = { emailVerified: true }
    expect(resolveEmailVerified()).toBe(true)
  })

  it('returns false when Firebase user is not verified', () => {
    authMock.currentUser = { emailVerified: false }
    expect(resolveEmailVerified()).toBe(false)
  })

  it('returns false when not signed in', () => {
    authMock.currentUser = null
    expect(resolveEmailVerified()).toBe(false)
  })
})
