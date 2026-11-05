/** A picked date as the "YYYY-MM-DD" calendar day the API expects. */
export function toCivilDate(value?: Date | null): string | undefined {
  if (!value || isNaN(value.getTime())) return undefined;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}

// Older records hold a timestamp near midnight in the saver's time zone
// (e.g. 2026-05-24T23:00Z for May 25). Round to the nearest UTC day.
function nearestCalendarDay(d: Date): Date | null {
  if (isNaN(d.getTime())) return null;
  const day = new Date(d.getTime() + 12 * 60 * 60 * 1000);
  return new Date(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate());
}

export function parseServiceDate(
  value?: string | { _seconds?: number; _nanoseconds?: number } | Date,
): Date | null {
  if (!value) return null;
  try {
    if (value instanceof Date) return value;
    if (typeof value === "string") {
      // Service dates are calendar days. Read "YYYY-MM-DD" as that local day, not UTC midnight.
      const civil = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
      if (civil) return new Date(Number(civil[1]), Number(civil[2]) - 1, Number(civil[3]));
      return nearestCalendarDay(new Date(value));
    }
    if (typeof value === "object" && "_seconds" in value && value._seconds) {
      return nearestCalendarDay(new Date(value._seconds * 1000));
    }
    return null;
  } catch {
    return null;
  }
}
