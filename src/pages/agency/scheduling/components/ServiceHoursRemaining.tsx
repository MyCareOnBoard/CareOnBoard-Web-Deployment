import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { getServiceHoursUsage, type ServiceHoursUsage } from "@/lib/api/shifts";

interface ServiceHoursRemainingProps {
  agencyId: string;
  clientId: string;
  serviceCode: string;
  serviceAuthorizationId?: string;
  /** Shift date (or recurring start); picks the week and authorization window. */
  date: Date | null;
  /** When editing, leave the shift's own hours out of "used". */
  excludeShiftId?: string;
}

const number = (n: number) => String(Math.round(n * 100) / 100);
const shortDate = (ymd: string) => {
  try {
    return format(parseISO(ymd), "MMM d, yyyy");
  } catch {
    return ymd;
  }
};

/** "What's left" lines for the selected service: this week's hours and the authorization total. */
export function serviceHoursRemainingLines(usage: ServiceHoursUsage): { text: string; exhausted: boolean }[] {
  const lines: { text: string; exhausted: boolean }[] = [];
  if (usage.weekly) {
    const w = usage.weekly;
    lines.push({
      text: `This week: ${number(Math.max(0, w.remainingHours))} of ${number(w.capHours)} h left`,
      exhausted: w.remainingHours <= 0,
    });
  }
  if (usage.total) {
    const t = usage.total;
    const through = t.endDate ? ` through ${shortDate(t.endDate)}` : "";
    const text = t.capUnits != null && t.remainingUnits != null
      ? `Authorization: ${number(Math.max(0, t.remainingUnits))} of ${number(t.capUnits)} units left (${number(Math.max(0, t.remainingHours))} h)${through}`
      : `Authorization: ${number(Math.max(0, t.remainingHours))} of ${number(t.capHours)} h left${through}`;
    lines.push({ text, exhausted: t.remainingHours <= 0 });
  }
  return lines;
}

export function ServiceHoursRemaining({
  agencyId,
  clientId,
  serviceCode,
  serviceAuthorizationId,
  date,
  excludeShiftId,
}: ServiceHoursRemainingProps) {
  const [usage, setUsage] = useState<ServiceHoursUsage | null>(null);
  const day = format(date ?? new Date(), "yyyy-MM-dd");

  useEffect(() => {
    setUsage(null);
    if (!agencyId || !clientId || !serviceCode) return undefined;
    const controller = new AbortController();
    getServiceHoursUsage(
      {
        agencyId,
        clientId,
        serviceCode,
        date: day,
        ...(serviceAuthorizationId ? { serviceAuthorizationId } : {}),
        ...(excludeShiftId ? { excludeShiftId } : {}),
      },
      { signal: controller.signal },
    )
      .then((result) => {
        if (!controller.signal.aborted) setUsage(result);
      })
      // The server still enforces the limits on save; the hint is best-effort.
      .catch(() => undefined);
    return () => controller.abort();
  }, [agencyId, clientId, serviceCode, serviceAuthorizationId, day, excludeShiftId]);

  if (!usage) return null;
  const lines = serviceHoursRemainingLines(usage);
  if (!lines.length) return null;
  return (
    <>
      {lines.map((line) => (
        <span
          key={line.text}
          data-testid="service-hours-remaining"
          className={`text-[12px] ${line.exhausted ? "font-medium text-[#b42318]" : "font-normal text-[#808081]"}`}
        >
          {line.text}
        </span>
      ))}
    </>
  );
}
