export const CHECK_ONBOARD_SCRIPT_URL = "https://cdn.checkhq.com/onboard-initialize.js" as const;
export const CHECK_ONBOARD_ORIGIN = "https://cdn.checkhq.com" as const;
export function isTrustedCheckOnboardUrl(value: string): boolean {
  try { const url = new URL(value); return url.origin === CHECK_ONBOARD_ORIGIN && url.href === CHECK_ONBOARD_SCRIPT_URL; } catch { return false; }
}
