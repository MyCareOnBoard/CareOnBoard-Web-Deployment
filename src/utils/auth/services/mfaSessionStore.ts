import type { MultiFactorResolver } from 'firebase/auth'

const MFA_SESSION_TTL_MS = 10 * 60 * 1000

type MfaSession = {
  resolver: MultiFactorResolver
  email: string
  maskedPhone: string
  createdAt: number
}

let session: MfaSession | null = null

export function setMfaResolverSession(
  resolver: MultiFactorResolver,
  email: string,
  maskedPhone: string
): void {
  session = {
    resolver,
    email,
    maskedPhone,
    createdAt: Date.now(),
  }
}

export function getMfaResolverSession(): MfaSession | null {
  if (!session) return null
  if (Date.now() - session.createdAt > MFA_SESSION_TTL_MS) {
    session = null
    return null
  }
  return session
}

export function clearMfaResolverSession(): void {
  session = null
}

export function isMfaSessionExpired(): boolean {
  if (!session) return true
  return Date.now() - session.createdAt > MFA_SESSION_TTL_MS
}
