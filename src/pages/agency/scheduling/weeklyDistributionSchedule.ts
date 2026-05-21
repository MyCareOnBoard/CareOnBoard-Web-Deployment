import { eachDayOfInterval, format, parse, isValid } from "date-fns";
import { parseHoursFromCell } from "@/pages/shared/client-management/utils/deriveAuthorizedHoursPerWeek";
import type { SanitizedWeeklyRow } from "@/pages/shared/client-management/utils/sdrWeeklyDistribution";

export const WEEKLY_DISTRIBUTION_HOURS_EPSILON = 0.05;

export type WeeklyDistributionFormSlice = {
  schedulingType: "one-time" | "recurring" | "";
  date?: Date | null;
  startDate: Date | null;
  endDate: Date | null;
  clockInTime: string;
  clockOutTime: string;
};

export type WeekdayScheduleSlice = {
  dayIndex: number;
  clockInTime: string;
  clockOutTime: string;
};

export type WeeklyDistributionSnapshot = {
  weekStart: Date;
  weekEnd: Date;
  weekStartStr: string;
  weekEndStr: string;
  authorizedHours?: number;
};

export function parseWeeklyDistributionAuthorizedHours(
  hoursCell: string | undefined,
): number | undefined {
  return parseHoursFromCell(hoursCell);
}

function parseSdrWeekRangeSide(raw: string): Date | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  for (const pattern of ["M/d/yyyy", "MM/dd/yyyy", "M/d/yy", "MM/dd/yy"]) {
    const d = parse(trimmed, pattern, new Date());
    if (isValid(d)) return d;
  }
  return null;
}

export function parseSdrWeekRange(
  weekRange: string | undefined,
): { start: Date; end: Date } | null {
  const raw = String(weekRange ?? "").trim();
  if (!raw) return null;
  const dashIdx = raw.indexOf("-");
  if (dashIdx <= 0) return null;
  const left = raw.slice(0, dashIdx).trim();
  const right = raw.slice(dashIdx + 1).trim();
  const start = parseSdrWeekRangeSide(left);
  const end = parseSdrWeekRangeSide(right);
  if (!start || !end) return null;
  if (start <= end) return { start, end };
  return { start: end, end: start };
}

export function buildWeeklyDistributionSnapshot(
  row: SanitizedWeeklyRow,
): WeeklyDistributionSnapshot | null {
  const bounds = parseSdrWeekRange(row.weekRange);
  if (!bounds) return null;
  const authorizedHours = parseWeeklyDistributionAuthorizedHours(row.hours);
  return {
    weekStart: bounds.start,
    weekEnd: bounds.end,
    weekStartStr: format(bounds.start, "yyyy-MM-dd"),
    weekEndStr: format(bounds.end, "yyyy-MM-dd"),
    ...(authorizedHours !== undefined ? { authorizedHours } : {}),
  };
}

export function formatWeeklyDistributionDropdownLabel(row: SanitizedWeeklyRow): string {
  const range = String(row.weekRange ?? "").trim() || "Week range not on file";
  const hours = parseWeeklyDistributionAuthorizedHours(row.hours);
  if (hours !== undefined) {
    const display = Number.isInteger(hours) ? String(hours) : hours.toFixed(2);
    return `${range} — ${display} hrs`;
  }
  return `${range} — authorized hours not on file`;
}

/** Parse modal clock strings like `09:00:AM` or `10.00:AM` into minutes from midnight. */
function parseClockTimeToMinutes(time: string): number | null {
  const match = time.match(/(\d+)[.:](\d+):?(AM|PM)/i);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
}

export function shiftDurationHoursFrom12h(clockIn: string, clockOut: string): number {
  const startMinutes = parseClockTimeToMinutes(clockIn);
  const endMinutes = parseClockTimeToMinutes(clockOut);
  if (startMinutes == null || endMinutes == null) return 0;
  let diffMinutes = endMinutes - startMinutes;
  if (diffMinutes <= 0) diffMinutes += 24 * 60;
  return diffMinutes / 60;
}

function dateStrInRange(d: string, lower: string, upper: string): boolean {
  return d >= lower && d <= upper;
}

export function computeTotalScheduledHours(
  formData: WeeklyDistributionFormSlice,
  snapshot: WeeklyDistributionSnapshot,
  weekdaySchedules: WeekdayScheduleSlice[] = [],
): number {
  if (
    formData.schedulingType !== "recurring" ||
    !formData.startDate ||
    !formData.endDate
  ) {
    return 0;
  }

  const dateRange = eachDayOfInterval({
    start: formData.startDate,
    end: formData.endDate,
  });

  let total = 0;

  if (weekdaySchedules.length > 0) {
    const byDayIndex = new Map(weekdaySchedules.map((w) => [w.dayIndex, w]));
    for (const date of dateRange) {
      const dateStr = format(date, "yyyy-MM-dd");
      if (!dateStrInRange(dateStr, snapshot.weekStartStr, snapshot.weekEndStr)) continue;
      const weekday = byDayIndex.get(date.getDay());
      if (!weekday?.clockInTime || !weekday.clockOutTime) continue;
      total += shiftDurationHoursFrom12h(weekday.clockInTime, weekday.clockOutTime);
    }
    return total;
  }

  if (!formData.clockInTime || !formData.clockOutTime) return 0;
  const duration = shiftDurationHoursFrom12h(formData.clockInTime, formData.clockOutTime);
  for (const date of dateRange) {
    const dateStr = format(date, "yyyy-MM-dd");
    if (dateStrInRange(dateStr, snapshot.weekStartStr, snapshot.weekEndStr)) {
      total += duration;
    }
  }
  return total;
}

