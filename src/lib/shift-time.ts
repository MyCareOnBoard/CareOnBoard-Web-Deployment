/**
 * Shift times are stored as wall-clock text ("09:00 AM") on a YYYY-MM-DD date.
 * CareOnboard runs on one time zone, US Eastern, so every shift is read and shown in
 * Eastern time whatever zone the viewer's device is set to. These helpers turn the
 * stored text into real instants and into labels.
 */

/**
 * The one time zone the app runs on: US Eastern (EST in winter, EDT in summer).
 * Agencies cannot choose another zone.
 */
export const APP_TIME_ZONE = "America/New_York";

/** Zone shift times are written in. Always {@link APP_TIME_ZONE}. */
export const DEFAULT_SHIFT_TIME_ZONE = APP_TIME_ZONE;

type ZonedShift = {
  date?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  timeZone?: string | null;
};

const formatters = new Map<string, Intl.DateTimeFormat>();
function partsFormatter(timeZone: string): Intl.DateTimeFormat {
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    formatters.set(timeZone, f);
  }
  return f;
}

export function isValidTimeZone(timeZone?: string | null): timeZone is string {
  if (!timeZone || !timeZone.trim()) return false;
  try {
    partsFormatter(timeZone.trim());
    return true;
  } catch {
    return false;
  }
}

/** The browser's zone. */
export function viewerTimeZone(): string {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return isValidTimeZone(zone) ? zone : "UTC";
  } catch {
    return "UTC";
  }
}

/**
 * Zone a shift's times are written in. Always {@link APP_TIME_ZONE}: a `timeZone`
 * stamped on an older shift is ignored. The argument is kept so callers need no change.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function shiftTimeZone(_shift?: { timeZone?: string | null } | null): string {
  return APP_TIME_ZONE;
}

function zonedParts(date: Date, timeZone: string) {
  const out: Record<string, number> = {};
  for (const p of partsFormatter(timeZone).formatToParts(date)) {
    if (p.type !== "literal") out[p.type] = Number(p.value);
  }
  return out;
}

function zoneOffsetMs(ms: number, timeZone: string): number {
  const p = zonedParts(new Date(ms), timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour % 24, p.minute, p.second);
  return asUtc - Math.floor(ms / 1000) * 1000;
}

/** Minutes after midnight for "08:00 AM", "8.00 PM" or "14:30"; null when unreadable. */
export function clockMinutes(time?: string | null): number | null {
  const clock = time?.match(/^\s*(\d{1,2})[:.](\d{2})(?::\d{2})?\s*:?\s*([AP])\.?\s*M?\.?\s*$/i)
    ?? time?.match(/^\s*(\d{1,2})[:.](\d{2})(?::\d{2})?\s*$/);
  if (!clock) return null;
  let hours = Number(clock[1]);
  const minutes = Number(clock[2]);
  const period = clock[3]?.toUpperCase();
  if (period === "P" && hours !== 12) hours += 12;
  if (period === "A" && hours === 12) hours = 0;
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/**
 * Instant for `minutes` after midnight on `dateKey` (YYYY-MM-DD) in `timeZone`.
 * A time skipped by a DST jump reads as the hour after; a repeated time as its first occurrence.
 */
export function zonedDateTime(dateKey: string | null | undefined, minutes: number, timeZone: string): Date | null {
  const day = dateKey?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!day || !Number.isFinite(minutes)) return null;
  const zone = isValidTimeZone(timeZone) ? timeZone.trim() : DEFAULT_SHIFT_TIME_ZONE;
  const wall = Date.UTC(Number(day[1]), Number(day[2]) - 1, Number(day[3])) + minutes * 60_000;
  const off1 = zoneOffsetMs(wall - zoneOffsetMs(wall, zone), zone);
  let t = wall - off1;
  const off2 = zoneOffsetMs(t, zone);
  if (off2 !== off1) t = Math.max(wall - off1, wall - off2);
  return new Date(t);
}

