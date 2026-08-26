const supportedTimezones = typeof Intl.supportedValuesOf === "function"
  ? Intl.supportedValuesOf("timeZone")
  : [];

export const IANA_TIMEZONES = Object.freeze(
  [...new Set(["UTC", ...supportedTimezones])].sort((left, right) => left.localeCompare(right)),
);

const IANA_TIMEZONE_SET = new Set(IANA_TIMEZONES);

export function isIanaTimezone(value: string): boolean {
  return IANA_TIMEZONE_SET.has(value);
}
