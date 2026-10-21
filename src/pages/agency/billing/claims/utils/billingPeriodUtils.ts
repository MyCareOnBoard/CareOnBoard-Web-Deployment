/**
 * Billing periods: which shifts and rides go on the same claim. Mirrors the
 * backend (functions/utils/billing-period.js) so ready-to-bill rows built in the
 * browser group the same way as the rows the API returns.
 *
 * A claim covers one client, one service code and one period: the SDR week that
 * contains the date when the service has one, otherwise the agency billing period
 * (weekly by default), clipped to the service's authorization window. Periods are
 * labelled like SDR weeks ("10/18/2026 - 10/24/2026").
 */
import type { ClientService } from "@/lib/api/clients";
import { parseSdrWeekRange } from "@/pages/agency/scheduling/weeklyDistributionSchedule";
import { format } from "date-fns";

export const BILLING_PERIODS = ["weekly", "biweekly", "semimonthly", "monthly"] as const;
export type BillingPeriod = (typeof BILLING_PERIODS)[number];

export type BillingPeriodOptions = {
  billingPeriod?: string | null;
  billingPeriodAnchor?: string | null;
};

export const BILLING_PERIOD_LABELS: Record<BillingPeriod, string> = {
  weekly: "Weekly (Sunday to Saturday)",
  biweekly: "Every two weeks",
  semimonthly: "Twice a month (1st to 15th, 16th to end)",
  monthly: "Monthly",
};

const DEFAULT_BIWEEKLY_ANCHOR = "2026-01-04";
const DAY_MS = 24 * 60 * 60 * 1000;
const YMD = /^(\d{4})-(\d{2})-(\d{2})$/;

function ymdToUtc(ymd: string | null | undefined): number | null {
  const match = YMD.exec(String(ymd ?? "").trim());
  if (!match) return null;
  const time = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return new Date(time).getUTCDate() === Number(match[3]) ? time : null;
}

function utcToYmd(time: number): string {
  return new Date(time).toISOString().slice(0, 10);
}

export function normalizeBillingPeriod(value: string | null | undefined): BillingPeriod {
  const period = String(value ?? "").trim().toLowerCase();
  return (BILLING_PERIODS as readonly string[]).includes(period) ? (period as BillingPeriod) : "weekly";
}

export function agencyPeriodBounds(
  ymd: string,
  options: BillingPeriodOptions = {},
): { start: string; end: string } | null {
  const time = ymdToUtc(ymd);
  if (time === null) return null;
  const date = new Date(time);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();

  switch (normalizeBillingPeriod(options.billingPeriod)) {
    case "monthly":
      return { start: utcToYmd(Date.UTC(year, month, 1)), end: utcToYmd(Date.UTC(year, month + 1, 0)) };
    case "semimonthly":
      return day <= 15
        ? { start: utcToYmd(Date.UTC(year, month, 1)), end: utcToYmd(Date.UTC(year, month, 15)) }
        : { start: utcToYmd(Date.UTC(year, month, 16)), end: utcToYmd(Date.UTC(year, month + 1, 0)) };
    case "biweekly": {
      const anchor = ymdToUtc(options.billingPeriodAnchor) ?? (ymdToUtc(DEFAULT_BIWEEKLY_ANCHOR) as number);
      const index = Math.floor((time - anchor) / (14 * DAY_MS));
      const start = anchor + index * 14 * DAY_MS;
      return { start: utcToYmd(start), end: utcToYmd(start + 13 * DAY_MS) };
    }
    default: {
      const start = time - date.getUTCDay() * DAY_MS;
      return { start: utcToYmd(start), end: utcToYmd(start + 6 * DAY_MS) };
    }
  }
}

function formatSide(ymd: string): string {
  const [year, month, day] = ymd.split("-").map(Number);
  return `${month}/${day}/${year}`;
}

export function formatBillingPeriodLabel(bounds: { start: string; end: string }): string {
  return `${formatSide(bounds.start)} - ${formatSide(bounds.end)}`;
}

function authDateYmd(value?: string): string | null {
  const text = String(value ?? "").trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  if (!text) return null;
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

function findSdrWeekRange(service: ClientService | undefined, ymd: string): string | null {
  for (const row of service?.sdrWeeklyDistribution?.rows ?? []) {
    const bounds = parseSdrWeekRange(row.weekRange);
    if (!bounds) continue;
    if (ymd >= format(bounds.start, "yyyy-MM-dd") && ymd <= format(bounds.end, "yyyy-MM-dd")) {
      return row.weekRange?.trim() || null;
    }
  }
  return null;
}

/** Billing period label for a shift or ride date (YYYY-MM-DD). */
export function resolveBillingPeriodLabel(
  ymd: string | null | undefined,
  service: ClientService | undefined,
  options: BillingPeriodOptions = {},
): string | null {
  const date = String(ymd ?? "").trim();
  if (!date) return null;
  const sdrWeek = findSdrWeekRange(service, date);
  if (sdrWeek) return sdrWeek;
  const bounds = agencyPeriodBounds(date, options);
  if (!bounds) return date;

  const authStart = authDateYmd(service?.startAuthDate);
  const authEnd = authDateYmd(service?.endAuthDate);
  const insideAuthorization = (!authStart || date >= authStart) && (!authEnd || date <= authEnd);
  if (insideAuthorization) {
    if (authStart && bounds.start < authStart) bounds.start = authStart;
    if (authEnd && bounds.end > authEnd) bounds.end = authEnd;
  }
  return formatBillingPeriodLabel(bounds);
}
