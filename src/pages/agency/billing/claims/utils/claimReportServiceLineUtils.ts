import type { ClaimReportServiceLine } from "../data/mockClaimReportData";

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** "2026-10-19" → "10/19/2026"; older claims without a date keep their duration label. */
export function formatServiceLineDate(line: ClaimReportServiceLine): string {
  const match = ISO_DATE.exec(String(line.serviceDate ?? "").trim());
  if (!match) return line.duration;
  return `${match[2]}/${match[3]}/${match[1]}`;
}

/** NPI for box 24J. Older claims stored it as `nipId`. */
export function serviceLineNpi(line: ClaimReportServiceLine): string {
  return line.npi?.trim() || line.nipId?.trim() || "";
}

function parseMoneyToCents(value: string): number {
  const amount = Number.parseFloat(String(value ?? "").replace(/[$,\s]/g, ""));
  return Number.isFinite(amount) ? Math.round(amount * 100) : 0;
}

/** Totals for the footer row: charges as "$1,234.50" and units (blank when no line has units). */
export function sumServiceLines(lines: ClaimReportServiceLine[]): { charges: string; units: string } {
  let cents = 0;
  let units = 0;
  let hasUnits = false;
  for (const line of lines) {
    cents += parseMoneyToCents(line.totalCharges);
    const lineUnits = Number.parseFloat(String(line.units ?? ""));
    if (Number.isFinite(lineUnits)) {
      units += lineUnits;
      hasUnits = true;
    }
  }
  const charges = `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return { charges, units: hasUnits ? String(Math.round(units * 100) / 100) : "" };
}
