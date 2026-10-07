/** Only local, canonical Agency Care routes can continue an authentication flow. */
export function agencyCareReturnTo(value: string | null | undefined): string | null {
  if (!value || /[\\\u0000-\u0020]/.test(value)) return null
  const path = value.split(/[?#]/, 1)[0]
  if (!/^\/agency-care(?:\/[A-Za-z0-9_-]+)*\/?$/.test(path)) return null
  return value
}

export function authRouteWithReturnTo(route: string, value: string | null | undefined): string {
  const returnTo = agencyCareReturnTo(value)
  return returnTo ? `${route}?returnTo=${encodeURIComponent(returnTo)}` : route
}