export function validateScheduleAgainstWeeklyDistributionRow(args: {
  formData: WeeklyDistributionFormSlice;
  snapshot: WeeklyDistributionSnapshot;
  weekdaySchedules?: WeekdayScheduleSlice[];
}): { ok: true } | { ok: false; message: string } {
  const { formData, snapshot, weekdaySchedules = [] } = args;
  if (snapshot.authorizedHours === undefined) return { ok: true };

  const total = computeTotalScheduledHours(formData, snapshot, weekdaySchedules);
  const cap = snapshot.authorizedHours;
  if (total > cap + WEEKLY_DISTRIBUTION_HOURS_EPSILON) {
    return {
      ok: false,
      message: `Scheduled hours (${total.toFixed(1)}) exceed authorized hours for this week (${cap.toFixed(1)}).`,
    };
  }
  return { ok: true };
}

function countMatchingWeekdaysInRange(
  startDate: Date,
  endDate: Date,
  weekdaySchedules: WeekdayScheduleSlice[],
): number {
  if (weekdaySchedules.length === 0) return -1;
  const selectedDayIndices = new Set(weekdaySchedules.map((w) => w.dayIndex));
  const dateRange = eachDayOfInterval({ start: startDate, end: endDate });
  return dateRange.filter((date) => selectedDayIndices.has(date.getDay())).length;
}

/** Day-of-week indices (0=Sun … 6=Sat) that occur at least once in [startDate, endDate]. */
export function weekdayIndicesInDateRange(startDate: Date, endDate: Date): Set<number> {
  const start = startDate <= endDate ? startDate : endDate;
  const end = startDate <= endDate ? endDate : startDate;
  const indices = new Set<number>();
  for (const date of eachDayOfInterval({ start, end })) {
    indices.add(date.getDay());
  }
  return indices;
}

export function isWeekdayInDateRange(
  dayIndex: number,
  startDate: Date | null,
  endDate: Date | null,
): boolean {
  if (!startDate || !endDate) return true;
  return weekdayIndicesInDateRange(startDate, endDate).has(dayIndex);
}

/**
 * When exactly one weekday is selected, clock pickers are the source of truth for
 * that day's times (picker can drift from selectedWeekdays after initial configure).
 */
export function effectiveWeekdaySchedulesForShiftBuild(args: {
  weekdaySchedules: WeekdayScheduleSlice[];
  clockInTime: string;
  clockOutTime: string;
  configuringWeekday: { dayIndex: number } | null;
}): WeekdayScheduleSlice[] {
  const { weekdaySchedules, clockInTime, clockOutTime, configuringWeekday } = args;
  if (configuringWeekday || weekdaySchedules.length !== 1) {
    return weekdaySchedules;
  }
  if (!clockInTime || !clockOutTime) return weekdaySchedules;
  const only = weekdaySchedules[0];
  if (only.clockInTime === clockInTime && only.clockOutTime === clockOutTime) {
    return weekdaySchedules;
  }
  return [{ ...only, clockInTime, clockOutTime }];
}

export function formatTotalDurationFromHours(totalHours: number): string {
  if (totalHours <= 0) return "0 hours";
  const totalMinutes = Math.round(totalHours * 60);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (mins > 0) return `${hours} hours ${mins} minutes`;
  return `${hours} hour${hours === 1 ? "" : "s"}`;
}

