import { format, parseISO } from "date-fns";
import type { Shift } from "@/lib/api/shifts";

export function shiftDeleteConfirmMessage(shift: Shift): string {
  const clientLabel = shift.client
    ? `${shift.client.firstName || ""} ${shift.client.lastName || ""}`.trim() || "this client"
    : "this client";
  const when = shift.date ? format(parseISO(shift.date), "MMMM d, yyyy") : "the scheduled date";
  return `Removes ${clientLabel}'s shift on ${when} from the schedule. This can't be undone.`;
}