/** Instant for a shift time on its date, read in the shift's zone. */
export function shiftDateTime(
  dateKey?: string | null,
  time?: string | null,
  timeZone: string = DEFAULT_SHIFT_TIME_ZONE,
): Date | null {
  const minutes = clockMinutes(time);
  return minutes === null ? null : zonedDateTime(dateKey, minutes, timeZone);
}

function nextDateKey(dateKey: string): string {
  const d = new Date(`${dateKey}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** Scheduled start and end instants; an end at or before the start is the next day. */
export function shiftInstants(shift: ZonedShift): { start: Date; end: Date | null } | null {
  if (!shift.date) return null;
  const zone = shiftTimeZone(shift);
  const start = shiftDateTime(shift.date, shift.startTime, zone);
  if (!start) return null;
  let end = shiftDateTime(shift.date, shift.endTime, zone);
  if (end && end <= start) end = shiftDateTime(nextDateKey(shift.date), shift.endTime, zone);
  return { start, end };
}

/** Scheduled end instant (overnight-aware), else the end of the shift's day in its zone. */
export function shiftEndOrEndOfDay(shift: ZonedShift): Date | null {
  if (!shift.date) return null;
  const end = shiftInstants(shift)?.end ?? shiftDateTime(shift.date, shift.endTime, shiftTimeZone(shift));
  if (end) return end;
  const nextStart = zonedDateTime(nextDateKey(shift.date), 0, shiftTimeZone(shift));
  return nextStart ? new Date(nextStart.getTime() - 1000) : null;
}

/** YYYY-MM-DD of `date` in `timeZone` (Eastern by default). */
export function dateKeyIn(date: Date, timeZone: string = APP_TIME_ZONE): string {
  const p = zonedParts(date, timeZone);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

/** Today's date in Eastern time, as YYYY-MM-DD (how shift `date` fields are written). */
export function appZoneToday(now: Date = new Date()): string {
  return dateKeyIn(now, APP_TIME_ZONE);
}

/**
 * The Eastern calendar day at `now`, as a Date at the device's local midnight of that
 * same calendar date. Use it where date pickers and date-fns work on local Dates, so
 * "today" is the Eastern day even on a device set to another zone.
 */
export function appZoneDay(now: Date = new Date()): Date {
  const p = zonedParts(now, APP_TIME_ZONE);
  return new Date(p.year, p.month - 1, p.day);
}

/** Today's date in the shift's zone (how its `date` field is written). */
export function shiftZoneToday(shift: ZonedShift, now: Date = new Date()): string {
  return dateKeyIn(now, shiftTimeZone(shift));
}

/** True when the viewer's clock reads the same as the shift's zone at the shift's start. */
export function isViewerInShiftZone(shift: ZonedShift, viewerZone: string = viewerTimeZone()): boolean {
  const zone = shiftTimeZone(shift);
  if (zone === viewerZone) return true;
  const at = shiftInstants(shift)?.start ?? new Date();
  return zoneOffsetMs(at.getTime(), zone) === zoneOffsetMs(at.getTime(), viewerZone);
}

/** Short zone name, e.g. "EST", at `date`. */
export function zoneAbbreviation(date: Date, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "short" })
      .formatToParts(date)
      .find((p) => p.type === "timeZoneName")?.value ?? timeZone;
  } catch {
    return timeZone;
  }
}

/** "9:00 AM" for an instant in Eastern time (or `timeZone`). */
export function formatClockTime(date: Date, timeZone: string = APP_TIME_ZONE): string {
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone });
}

export type ViewerShiftTimes = {
  /** Eastern date of the start (YYYY-MM-DD); the shift's date when unreadable. */
  dateKey: string;
  start: Date | null;
  end: Date | null;
  /** "9:00 AM" in Eastern time, or the stored text when unreadable. */
  startLabel: string;
  endLabel: string;
  /** Minutes after Eastern midnight on `dateKey`. */
  startMinutes: number | null;
  endMinutes: number | null;
  /** Always false: times are never converted to the viewer's device zone. */
  converted: boolean;
  /** Always null: there is no second reading to show. */
  agencyLabel: string | null;
};

/**
 * Shift times as shown to every viewer: in Eastern time, whatever zone their device is
 * set to. `_viewerZone` is ignored and kept only so callers need no change.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function viewerShiftTimes(shift: ZonedShift, _viewerZone?: string): ViewerShiftTimes {
  const instants = shiftInstants(shift);
  const zone = shiftTimeZone(shift);
  const rawStart = shift.startTime ?? "";
  const rawEnd = shift.endTime ?? "";
  if (!instants) {
    return {
      dateKey: shift.date ?? "",
      start: null,
      end: null,
      startLabel: rawStart,
      endLabel: rawEnd,
      startMinutes: clockMinutes(rawStart),
      endMinutes: clockMinutes(rawEnd),
      converted: false,
      agencyLabel: null,
    };
  }
  const labelZone = zone;
  const dateKey = dateKeyIn(instants.start, labelZone);
  const minutesOf = (d: Date) => {
    const p = zonedParts(d, labelZone);
    return (p.hour % 24) * 60 + p.minute;
  };
  let endMinutes = instants.end ? minutesOf(instants.end) : null;
  if (endMinutes !== null && instants.end && dateKeyIn(instants.end, labelZone) !== dateKey) endMinutes += 24 * 60;
  return {
    dateKey,
    start: instants.start,
    end: instants.end,
    startLabel: formatClockTime(instants.start, labelZone),
    endLabel: instants.end ? formatClockTime(instants.end, labelZone) : rawEnd,
    startMinutes: minutesOf(instants.start),
    endMinutes,
    converted: false,
    agencyLabel: null,
  };
}

/** "9:00 AM – 5:00 PM" in Eastern time. */
export function viewerShiftRange(shift: ZonedShift, viewerZone?: string): string {
  const t = viewerShiftTimes(shift, viewerZone);
  return `${t.startLabel}${t.endLabel ? ` – ${t.endLabel}` : ""}`;
}

/**
 * Stored shift time text with the shift's zone appended when the viewer is elsewhere,
 * e.g. "09:00 AM EST". Used on agency screens, which keep the agency's own times.
 */
export function shiftTimeLabel(shift: ZonedShift, time?: string | null, viewerZone?: string): string {
  if (!time) return "";
  if (isViewerInShiftZone(shift, viewerZone)) return time;
  const zone = shiftTimeZone(shift);
  const at = shiftDateTime(shift.date, time, zone) ?? new Date();
  return `${time} ${zoneAbbreviation(at, zone)}`;
}

/** " EST"-style suffix naming the shift's zone, or "" when the viewer is in that zone. */
export function shiftZoneSuffix(shift: ZonedShift, viewerZone?: string): string {
  if (isViewerInShiftZone(shift, viewerZone)) return "";
  const zone = shiftTimeZone(shift);
  return ` ${zoneAbbreviation(shiftInstants(shift)?.start ?? new Date(), zone)}`;
}

/** Scheduled start instant, read in the shift's zone. */
export function shiftStartAt(shift: ZonedShift): Date | null {
  return shiftDateTime(shift.date, shift.startTime, shiftTimeZone(shift));
}

/** Scheduled end time on the shift's date (no overnight wrap), read in the shift's zone. */
export function shiftEndAt(shift: ZonedShift): Date | null {
  return shiftDateTime(shift.date, shift.endTime, shiftTimeZone(shift));
}

/** The calendar day a shift starts on, in Eastern time. */
export function shiftViewerDate(shift: ZonedShift, viewerZone?: string): string {
  return viewerShiftTimes(shift, viewerZone).dateKey;
}
