import { IncidentStatus, type IncidentReport } from "@/lib/api/incidents";
import { cn } from "@/lib/utils";

/** Submitted and under-review incidents both wait for a reviewer. */
export const isPending = (status: IncidentStatus) =>
  status === IncidentStatus.SUBMITTED || status === IncidentStatus.UNDER_REVIEW;

export function clientNameOf(incident: IncidentReport) {
  const full = [incident.client?.firstName, incident.client?.lastName].filter(Boolean).join(" ").trim();
  return full || incident.clientName || "Unknown client";
}

/** The form sends a plain day ("2026-11-22"); read it as that local day, not UTC midnight. */
function incidentDay(incident: IncidentReport): Date | null {
  const raw = incident.date || incident.incidentDate;
  if (!raw) return null;
  const plain = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  const date = plain ? new Date(Number(plain[1]), Number(plain[2]) - 1, Number(plain[3])) : new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "07:52" from the form's "HH:mm", or the time part of a full timestamp. */
function incidentTime(incident: IncidentReport): string | null {
  const raw = incident.time || incident.incidentDate;
  if (!raw) return null;
  const plain = /^(\d{1,2}):(\d{2})/.exec(raw);
  if (plain && !raw.includes("T")) return `${plain[1].padStart(2, "0")}:${plain[2]}`;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

/** "22 Nov" (plus the year when it is not this year) and "08:10", for the list. */
export function formatDayAndTime(incident: IncidentReport) {
  const day = incidentDay(incident);
  const sameYear = day?.getFullYear() === new Date().getFullYear();
  return {
    day: day ? day.toLocaleDateString("en-GB", { day: "numeric", month: "short", ...(sameYear ? {} : { year: "numeric" }) }) : "Date not recorded",
    time: incidentTime(incident),
  };
}

/** "22 Nov 2026, 07:52" for the detail panel. */
export function formatWhen(incident: IncidentReport) {
  const day = incidentDay(incident);
  const time = incidentTime(incident);
  if (!day) return time ?? "Not recorded";
  const text = day.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  return time ? `${text}, ${time}` : text;
}

export function witnessText(witness: IncidentReport["witness"]) {
  if (!witness) return "None recorded";
  if (typeof witness === "string") return witness.trim() || "None recorded";
  const parts = [
    witness.name,
    witness.relationship && `(${witness.relationship})`,
    witness.contactInfo && `· ${witness.contactInfo}`,
  ].filter(Boolean);
  return parts.length ? parts.join(" ") : "None recorded";
}

const STATUS: Record<"pending" | "resolved" | "notResolved", { label: string; pill: string; dot: string }> = {
  pending: { label: "Under review", pill: "bg-[#fcf5dc] text-[#7a5800] dark:bg-[#e0b400]/15 dark:text-[#f0cf6b]", dot: "bg-[#e0b400]" },
  resolved: { label: "Resolved", pill: "bg-[#e6f6ec] text-[#1a7f37] dark:bg-[#30a46c]/15 dark:text-[#7ee2a8]", dot: "bg-[#30a46c]" },
  notResolved: { label: "Not resolved", pill: "bg-[#fde8e6] text-[#b42318] dark:bg-[#ef4444]/15 dark:text-[#f8a1a1]", dot: "bg-[#e5484d]" },
};

export function IncidentStatusPill({ status, className }: { status: IncidentStatus; className?: string }) {
  const meta = status === IncidentStatus.RESOLVED ? STATUS.resolved
    : status === IncidentStatus.NOT_RESOLVED ? STATUS.notResolved
      : STATUS.pending;
  return (
    <span className={cn("inline-flex h-6 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[6px] px-2 text-[12px] font-medium", meta.pill, className)}>
      <span aria-hidden="true" className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />{meta.label}
    </span>
  );
}
