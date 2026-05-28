/**
 * Normalize SDR weekly distribution rows: derivation scans up to WEEKLY_DIST_DERIVE_SCAN_MAX;
 * persisted payloads truncate to WEEKLY_DIST_DISPLAY_CAP.
 */

import { deriveWeeklyDistributionScalars } from "./deriveAuthorizedHoursPerWeek";

export const WEEKLY_DIST_DISPLAY_CAP = 120;

/** Caps how many Excel-style rows participate in derivation (pathological payloads). */
export const WEEKLY_DIST_DERIVE_SCAN_MAX = 2000;

export type SanitizedWeeklyRow = { weekRange?: string; units?: string; hours?: string };

export type WeeklyDistributionDraftRow = SanitizedWeeklyRow & { rowKey: string };

/** Build stable-index editor rows from persisted weekly distribution (for inline edit UI). */
export function draftFromWd(wd: {
  rows?: ReadonlyArray<Partial<SanitizedWeeklyRow>>;
}): WeeklyDistributionDraftRow[] {
  return (wd.rows ?? []).slice(0, WEEKLY_DIST_DISPLAY_CAP).map((r, i) => ({
    rowKey: `wd-row-${i}`,
    weekRange: r.weekRange ?? "",
    units: r.units ?? "",
    hours: r.hours ?? "",
  }));
}

/** Serialize editor draft back to persisted weekly distribution shape. */
export function wdFromDraft(
  standardLine: string,
  rows: WeeklyDistributionDraftRow[],
): { standardLine?: string; rows?: SanitizedWeeklyRow[] } {
  const sanitized = rows
    .map((r) => ({
      weekRange: (r.weekRange ?? "").trim(),
      units: (r.units ?? "").trim(),
      hours: (r.hours ?? "").trim(),
    }))
    .filter((r) => r.weekRange || r.units || r.hours);
  return {
    ...(standardLine.trim() ? { standardLine: standardLine.trim() } : {}),
    ...(sanitized.length ? { rows: sanitized } : {}),
  };
}

/** Fingerprint keyed on WD content only (immutable spread updates assumed). */
export function weeklyDistributionFingerprintFromWd(wd: {
  standardLine?: string;
  rows?: ReadonlyArray<Partial<{ weekRange?: string; units?: string; hours?: string }>>;
} | null | undefined): string {
  if (!wd || typeof wd !== "object") return "::";
  const line = (wd.standardLine ?? "").trim();
  const rows = wd.rows ?? [];
  const rowSig = rows
    .map(
      (r) =>
        `${(r.weekRange ?? "").trim()}|${(r.units ?? "").trim()}|${(r.hours ?? "").trim()}`,
    )
    .join(";");
  return `${line}:${rowSig}`;
}

/**
 * Parses and trims rows from extractor/API shape without persist cap (bounded by WEEKLY_DIST_DERIVE_SCAN_MAX).
 */
export function parseWeeklyDistributionRows(rowsRaw: unknown[]): SanitizedWeeklyRow[] {
  const rows: SanitizedWeeklyRow[] = [];
  const limit = Math.min(rowsRaw.length, WEEKLY_DIST_DERIVE_SCAN_MAX);
  for (let i = 0; i < limit; i++) {
    const r = rowsRaw[i];
    if (!r || typeof r !== "object") continue;
    const row = r as Record<string, unknown>;
    const weekRange = typeof row.weekRange === "string" ? row.weekRange.trim() : "";
    const units = typeof row.units === "string" ? row.units.trim() : "";
    const hours = typeof row.hours === "string" ? row.hours.trim() : "";
    if (weekRange || units || hours) rows.push({ weekRange, units, hours });
  }
  return rows;
}

export function truncateWeeklyRows(rows: SanitizedWeeklyRow[], cap: number): SanitizedWeeklyRow[] {
  return rows.slice(0, cap);
}

/** Raw Firestore-ish / merged object → trimmed standard line + all sanitized rows (derive scan cap). */
export function sanitizeWeeklyPartsFromUnknown(
  raw: unknown,
): { standardLineTrimmed: string; fullSanitizedRows: SanitizedWeeklyRow[] } | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const w = raw as Record<string, unknown>;
  const standardLineTrimmed =
    typeof w.standardLine === "string" ? w.standardLine.trim() : "";
  const rowsRaw = Array.isArray(w.rows) ? w.rows : [];
  const fullSanitizedRows = parseWeeklyDistributionRows(rowsRaw);
  if (!standardLineTrimmed && fullSanitizedRows.length === 0) return undefined;
  return { standardLineTrimmed, fullSanitizedRows };
}

