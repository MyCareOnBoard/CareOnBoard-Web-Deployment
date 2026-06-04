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
