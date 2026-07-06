type AxiosLikeError = {
  response?: { status?: number; data?: { code?: string } }
  message?: string
}

/**
 * Profile missing (404) — fall through to MFA routing.
 * Everything else is unexpected and should surface as login error.
 */
export function isMissingProfileError(error: unknown): boolean {
  const err = error as AxiosLikeError
  return err.response?.status === 404
}

/**
 * Profile refused with 403 MFA_ENROLLMENT_REQUIRED — the endpoint is gated
 * behind MFA for non-exempt users (e.g. agency staff, whose first /profile is
 * already gated). Route them to enrollment instead of erroring the login.
 */
export function isMfaEnrollmentRequiredError(error: unknown): boolean {
  const err = error as AxiosLikeError
  return (
    err.response?.status === 403 &&
    err.response?.data?.code === 'MFA_ENROLLMENT_REQUIRED'
  )
}

export function getLoginProfileErrorMessage(error: unknown): string {
  const err = error as AxiosLikeError
  if (err.message) return err.message
  return 'Unable to load your profile. Please try again.'
}
