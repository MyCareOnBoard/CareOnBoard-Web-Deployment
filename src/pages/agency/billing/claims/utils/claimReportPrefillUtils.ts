import { format, parseISO } from "date-fns";
import type { Client, ClientService } from "@/lib/api/clients";
import type { Shift } from "@/lib/api/shifts";
import { parseSdrWeekRange } from "@/pages/agency/scheduling/weeklyDistributionSchedule";
import {
  type ClaimReportFormState,
  type ClaimReportServiceLine,
  type ClaimReportSummary,
  DIAGNOSIS_CODE_LETTERS,
} from "../data/mockClaimReportData";
import { formatGender } from "@/pages/shared/client-details/tabs/profileTabViewModel";
import {
  computeTotalHours,
  findMatchingClientService,
  resolvePaNumber,
} from "./claimShiftBillingUtils";

export type ClaimReportShiftTiming = {
  serviceDate: string;
  serviceDateIso?: string;
  durationStart: string;
  durationEnd: string;
  totalHours: string;
  serviceCode: string;
  paNumber: string;
};

export type ClaimReportPrefillSnapshot = Pick<
  ClaimReportFormState,
  | "dateOfBirth"
  | "patientSex"
  | "patientAddress"
  | "city"
  | "state"
  | "zipCode"
  | "diagnosisCodes"
  | "paNumber"
> & {
  serviceLines: ClaimReportServiceLine[];
  summary: ClaimReportSummary;
};

type FirestoreTimestamp = { _seconds?: number; _nanoseconds?: number };

const EMPTY_PREFILL_SUMMARY: ClaimReportSummary = {
  totalClaimsProcessed: 0,
  totalUnitsBilled: "0",
  totalBilledHours: "",
  totalClaimAmount: "$0.00",
};

function formatWeekRangeLabel(start: Date, end: Date): string {
  return `${format(start, "M/d/yyyy")} -> ${format(end, "M/d/yyyy")}`;
}

export function resolveSdrWeekRangeDurationLabel(
  shiftDateIso: string | undefined,
  service?: ClientService,
): string {
  const rows = service?.sdrWeeklyDistribution?.rows ?? [];
  if (shiftDateIso && rows.length > 0) {
    for (const row of rows) {
      const bounds = parseSdrWeekRange(row.weekRange);
      if (!bounds) continue;
      const start = format(bounds.start, "yyyy-MM-dd");
      const end = format(bounds.end, "yyyy-MM-dd");
      if (shiftDateIso >= start && shiftDateIso <= end) {
        return formatWeekRangeLabel(bounds.start, bounds.end);
      }
    }
  }

  if (shiftDateIso) {
    try {
      const day = parseISO(shiftDateIso);
      if (!Number.isNaN(day.getTime())) {
        return formatWeekRangeLabel(day, day);
      }
    } catch {
      // fall through
    }
  }

  return "—";
}

export function parseClientDate(
  dateValue?: string | FirestoreTimestamp | Date,
): Date | undefined {
  if (!dateValue) return undefined;
  if (dateValue instanceof Date) return dateValue;
  if (typeof dateValue === "string") {
    const parsed = new Date(dateValue);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }
  if (typeof dateValue === "object" && dateValue._seconds) {
    return new Date(dateValue._seconds * 1000);
  }
  return undefined;
}

export function formatClientDateOfBirth(
  dateValue?: string | FirestoreTimestamp | Date,
): string {
  const parsed = parseClientDate(dateValue);
  if (!parsed) return "";
  return format(parsed, "d MMMM yyyy").toUpperCase();
}

export function splitDiagnosisTextLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function extractDiagnosisCode(line: string): string {
  const trimmed = line.trim();
  if (!trimmed) return "";

  const spaced = trimmed.split(/\s+-\s+/, 2);
  if (spaced.length === 2 && spaced[0].trim()) {
    return spaced[0].trim();
  }

  const hyphenIndex = trimmed.indexOf("-");
  if (hyphenIndex > 0) {
    return trimmed.slice(0, hyphenIndex).trim();
  }

  return trimmed;
}

export function getClientDiagnosisLines(client?: Client): string[] {
  const diagnosis =
    client?.healthcareSafety?.diagnosis ?? client?.diagnosis ?? "";
  return splitDiagnosisTextLines(diagnosis);
}

