import type { Shift } from "@/lib/api/shifts";
import { ShiftStatus } from "@/lib/api/shifts";
import { detectShiftAnomalyCodes } from "@/lib/shift-anomaly-detection";
import { isShiftMissed } from "@/lib/shift-row-status";
import type { ShiftStatusBadgeVariant } from "@/lib/shift-visual-tokens";

export type ShiftStatusBadgePresentation = {
  label: string;
  variant: ShiftStatusBadgeVariant;
};

/** Same rules as agency shift-details status badge (list rows / calendar). */
export function getShiftStatusBadgePresentation(shift: Shift): ShiftStatusBadgePresentation {
  if (isShiftMissed(shift)) {
    return { label: "Missed", variant: "shiftMissed" };
  }
  if (detectShiftAnomalyCodes(shift).includes("incomplete_clock")) {
    return { label: "Incomplete", variant: "shiftIncomplete" };
  }
  switch (shift.status) {
    case ShiftStatus.ONGOING:
      return { label: "Active", variant: "shiftActive" };
    case ShiftStatus.COMPLETED:
      return { label: "Completed", variant: "shiftCompleted" };
    case ShiftStatus.PENDING:
      return { label: "Pending", variant: "shiftPending" };
    case ShiftStatus.AVAILABLE:
      return { label: "Available", variant: "shiftAvailable" };
    case ShiftStatus.EXPIRED:
      return { label: "Missed", variant: "shiftMissed" };
    default:
      return { label: String(shift.status), variant: "shiftPending" };
  }
}
