import { format } from "date-fns";
import type { Client, ClientService } from "@/lib/api/clients";
import {
  DIAGNOSIS_CODE_LETTERS,
  type ClaimReportFormState,
  type ClaimReportServiceLine,
  type ClaimReportSummary,
} from "../data/mockClaimReportData";
import { formatGender } from "@/pages/shared/client-details/tabs/profileTabViewModel";

export type ClaimReportShiftTiming = {
  serviceDate: string;
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
  | "chargesAmount"
  | "paNumber"
> & {
  serviceLines: [ClaimReportServiceLine];
  summary: ClaimReportSummary;
};

type FirestoreTimestamp = { _seconds?: number; _nanoseconds?: number };

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

function buildDurationLabel(timing: ClaimReportShiftTiming): string {
  const start = timing.durationStart.trim();
  const end = timing.durationEnd.trim();
  if (start && end && start !== "—" && end !== "—") {
    return `${start}–${end}`;
  }

  return timing.serviceDate.trim() || "—";
}

function resolveAuthorizedHoursLabel(matchedService?: ClientService): string {
  const raw = matchedService?.totalHours?.trim() ?? "";
  if (!raw) return "";
  return raw.toLowerCase().includes("hr") ? raw : `${raw} hrs`;
}

export function buildClaimReportPrefill(
  client: Client | undefined,
  matchedService: ClientService | undefined,
  timing: ClaimReportShiftTiming,
): ClaimReportPrefillSnapshot {
  const address = resolveClientAddressFields(client);
  const diagnosisCodes = buildDiagnosisCodesMap(getClientDiagnosisLines(client));
  const hasDiagnosis = DIAGNOSIS_CODE_LETTERS.some((letter) => diagnosisCodes[letter]?.trim());

  const serviceCode = matchedService?.code?.trim() || timing.serviceCode.trim();
  const { cptHcpcs, modifier } = splitServiceCode(serviceCode);

  const hours = parseFloat(timing.totalHours);
  const rate =
    parseRateToNumber(matchedService?.clientRate) ??
    parseRateToNumber(client?.billingRate);
  const payType = matchedService?.clientPayType ?? matchedService?.payType;
  const { units, charge } = computeClaimBilling(hours, rate ?? 0, payType);

  const chargeFormatted = charge > 0 ? formatClaimCharge(charge) : "$0.00";
  const chargeAmount = charge > 0 ? charge.toFixed(2) : "0.00";
  const paNumber = normalizePaNumber(timing.paNumber);

  const serviceLine: ClaimReportServiceLine = {
    duration: buildDurationLabel(timing),
    placeOfService: matchedService?.location?.trim() || "99",
    emg: "-",
    cptHcpcs: cptHcpcs || serviceCode,
    modifier,
    diagnosisPointer: hasDiagnosis ? "A" : "",
    charges: chargeFormatted,
    epsotFamilyPlan: "-",
    idQual1: client?.medicaidId?.trim() ?? "",
  };

  const summary: ClaimReportSummary = {
    totalClaimsProcessed: 1,
    totalUnitsBilled: units > 0 ? String(units) : "0",
    totalAuthorizedHours: resolveAuthorizedHoursLabel(matchedService),
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
    chargesAmount: chargeAmount,
    paNumber,
    serviceLines: [serviceLine],
    summary,
  };
}