export function buildDiagnosisCodesMap(lines: string[]): Record<string, string> {
  const empty = Object.fromEntries(DIAGNOSIS_CODE_LETTERS.map((letter) => [letter, ""]));
  const codes: string[] = [];

  for (const line of lines) {
    const code = extractDiagnosisCode(line);
    if (code && !codes.includes(code)) {
      codes.push(code);
    }
  }

  DIAGNOSIS_CODE_LETTERS.forEach((letter, index) => {
    empty[letter] = codes[index] ?? "";
  });

  return empty;
}

export function resolveClientAddressFields(client?: Client): {
  patientAddress: string;
  city: string;
  state: string;
  zipCode: string;
} {
  const patientAddress =
    client?.primaryAddress?.address?.trim() || client?.address?.trim() || "";
  const city =
    client?.primaryAddress?.countyState?.trim() || client?.city?.trim() || "";
  let state = client?.state?.trim() || "";

  if (!state && client?.primaryAddress?.countyState?.includes(",")) {
    const parts = client.primaryAddress.countyState.split(",").map((part) => part.trim());
    if (parts.length >= 2) {
      state = parts[parts.length - 1];
    }
  }

  const zipCode =
    client?.primaryAddress?.zipCode?.trim() || client?.zipCode?.trim() || "";

  return { patientAddress, city, state, zipCode };
}

export function splitServiceCode(code?: string): { cptHcpcs: string; modifier: string } {
  const trimmed = code?.trim() ?? "";
  if (!trimmed) {
    return { cptHcpcs: "", modifier: "-" };
  }

  const match = trimmed.match(/^([A-Z]\d{4})([A-Z]{2})$/i);
  if (match) {
    return { cptHcpcs: match[1].toUpperCase(), modifier: match[2].toUpperCase() };
  }

  return { cptHcpcs: trimmed, modifier: "-" };
}

export function parseRateToNumber(rate?: string): number | null {
  if (!rate?.trim()) return null;
  const cleaned = rate.replace(/[$,/hr\s]/gi, "").trim();
  const value = parseFloat(cleaned);
  return Number.isFinite(value) ? value : null;
}

