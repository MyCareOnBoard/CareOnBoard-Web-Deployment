import type {
  ListShiftsParams,
  ListShiftsResponse,
  Shift,
} from "@/lib/api/shifts";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function scopedShiftListParams(
  agencyId: string,
  search: string,
  clientType?: "ddd" | "hha",
): ListShiftsParams {
  const query = new URLSearchParams(search);
  const startDate = query.get("startDate")?.trim();
  const endDate = query.get("endDate")?.trim();
  const hasRange = Boolean(
    startDate && endDate && DATE_PATTERN.test(startDate) && DATE_PATTERN.test(endDate),
  );
  const normalizedAgencyId = agencyId.trim();

  return {
    ...(hasRange ? { startDate, endDate } : {}),
    client: true,
    employee: true,
    agency: true,
    ...(clientType ? { clientType } : {}),
    limit: hasRange ? 200 : 100,
    ...(normalizedAgencyId ? { agencyId: normalizedAgencyId } : {}),
  };
}

export async function loadAllShiftPages(
  fetchPage: (params: ListShiftsParams) => Promise<ListShiftsResponse>,
  params: ListShiftsParams,
): Promise<Shift[]> {
  const shifts = new Map<string, Shift>();
  const seenCursors = new Set<string>();
  let startAfter: string | undefined;

  do {
    const response = await fetchPage({
      ...params,
      ...(startAfter ? { startAfter } : {}),
    });
    response.shifts.forEach((shift) => shifts.set(shift.id, shift));

    const nextCursor = response.nextCursor?.trim() || undefined;
    if (nextCursor && seenCursors.has(nextCursor)) {
      throw new Error("Repeated shift cursor received from the server.");
    }
    if (nextCursor) seenCursors.add(nextCursor);
    startAfter = nextCursor;
  } while (startAfter);

  return [...shifts.values()];
}

export function operationAgencyId(shift: Shift, selectedAgencyId: string): string {
  const agencyId = shift.agencyId?.trim() || selectedAgencyId.trim();
  if (!agencyId) throw new Error("Shift agency is missing.");
  return agencyId;
}
