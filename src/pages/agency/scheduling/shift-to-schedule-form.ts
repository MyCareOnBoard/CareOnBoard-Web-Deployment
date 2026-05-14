import type { Shift } from "@/lib/api/shifts";
import type { ScheduleFormData } from "./components/AddScheduleModal";
import { ispOutcomesToDisplayText, parseIspOutcomesFromShift } from "./isp-outcomes";

/** Build Add Schedule modal edit payload from an API shift (same mapping as scheduling page `handleEdit`). */
export function shiftToScheduleFormData(shift: Shift): ScheduleFormData {
  const clientName = shift.client
    ? `${shift.client.firstName || ""} ${shift.client.lastName || ""}`.trim() || "Unknown Client"
    : "Unknown Client";
  const employeeName = shift.employee?.fullName || "";
  const anyShift = shift as unknown as Record<string, unknown>;

  const formData = {
    shiftId: shift.id,
    client: clientName,
    clientId: shift.client?.id || "",
    clientLocation: shift.location || null,
    assignedDsp: employeeName,
    assignedDspId: (shift.employee as { id?: string } | undefined)?.id || "",
    billingRate: "",
    serviceCode: shift.serviceCode || "183535",
    notesType: (anyShift.notesType as string) || "",
    comment: (anyShift.comment as string) || "",
    schedulingType: (shift.schedulingType as "one-time" | "recurring" | "") || "one-time",
    date: shift.date ? new Date(shift.date) : null,
    startDate: null,
    endDate: null,
    clockInTime: shift.startTime,
    clockOutTime: shift.endTime || "",
    ispOutcome: ispOutcomesToDisplayText(parseIspOutcomesFromShift(shift.ispOutcome)),
    planOfCare: null,
    submissionStatus: shift.submissionStatus,
    goalsType: (anyShift.goalsType as string) || "",
  } as ScheduleFormData;

  return formData;
}
