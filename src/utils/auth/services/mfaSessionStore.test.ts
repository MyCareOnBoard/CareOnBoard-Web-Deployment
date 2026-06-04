import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import {
  setMfaResolverSession,
  getMfaResolverSession,
  clearMfaResolverSession,
  isMfaSessionExpired,
} from './mfaSessionStore'

describe('mfaSessionStore', () => {
  const mockResolver = {
    hints: [],
    session: {},
    resolveSignIn: vi.fn(),
  } as unknown as import('firebase/auth').MultiFactorResolver

  beforeEach(() => {
    clearMfaResolverSession()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    clearMfaResolverSession()
  })

  it('stores and retrieves resolver session', () => {
    setMfaResolverSession(mockResolver, 'user@example.com', '*** ***-1234')
    const session = getMfaResolverSession()
    expect(session?.email).toBe('user@example.com')
    expect(session?.maskedPhone).toBe('*** ***-1234')
    expect(session?.resolver).toBe(mockResolver)
  })

  it('expires session after TTL', () => {
    setMfaResolverSession(mockResolver, 'user@example.com', '*** ***-1234')
    vi.advanceTimersByTime(10 * 60 * 1000 + 1)
    expect(getMfaResolverSession()).toBeNull()
    expect(isMfaSessionExpired()).toBe(true)
  })

  it('clears session explicitly', () => {
    setMfaResolverSession(mockResolver, 'user@example.com', '*** ***-1234')
    clearMfaResolverSession()
    expect(getMfaResolverSession()).toBeNull()
  })
})
