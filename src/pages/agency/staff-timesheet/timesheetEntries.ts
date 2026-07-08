import { parse, format } from "date-fns";
import type { StaffTimesheetEntry } from "@/lib/api/staff-timesheets";

export interface WeekData {
  [day: string]: { date: string; checkIn: string; checkOut: string };
}

const DAY_ORDER = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const EMPTY_WEEK: WeekData = {
  Sunday: { date: "", checkIn: "", checkOut: "" },
  Monday: { date: "", checkIn: "", checkOut: "" },
  Tuesday: { date: "", checkIn: "", checkOut: "" },
  Wednesday: { date: "", checkIn: "", checkOut: "" },
  Thursday: { date: "", checkIn: "", checkOut: "" },
  Friday: { date: "", checkIn: "", checkOut: "" },
  Saturday: { date: "", checkIn: "", checkOut: "" },
};

/**
 * The timesheet grid stores dates as year-less "dd MMMM". Reconstruct the year:
 * assume the current year, but if that lands in the future (e.g. "28 December"
 * entered in January), roll back one year — the calendar only allows past/today
 * dates, so a future date means it belongs to the prior year.
 */
export function reconstructIsoDate(displayDate: string, now: Date): string | null {
  if (!displayDate) return null;
  const parsed = parse(displayDate, "d MMMM", new Date(now.getFullYear(), 0, 1));
  if (Number.isNaN(parsed.getTime())) return null;
  if (parsed.getTime() > now.getTime()) {
    parsed.setFullYear(parsed.getFullYear() - 1);
  }
  return format(parsed, "yyyy-MM-dd");
}

/** Minutes since midnight from a 12h "hh:mm AM/PM" string. */
function toMinutes(time12h: string): number | null {
  if (!time12h) return null;
  const match = time12h.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

export function calculateEntryHours(checkIn: string, checkOut: string): number {
  const start = toMinutes(checkIn);
  const end = toMinutes(checkOut);
  if (start == null || end == null) return 0;
  let diff = end - start;
  if (diff <= 0) diff += 24 * 60; // overnight
  return Math.round((diff / 60) * 100) / 100;
}

export function calculateWeekHours(week: WeekData): number {
  const total = Object.values(week).reduce(
    (sum, day) => sum + calculateEntryHours(day.checkIn, day.checkOut),
    0,
  );
  return Math.round(total * 100) / 100;
}

/**
 * Turn the two week grids into API entries + the derived pay period. Skips days
 * missing a date or either time.
 */
export function buildTimesheetEntries(
  week1: WeekData,
  week2: WeekData,
  now: Date,
): { entries: StaffTimesheetEntry[]; periodStart: string | null; periodEnd: string | null } {
  const entries: StaffTimesheetEntry[] = [];
  ([week1, week2] as WeekData[]).forEach((week, weekIndex) => {
    DAY_ORDER.forEach((day) => {
      const dayData = week[day];
      if (!dayData || !dayData.date || !dayData.checkIn || !dayData.checkOut) return;
      const iso = reconstructIsoDate(dayData.date, now);
      if (!iso) return;
      entries.push({
        week: (weekIndex + 1) as 1 | 2,
        day,
        date: iso,
        checkIn: dayData.checkIn,
        checkOut: dayData.checkOut,
        hours: calculateEntryHours(dayData.checkIn, dayData.checkOut),
      });
    });
  });

  const dates = entries.map((entry) => entry.date).sort();
  return {
    entries,
    periodStart: dates[0] ?? null,
    periodEnd: dates[dates.length - 1] ?? null,
  };
}

/** Rebuild the two week grids from stored entries (for draft rehydration). */
export function entriesToWeekData(entries: StaffTimesheetEntry[]): { week1: WeekData; week2: WeekData } {
  const week1: WeekData = structuredClone(EMPTY_WEEK);
  const week2: WeekData = structuredClone(EMPTY_WEEK);
  for (const entry of entries) {
    const target = entry.week === 2 ? week2 : week1;
    if (entry.day in target) {
      target[entry.day] = {
        // Display format matches the grid ("06 July").
        date: format(parse(entry.date, "yyyy-MM-dd", new Date()), "dd MMMM"),
        checkIn: entry.checkIn,
        checkOut: entry.checkOut,
      };
    }
  }
  return { week1, week2 };
}
