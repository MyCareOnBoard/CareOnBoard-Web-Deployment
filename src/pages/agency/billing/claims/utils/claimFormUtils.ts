import { format, parse } from "date-fns";
import type { RecentClaim } from "../data/mockClaimsDashboardData";

export type ClaimFormState = {
  staffId: string;
  paNumber: string;
  totalHours: number;
  rate: string;
  serviceDateIso: string;
  durationStart24h: string;
  durationEnd24h: string;
};

const SERVICE_DATE_FORMAT = "MMMM d, yyyy";

function parseDisplayTime(time: string): { hours: number; minutes: number } | null {
  const match = time.match(/(\d{1,2})[.:](\d{2})\s*([AaPp][Mm])/);
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();

  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;

  return { hours, minutes };
}

export function displayTimeTo24h(time: string): string {
  const parsed = parseDisplayTime(time);
  if (!parsed) return "";

  const hours = parsed.hours.toString().padStart(2, "0");
  const minutes = parsed.minutes.toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function time24hToDisplay(time24h: string): string {
  if (!time24h) return "";

  const [hoursStr, minutes] = time24h.split(":");
  let hours = parseInt(hoursStr, 10);
  const period = hours >= 12 ? "PM" : "AM";

  if (hours === 0) {
    hours = 12;
  } else if (hours > 12) {
    hours -= 12;
  }

  const paddedMinutes = minutes.padStart(2, "0");
  const hourPart =
    period === "PM" && hours < 10 ? hours.toString().padStart(2, "0") : String(hours);

  return `${hourPart}:${paddedMinutes} ${period}`;
}

export function serviceDateToIso(serviceDate: string): string {
  try {
    const parsed = parse(serviceDate, SERVICE_DATE_FORMAT, new Date());
    return format(parsed, "yyyy-MM-dd");
  } catch {
    return "";
  }
}

export function isoToServiceDateLabel(iso: string): string {
  if (!iso) return "";
  return format(new Date(iso), SERVICE_DATE_FORMAT);
}

export function getInitialFormState(claim: RecentClaim): ClaimFormState {
  return {
    staffId: claim.staffId,
    paNumber: claim.paNumber,
    totalHours: parseFloat(claim.totalHours) || 0,
    rate: claim.rate,
    serviceDateIso: serviceDateToIso(claim.serviceDate),
    durationStart24h: displayTimeTo24h(claim.durationStart),
    durationEnd24h: displayTimeTo24h(claim.durationEnd),
  };
}

export function formStateToClaim(form: ClaimFormState, original: RecentClaim): RecentClaim {
  return {
    ...original,
    staffId: form.staffId.trim(),
    paNumber: form.paNumber.trim(),
    totalHours: String(form.totalHours),
    rate: form.rate.trim(),
    serviceDate: isoToServiceDateLabel(form.serviceDateIso),
    durationStart: time24hToDisplay(form.durationStart24h),
    durationEnd: time24hToDisplay(form.durationEnd24h),
  };
}
