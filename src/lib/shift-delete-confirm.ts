import { format, parseISO } from "date-fns";
import type { Shift } from "@/lib/api/shifts";

export function shiftDeleteConfirmMessage(shift: Shift, agencyName?: string): string {
  const clientLabel = shift.client
    ? `${shift.client.firstName || ""} ${shift.client.lastName || ""}`.trim() || "this client"
    : "this client";
  const when = shift.date ? format(parseISO(shift.date), "MMMM d, yyyy") : "the scheduled date";
  const agencyPrefix = agencyName?.trim() ? `At ${agencyName.trim()}, ` : "";
  return `${agencyPrefix}removes ${clientLabel}'s shift on ${when} from the schedule. This can't be undone.`;
}
