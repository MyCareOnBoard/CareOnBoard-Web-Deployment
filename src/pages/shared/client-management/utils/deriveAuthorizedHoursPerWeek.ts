/**
 * Best-effort weekly authorization hours for SDR-shaped weekly distributions.
 * ISP-only rows may omit parsable weekly hours; callers keep manual `hours` in that case.
 */

export type WeeklyDistLike =
  | {
      standardLine?: string;
      rows?: Array<Partial<{ hours?: string; weekRange?: string; units?: string }>>;
    }
  | null
  | undefined;

export function parseHoursFromCell(raw: string | undefined): number | undefined {
  const str = String(raw ?? "").trim();
  if (!str) return undefined;

  const num = (s: string): number | undefined => {
    const n = Number(s);
    return Number.isFinite(n) ? n : undefined;
  };

  /** `10 hrs`, `10hrs`, `10.5 hours`, `10 hour` */
  const mWithUnit = str.match(/^(\d+(?:\.\d+)?)\s*(?:hours?|hrs)\b/i);
  if (mWithUnit) return num(mWithUnit[1]);

  /** `hours: 7`, `hour = 12`, `hours=3` */
  const labelBefore = str.match(/^\s*hours?\s*[=:]\s*(\d+(?:\.\d+)?)\s*$/i);
  if (labelBefore) return num(labelBefore[1]);

  /** Lone `10 h`. */
  const loneH = str.match(/^(\d+(?:\.\d+)?)\s*h\b/i);
  if (loneH) return num(loneH[1]);

  /** Pure numeric cell: `10` / `10.25` — rejects multi-number prose like ranges. */
  if (/^[0-9]+(?:\.[0-9]+)?\s*$/.test(str)) return num(str.trim());

  return undefined;
}

function hoursFromStandardLine(standardLine: string | undefined): number | undefined {
  const line = String(standardLine ?? "").trim();
  if (!line) return undefined;
  const m = line.match(/\b(\d+)\s*@\s*(\d+)\s*Min\b/i);
  if (!m) return undefined;
  const units = Number(m[1]);
  const mins = Number(m[2]);
  if (!Number.isFinite(units) || !Number.isFinite(mins)) return undefined;
  const h = (units * mins) / 60;
  return Number.isFinite(h) ? h : undefined;
}

export function formatHoursStored(n: number): string {
  if (Number.isInteger(n)) return String(Math.round(n));
  const rounded = Math.round(n * 10000) / 10000;
  return String(rounded);
}

export type WeeklyDistributionScalars = {
  hoursPerWeek?: string;
  totalApprovedHours?: string;
};

/**
 * Derive weekly authorization scalars in one pass over rows.
 * `hoursPerWeek`: first parsable row hours, else `@ N Min` from standard line.
 * `totalApprovedHours`: sum of all parsable row hours.
 */
export function deriveWeeklyDistributionScalars(wd: WeeklyDistLike): WeeklyDistributionScalars {
  if (!wd || typeof wd !== "object") return {};
  const rows = Array.isArray(wd.rows) ? wd.rows : [];
  let hoursPerWeek: string | undefined;
  let totalSum = 0;
  let hasTotal = false;

  for (const r of rows) {
    const h = parseHoursFromCell(r?.hours);
    if (h === undefined) continue;
    if (hoursPerWeek === undefined) hoursPerWeek = formatHoursStored(h);
    totalSum += h;
    hasTotal = true;
  }

  if (hoursPerWeek === undefined) {
    const fromLine = hoursFromStandardLine(wd.standardLine);
    if (fromLine !== undefined) hoursPerWeek = formatHoursStored(fromLine);
  }

  return {
    ...(hoursPerWeek !== undefined ? { hoursPerWeek } : {}),
    ...(hasTotal ? { totalApprovedHours: formatHoursStored(totalSum) } : {}),
  };
}

/** Sum of parsable hours across all weekly distribution rows. */
export function deriveTotalApprovedHoursFromWeeklyDistribution(
  wd: WeeklyDistLike,
): string | undefined {
  return deriveWeeklyDistributionScalars(wd).totalApprovedHours;
}

/**
 * Derive `service.hours` (authorized hours per week) string from weekly distribution.
 * Prefer first parsable Hours cell in rows; else parse `@ N Min` from standard line (first occurrence).
 */
export function deriveAuthorizedHoursPerWeek(wd: WeeklyDistLike): string | undefined {
  return deriveWeeklyDistributionScalars(wd).hoursPerWeek;
}
