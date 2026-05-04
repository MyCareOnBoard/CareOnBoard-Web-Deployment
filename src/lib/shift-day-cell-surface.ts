import type { CSSProperties } from "react";
import type { AnomalyCode, Shift } from "@/lib/api/shifts";
import { detectShiftAnomalyCodes } from "@/lib/shift-anomaly-detection";
import { getShiftRowStatusInfo } from "@/lib/shift-row-status";

/** Softer full-cell fill than pill; still matches token hue (no border—calendar handles radius). */
const ANOMALY_DAY_SURFACE: Record<AnomalyCode, Pick<CSSProperties, "backgroundColor">> = {
  missed: { backgroundColor: "rgba(255,108,16,0.14)" },
  incomplete_clock: { backgroundColor: "rgba(254, 243, 199, 0.38)" },
  late_clock_in: { backgroundColor: "rgba(251,191,36,0.22)" },
  unassigned: { backgroundColor: "rgba(37,99,235,0.1)" },
  invalid_time: { backgroundColor: "rgba(124,58,237,0.1)" },
};

export function getShiftDayCellSurfaceStyle(shift: Shift): CSSProperties | undefined {
  const codes = detectShiftAnomalyCodes(shift);
  const first = codes[0];
  if (first) {
    return ANOMALY_DAY_SURFACE[first];
  }
  const status = getShiftRowStatusInfo(shift, shift.approved);
  return { backgroundColor: status.bgColor };
}