/** When shift build would produce zero requests, return a specific user-facing reason. */
export function describeWhyNoShiftsWouldBeBuilt(args: {
  formData: WeeklyDistributionFormSlice;
  weekdaySchedules: WeekdayScheduleSlice[];
  weekdayLabelByIndex?: Record<number, string>;
  hasAgencyId: boolean;
  hasAssignedDspId: boolean;
  action: "schedule" | "save";
}): string {
  const {
    formData,
    weekdaySchedules,
    weekdayLabelByIndex = {},
    hasAgencyId,
    hasAssignedDspId,
    action,
  } = args;
  const actionWord = action === "schedule" ? "scheduling" : "saving";

  if (!hasAgencyId) {
    return "Your session is missing agency context. Sign in again and retry.";
  }

  if (!hasAssignedDspId) {
    return "Select an assigned DSP from the service list. The chosen DSP must be linked to an employee record.";
  }

  if (formData.schedulingType === "recurring" && formData.startDate && formData.endDate) {
    if (weekdaySchedules.length > 0) {
      const matchCount = countMatchingWeekdaysInRange(
        formData.startDate,
        formData.endDate,
        weekdaySchedules,
      );
      if (matchCount === 0) {
        const labels = weekdaySchedules
          .map((w) => weekdayLabelByIndex[w.dayIndex] ?? `day ${w.dayIndex}`)
          .join(", ");
        const rangeLabel = `${format(formData.startDate, "M/d/yyyy")} – ${format(formData.endDate, "M/d/yyyy")}`;
        return `No shifts fall on the selected weekdays (${labels}) between ${rangeLabel}. Widen the date range or change which weekdays are selected.`;
      }
    }
  } else if (formData.schedulingType === "one-time") {
    if (!formData.date) {
      return `Select a date before ${actionWord}.`;
    }
  } else if (formData.schedulingType === "recurring") {
    if (!formData.startDate || !formData.endDate) {
      return `Select a start and end date before ${actionWord}.`;
    }
  }

  return `Please fill in all required fields before ${actionWord}.`;
}

export function recurringWeekdayDateRangeMismatchMessage(args: {
  formData: WeeklyDistributionFormSlice;
  weekdaySchedules: WeekdayScheduleSlice[];
  weekdayLabelByIndex?: Record<number, string>;
}): string | null {
  const { formData, weekdaySchedules, weekdayLabelByIndex = {} } = args;
  if (
    formData.schedulingType !== "recurring" ||
    !formData.startDate ||
    !formData.endDate ||
    weekdaySchedules.length === 0
  ) {
    return null;
  }
  if (
    countMatchingWeekdaysInRange(formData.startDate, formData.endDate, weekdaySchedules) === 0
  ) {
    return describeWhyNoShiftsWouldBeBuilt({
      formData,
      weekdaySchedules,
      weekdayLabelByIndex,
      hasAgencyId: true,
      hasAssignedDspId: true,
      action: "schedule",
    });
  }
  return null;
}

function dateStrInRangeForCapBucket(d: string, lower: string, upper: string): boolean {
  return d >= lower && d <= upper;
}

function sunSatWeekBoundsYmd(dateStr: string): { weekStart: string; weekEnd: string } | null {
  const d = parse(dateStr, "yyyy-MM-dd", new Date());
  if (!isValid(d)) return null;
  const day = d.getDay();
  const start = new Date(d);
  start.setDate(start.getDate() - day);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return {
    weekStart: format(start, "yyyy-MM-dd"),
    weekEnd: format(end, "yyyy-MM-dd"),
  };
}

/** Group key for cap-aware shift creates (same bucket = sequential). */
export function capBucketKeyForShiftRequest(
  request: { clientId?: string; serviceCode?: string; date?: string },
  distributionSnapshot: WeeklyDistributionSnapshot | null,
): string {
  const clientId = request.clientId ?? "";
  const serviceCode = (request.serviceCode ?? "").trim().toLowerCase();
  const date = request.date ?? "";

  if (
    distributionSnapshot &&
    date &&
    dateStrInRangeForCapBucket(
      date,
      distributionSnapshot.weekStartStr,
      distributionSnapshot.weekEndStr,
    )
  ) {
    return `${clientId}|${serviceCode}|sdr|${distributionSnapshot.weekStartStr}|${distributionSnapshot.weekEndStr}`;
  }

  if (date) {
    const sunSat = sunSatWeekBoundsYmd(date);
    if (sunSat) {
      return `${clientId}|${serviceCode}|sun|${sunSat.weekStart}|${sunSat.weekEnd}`;
    }
  }

  return `${clientId}|${serviceCode}|${date}`;
}

/**
 * Create shifts with sequential ordering within the same cap bucket and parallel
 * ordering across unrelated buckets.
 */
export async function createShiftsCapAware<TRequest extends { clientId?: string; serviceCode?: string; date?: string }, TResult>(
  requests: TRequest[],
  createOne: (req: TRequest) => Promise<TResult>,
  distributionSnapshot: WeeklyDistributionSnapshot | null,
): Promise<PromiseSettledResult<TResult>[]> {
  const indexed = requests.map((req, index) => ({ req, index }));
  const groups = new Map<string, typeof indexed>();

  for (const item of indexed) {
    const key = capBucketKeyForShiftRequest(item.req, distributionSnapshot);
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }

  const results: PromiseSettledResult<TResult>[] = new Array(requests.length);

  await Promise.all(
    [...groups.values()].map(async (group) => {
      for (const { req, index } of group) {
        try {
          const value = await createOne(req);
          results[index] = { status: "fulfilled", value };
        } catch (reason) {
          results[index] = { status: "rejected", reason };
        }
      }
    }),
  );

  return results;
}
