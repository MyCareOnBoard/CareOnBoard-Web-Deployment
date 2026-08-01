export const SHIFT_CATEGORY_OPTIONS = [
  { value: "scheduled", label: "Scheduled" },
  { value: "ongoing", label: "Ongoing" },
  { value: "completed", label: "Completed" },
  { value: "needs_attention", label: "Needs attention" },
  { value: "missed_expired", label: "Missed / expired" },
  { value: "other_anomalies", label: "Other anomalies" },
  { value: "other_statuses", label: "Other statuses" },
] as const;

export type ShiftCategory = typeof SHIFT_CATEGORY_OPTIONS[number]["value"];

const SHIFT_CATEGORIES = new Set<ShiftCategory>(SHIFT_CATEGORY_OPTIONS.map(({ value }) => value));
const MISSED_OR_INCOMPLETE_CODES = new Set(["missed", "incomplete_clock"]);
const STANDARD_STATUSES = new Set(["pending", "available", "ongoing", "completed", "expired"]);

interface CategorizedShift {
  status?: string | null;
  anomalyCodes?: readonly string[];
}

export function parseShiftCategory(search: string): ShiftCategory | null {
  const value = new URLSearchParams(search).get("shiftCategory") as ShiftCategory | null;
  return value && SHIFT_CATEGORIES.has(value) ? value : null;
}

export function matchesShiftCategory(shift: CategorizedShift, category: ShiftCategory | null): boolean {
  if (!category) return true;
  const anomalyCodes = shift.anomalyCodes ?? [];
  const hasAnomaly = anomalyCodes.length > 0;
  const isMissedOrExpired = shift.status === "expired"
    || anomalyCodes.some((code) => MISSED_OR_INCOMPLETE_CODES.has(code));

  switch (category) {
    case "scheduled":
      return shift.status === "pending" || shift.status === "available";
    case "ongoing":
      return shift.status === "ongoing";
    case "completed":
      return shift.status === "completed";
    case "needs_attention":
      return hasAnomaly;
    case "missed_expired":
      return isMissedOrExpired;
    case "other_anomalies":
      return hasAnomaly && !isMissedOrExpired;
    case "other_statuses":
      return !STANDARD_STATUSES.has(shift.status ?? "");
  }
}

export function shiftCategoryLabel(category: ShiftCategory | null): string {
  return SHIFT_CATEGORY_OPTIONS.find(({ value }) => value === category)?.label ?? "All shifts";
}
