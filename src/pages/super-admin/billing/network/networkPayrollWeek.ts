const DAY_MS = 86_400_000;

function parseUtcDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day
    ? parsed
    : null;
}

function formatUtcDate(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function mondayContaining(date: Date): Date {
  const monday = new Date(date);
  const offset = (monday.getUTCDay() + 6) % 7;
  monday.setUTCDate(monday.getUTCDate() - offset);
  return monday;
}

export function currentNetworkPayrollWeekStart(now = new Date()): string {
  return formatUtcDate(mondayContaining(now));
}

export function normalizeNetworkPayrollWeekStart(weekStart: string, fallbackEndDate: string): string {
  const requested = parseUtcDate(weekStart);
  if (requested && requested.getUTCDay() === 1) return formatUtcDate(requested);

  const fallback = parseUtcDate(fallbackEndDate);
  if (!fallback) throw new Error("A valid workspace end date is required.");
  return formatUtcDate(mondayContaining(fallback));
}

export function networkPayrollWeek(weekStart: string): { startDate: string; endDate: string } {
  const start = parseUtcDate(weekStart);
  if (!start || start.getUTCDay() !== 1) {
    throw new Error("Payroll week start must be a Monday in YYYY-MM-DD format.");
  }
  const end = new Date(start.getTime() + (6 * DAY_MS));
  return { startDate: formatUtcDate(start), endDate: formatUtcDate(end) };
}

export function shiftNetworkPayrollWeek(weekStart: string, weeks: number): string {
  const { startDate } = networkPayrollWeek(weekStart);
  const start = parseUtcDate(startDate);
  if (!start) throw new Error("Payroll week start must be valid.");
  start.setUTCDate(start.getUTCDate() + (weeks * 7));
  return formatUtcDate(start);
}
