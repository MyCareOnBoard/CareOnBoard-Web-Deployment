/** Only local, canonical Agency Care routes can continue an authentication flow. */
export function agencyCareReturnTo(value: string | null | undefined): string | null {
  if (!value || /[\\\u0000-\u0020]/.test(value)) return null
  const path = value.split(/[?#]/, 1)[0]
  const canonicalRoute = /^\/agency-care(?:\/[A-Za-z0-9_-]+)*\/?$/.test(path)
  const signedInvitation = /^\/agency-care\/invitations\/[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\/?$/.test(path)
  if (!canonicalRoute && !signedInvitation) return null
  return value
}

export function agencyCareInvitationReturnTo(value: string | null | undefined): string | null {
  const returnTo = agencyCareReturnTo(value)
  return returnTo && /^\/agency-care\/invitations\/[^/]+\/?$/.test(returnTo.split(/[?#]/, 1)[0])
    ? returnTo
    : null
}

export function authRouteWithReturnTo(route: string, value: string | null | undefined): string {
  const returnTo = agencyCareReturnTo(value)
  return returnTo ? `${route}?returnTo=${encodeURIComponent(returnTo)}` : route
}