export function formatClaimCharge(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function computeClaimBilling(
  hours: number,
  rate: number,
  payType?: string,
): { units: number; charge: number } {
  if (!Number.isFinite(hours) || hours <= 0 || !Number.isFinite(rate) || rate <= 0) {
    return { units: 0, charge: 0 };
  }

  const normalizedPayType = payType?.trim().toLowerCase() ?? "";
  const units =
    normalizedPayType === "15-min" ? Math.round(hours * 4) : Math.round(hours * 100) / 100;
  const charge = Math.round(units * rate * 100) / 100;

  return { units, charge };
}

function formatPatientSex(gender?: string): string {
  if (!gender?.trim()) return "";
  const formatted = formatGender(gender);
  return formatted === "Not specified" ? "" : formatted;
}

function normalizePaNumber(paNumber?: string): string {
  const trimmed = paNumber?.trim() ?? "";
  return trimmed === "—" ? "" : trimmed;
}

function parseShiftHours(totalHours: string): number {
  if (!totalHours.trim() || totalHours.trim() === "—") return 0;
  const value = parseFloat(totalHours);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function formatBilledHoursLabel(totalHours: number): string {
  if (!Number.isFinite(totalHours) || totalHours <= 0) return "";
  const rounded = Math.round(totalHours * 100) / 100;
  return `${rounded} hrs`;
}

function buildEmptyPrefillSnapshot(): ClaimReportPrefillSnapshot {
  const emptyDiagnosis = Object.fromEntries(
    DIAGNOSIS_CODE_LETTERS.map((letter) => [letter, ""]),
  );

  return {
    dateOfBirth: "",
    patientSex: "",
    patientAddress: "",
    city: "",
    state: "",
    zipCode: "",
    diagnosisCodes: emptyDiagnosis,
    paNumber: "",
    serviceLines: [],
    summary: EMPTY_PREFILL_SUMMARY,
  };
}

export function buildClaimReportPrefillFromShifts(
  shifts: Shift[],
): ClaimReportPrefillSnapshot {
  if (shifts.length === 0) {
    return buildEmptyPrefillSnapshot();
  }

  const anchorShift = shifts[0];
  const client = anchorShift.client;
  const matchedService = findMatchingClientService(client, anchorShift);
  const address = resolveClientAddressFields(client);
  const diagnosisCodes = buildDiagnosisCodesMap(getClientDiagnosisLines(client));

  const serviceCode =
    matchedService?.code?.trim() || anchorShift.serviceCode?.trim() || "";
  const { cptHcpcs, modifier } = splitServiceCode(serviceCode);

  const rate =
    parseRateToNumber(matchedService?.clientRate) ??
    parseRateToNumber(client?.billingRate);
  const payType = matchedService?.clientPayType ?? matchedService?.payType;

  let totalHoursSum = 0;
  let totalUnits = 0;
  let totalCharge = 0;

  for (const shift of shifts) {
    const shiftService = findMatchingClientService(shift.client, shift) ?? matchedService;
    const shiftRate =
      parseRateToNumber(shiftService?.clientRate) ??
      parseRateToNumber(shift.client?.billingRate) ??
      rate;
    const shiftPayType = shiftService?.clientPayType ?? shiftService?.payType ?? payType;
    const hours = parseShiftHours(computeTotalHours(shift));
    const { units, charge } = computeClaimBilling(hours, shiftRate ?? 0, shiftPayType);

    totalHoursSum += hours;
    totalUnits += units;
    totalCharge += charge;
  }

  const chargeFormatted =
    totalCharge > 0 ? formatClaimCharge(totalCharge) : "$0.00";
  const paNumber = normalizePaNumber(
    resolvePaNumber(client, anchorShift, matchedService),
  );

  const serviceLine: ClaimReportServiceLine = {
    duration: resolveSdrWeekRangeDurationLabel(anchorShift.date, matchedService),
    placeOfService: "99",
    cptHcpcs: cptHcpcs || serviceCode,
    modifier,
    diagnosisPointer: "A",
    totalCharges: chargeFormatted,
    nipId: "",
    providerId: "",
  };

  const summary: ClaimReportSummary = {
    totalClaimsProcessed: shifts.length,
    totalUnitsBilled: totalUnits > 0 ? String(totalUnits) : "0",
    totalBilledHours: formatBilledHoursLabel(totalHoursSum),
    totalClaimAmount: chargeFormatted,
  };

  return {
    dateOfBirth: formatClientDateOfBirth(client?.dateOfBirth),
    patientSex: formatPatientSex(client?.gender),
    patientAddress: address.patientAddress,
    city: address.city,
    state: address.state,
    zipCode: address.zipCode,
    diagnosisCodes,
    paNumber,
    serviceLines: [serviceLine],
    summary,
  };
}

export function buildClaimReportPrefill(
  client: Client | undefined,
  matchedService: ClientService | undefined,
  timing: ClaimReportShiftTiming,
): ClaimReportPrefillSnapshot {
  const address = resolveClientAddressFields(client);
  const diagnosisCodes = buildDiagnosisCodesMap(getClientDiagnosisLines(client));

  const serviceCode = matchedService?.code?.trim() || timing.serviceCode.trim();
  const { cptHcpcs, modifier } = splitServiceCode(serviceCode);

  const hours = parseShiftHours(timing.totalHours);
  const rate =
    parseRateToNumber(matchedService?.clientRate) ??
    parseRateToNumber(client?.billingRate);
  const payType = matchedService?.clientPayType ?? matchedService?.payType;
  const { units, charge } = computeClaimBilling(hours, rate ?? 0, payType);

  const chargeFormatted = charge > 0 ? formatClaimCharge(charge) : "$0.00";
  const paNumber = normalizePaNumber(timing.paNumber);

  const serviceLine: ClaimReportServiceLine = {
    duration: resolveSdrWeekRangeDurationLabel(timing.serviceDateIso, matchedService),
    placeOfService: "99",
    cptHcpcs: cptHcpcs || serviceCode,
    modifier,
    diagnosisPointer: "A",
    totalCharges: chargeFormatted,
    nipId: "",
    providerId: "",
  };

  const summary: ClaimReportSummary = {
    totalClaimsProcessed: 1,
    totalUnitsBilled: units > 0 ? String(units) : "0",
    totalBilledHours: formatBilledHoursLabel(hours),
    totalClaimAmount: chargeFormatted,
  };

  return {
    dateOfBirth: formatClientDateOfBirth(client?.dateOfBirth),
    patientSex: formatPatientSex(client?.gender),
    patientAddress: address.patientAddress,
    city: address.city,
    state: address.state,
    zipCode: address.zipCode,
    diagnosisCodes,
    paNumber,
    serviceLines: [serviceLine],
    summary,
  };
}