export function weeklyDistributionForDerivation(parts: {
  standardLineTrimmed: string;
  fullSanitizedRows: SanitizedWeeklyRow[];
}): { standardLine?: string; rows: SanitizedWeeklyRow[] } {
  const rows = parts.fullSanitizedRows;
  return {
    ...(parts.standardLineTrimmed ? { standardLine: parts.standardLineTrimmed } : {}),
    rows,
  };
}

/** Minimal shape aligned with ClientService[`sdrWeeklyDistribution`]. */
export type ClientServiceWeeklyDist =
  | {
      standardLine?: string;
      rows?: SanitizedWeeklyRow[];
    }
  | undefined;

export type CapPersistAndDeriveResult = {
  persisted: ClientServiceWeeklyDist;
  hours: string;
  totalHours: string;
  truncatedRowCount: number;
};

/** Cap rows for persist, derive scalars from capped rows only (single pipeline). */
export function capPersistAndDerive(
  parts: { standardLineTrimmed: string; fullSanitizedRows: SanitizedWeeklyRow[] },
  cap: number = WEEKLY_DIST_DISPLAY_CAP,
): CapPersistAndDeriveResult {
  const truncatedRowCount = Math.max(0, parts.fullSanitizedRows.length - cap);
  const cappedRows = truncateWeeklyRows(parts.fullSanitizedRows, cap);
  const standardLine = parts.standardLineTrimmed;
  const persisted: ClientServiceWeeklyDist =
    !standardLine && cappedRows.length === 0
      ? undefined
      : {
          ...(standardLine ? { standardLine } : {}),
          ...(cappedRows.length ? { rows: cappedRows } : {}),
        };

  const scalars = deriveWeeklyDistributionScalars(
    weeklyDistributionForDerivation({
      standardLineTrimmed: standardLine,
      fullSanitizedRows: cappedRows,
    }),
  );

  return {
    persisted,
    hours: scalars.hoursPerWeek ?? "",
    totalHours: scalars.totalHours ?? "",
    truncatedRowCount,
  };
}

/** Shape stored on client service / wizard (rows capped). */
export function weeklyDistributionForPersist(
  parts: { standardLineTrimmed: string; fullSanitizedRows: SanitizedWeeklyRow[] },
  cap: number = WEEKLY_DIST_DISPLAY_CAP,
): { standardLine?: string; rows?: SanitizedWeeklyRow[] } | undefined {
  return capPersistAndDerive(parts, cap).persisted;
}

/**
 * Persist-only normalize from loose client payload (caps rows). Use `sanitizeWeeklyPartsFromUnknown` +
 * `capPersistAndDerive` when deriving hours separately.
 */
export function cloneWeeklyDistributionForPersist(
  raw: ClientServiceWeeklyDist | undefined,
): ClientServiceWeeklyDist | undefined {
  const parts = sanitizeWeeklyPartsFromUnknown(raw ?? undefined);
  if (!parts) return undefined;
  return weeklyDistributionForPersist(parts);
}

export type WeeklyDistributionScalarsUpdate = {
  sdrWeeklyDistribution?: ClientServiceWeeklyDist;
  hours: string;
  totalHours: string;
  truncatedRowCount?: number;
};

/** Normalize WD patch, persist-cap rows, and derive hours + totalHours scalars. */
export function normalizeWeeklyDistributionUpdate(
  prevWd: ClientServiceWeeklyDist | undefined,
  patchWd: Partial<{ standardLine?: string; rows?: SanitizedWeeklyRow[] }>,
): WeeklyDistributionScalarsUpdate {
  const merged = { ...(prevWd ?? {}), ...patchWd };
  const parts = sanitizeWeeklyPartsFromUnknown(merged);
  if (!parts) {
    return { sdrWeeklyDistribution: undefined, hours: "", totalHours: "" };
  }
  const { persisted, hours, totalHours, truncatedRowCount } = capPersistAndDerive(parts);
  return {
    sdrWeeklyDistribution: persisted ?? undefined,
    hours,
    totalHours,
    ...(truncatedRowCount > 0 ? { truncatedRowCount } : {}),
  };
}
