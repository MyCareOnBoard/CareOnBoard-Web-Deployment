import type { ShiftDateRangeValue } from "@/components/shifts/ShiftDateRangeControl";

function formatLocalDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function resolveShiftMaintenanceDateRange(
  search: string,
  now = new Date(),
): ShiftDateRangeValue {
  const params = new URLSearchParams(search);
  const startDate = params.get("startDate") ?? "";
  const endDate = params.get("endDate") ?? "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(startDate) && /^\d{4}-\d{2}-\d{2}$/.test(endDate) && startDate <= endDate) {
    return { startDate, endDate };
  }

  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  start.setDate(start.getDate() - 29);
  return { startDate: formatLocalDate(start), endDate: formatLocalDate(now) };
}
