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

export function getLoginProfileErrorMessage(error: unknown): string {
  const err = error as AxiosLikeError
  if (err.message) return err.message
  return 'Unable to load your profile. Please try again.'
}
