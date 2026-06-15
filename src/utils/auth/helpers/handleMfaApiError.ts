import { Routes } from '@/routes/constants'

type MfaErrorBody = {
  code?: string
  error?: string
}

/**
 * Redirects to MFA enroll/challenge when the API returns MFA 403 codes.
 * Returns true if the error was handled (caller should stop processing).
 */
export function handleMfaApiError(status: number, body: MfaErrorBody): boolean {
  if (status !== 403 || !body?.code) return false

  const path = window.location.pathname

  if (path.startsWith('/onboarding')) {
    return false
  }

  // When the user is already on an auth route (logging in, enrolling, or
  // completing an MFA challenge), a stray background 403 from an in-flight
  // authenticated request must NOT force-redirect them. Otherwise an
  // authenticated-but-not-enrolled user can never reach /auth/login to start a
  // fresh session — background calls bounce them straight to /auth/mfa-enroll,
  // producing an infinite /auth/login <-> /auth/mfa-enroll loop. Legitimate
  // enrollment/challenge redirects originate from protected app pages or from
  // the explicit login result, both of which still work.
  if (path.startsWith('/auth')) {
    return false
  }

  if (body.code === 'MFA_ENROLLMENT_REQUIRED') {
    if (!path.startsWith(Routes.auth.mfaEnroll)) {
      window.location.href = Routes.auth.mfaEnroll
    }
    return true
  }

  if (body.code === 'MFA_VERIFICATION_REQUIRED') {
    if (!path.startsWith(Routes.auth.mfaChallenge)) {
      window.location.href = Routes.auth.mfaChallenge
    }
    return true
  }

  return false
}
