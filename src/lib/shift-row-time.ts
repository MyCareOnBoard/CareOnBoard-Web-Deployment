/** Normalize timestamp-like values to a display-safe string. Never returns an object. */
export function normalizeTimestampToDisplayString(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? "" : value.toISOString();
  }
  if (typeof value === "object" && value !== null) {
    const obj = value as Record<string, unknown>;
    const seconds = obj._seconds ?? obj.seconds;
    if (typeof seconds === "number") {
      const ns = (obj._nanoseconds ?? obj.nanoseconds ?? 0) as number;
      const ms = seconds * 1000 + (typeof ns === "number" ? ns / 1_000_000 : 0);
      const d = new Date(ms);
      return Number.isNaN(d.getTime()) ? "" : d.toISOString();
    }
  }
  return "";
}

/**
 * Format clock time like Scheduling "Recent shifts" (12h with AM/PM), on the viewer's clock.
 * Empty / invalid → `--:-- --` for list row parity with scheduling templates.
 */
export function formatShiftRowClockDisplay(time?: unknown): string {
  const str = normalizeTimestampToDisplayString(time);
  if (!str) return "--:-- --";
  try {
    if (str.includes("AM") || str.includes("PM")) return str;
    if (!str.includes("T")) return "--:-- --";
    // Clock instants are UTC ISO strings: show them on the viewer's clock.
    const date = new Date(str);
    if (Number.isNaN(date.getTime())) return "--:-- --";
    return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  } catch {
    return "--:-- --";
  }
}
