import type { AnomalyCode } from "@/lib/api/shifts";

/**
 * Single palette for shift status (list pills, detail badges) and overlapping anomalies.
 * Border + fill + text use the same accent as scheduling / DSP shift rows.
 */
export const SHIFT_ROW_PILL = {
  missed: { color: "#FF6C10", bgColor: "rgba(255,108,16,0.05)" },
  incomplete: { color: "#B45309", bgColor: "rgba(254, 243, 199, 0.65)" },
  late: { color: "#b45309", bgColor: "rgba(251,191,36,0.18)" },
  active: { color: "#0EAF52", bgColor: "rgba(14,175,82,0.05)" },
  completed: { color: "#525253", bgColor: "rgba(178,178,179,0.05)" },
  pending: { color: "#808081", bgColor: "rgba(128,128,129,0.05)" },
  available: { color: "#00b4b8", bgColor: "rgba(0,180,184,0.05)" },
} as const;

/** Anomaly chips (shift details, maintenance, modal): literals for Tailwind JIT. */
export const ANOMALY_CHIP_CLASS: Record<AnomalyCode, string> = {
  missed: "border border-[#FF6C10] bg-[rgba(255,108,16,0.05)] text-[#FF6C10]",
  incomplete_clock: "border border-[#B45309] bg-[rgba(254,243,199,0.65)] text-[#B45309]",
  late_clock_in: "border border-[#d97706] bg-[rgba(251,191,36,0.18)] text-[#b45309]",
  unassigned: "border border-[#2563eb] bg-[rgba(37,99,235,0.08)] text-[#2563eb]",
  invalid_time: "border border-[#7c3aed] bg-[rgba(124,58,237,0.08)] text-[#7c3aed]",
};

/** Agency shift-details Badge variants (document badges keep success / expired / pending). */
export const SHIFT_STATUS_BADGE_CLASS = {
  shiftMissed: "border-[#FF6C10] bg-[rgba(255,108,16,0.05)] text-[#FF6C10]",
  shiftIncomplete: "border-[#B45309] bg-[rgba(254,243,199,0.65)] text-[#B45309]",
  shiftActive: "border-[#0EAF52] bg-[rgba(14,175,82,0.05)] text-[#0EAF52]",
  shiftCompleted: "border-[#525253] bg-[rgba(178,178,179,0.05)] text-[#525253]",
  shiftPending: "border-[#808081] bg-[rgba(128,128,129,0.05)] text-[#808081]",
  shiftAvailable: "border-[#00b4b8] bg-[rgba(0,180,184,0.05)] text-[#00b4b8]",
} as const;

export type ShiftStatusBadgeVariant = keyof typeof SHIFT_STATUS_BADGE_CLASS;
