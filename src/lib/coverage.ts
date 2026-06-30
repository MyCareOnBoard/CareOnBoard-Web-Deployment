/**
 * Per-line billing coverage — who pays for a shift/ride: the payer/insurance
 * (state claim), the family out of pocket (invoice), or both (a split of the one
 * computed charge). Single source of truth for coverage values and the split
 * math used across onboarding, scheduling, mileage, approval, and billing.
 * Mirror of the backend at functions/utils/coverage.js — keep in sync (the
 * split math must match byte-for-byte so previews equal persisted amounts).
 */

export const COVERAGE = {
  PAYER: "payer",
  OUT_OF_POCKET: "out_of_pocket",
  BOTH: "both",
} as const;
export type Coverage = (typeof COVERAGE)[keyof typeof COVERAGE];
export const COVERAGE_VALUES: Coverage[] = [
  COVERAGE.PAYER,
  COVERAGE.OUT_OF_POCKET,
  COVERAGE.BOTH,
];

export const SPLIT_MODE = {
  PERCENTAGE: "percentage",
  FLAT: "flat",
} as const;
export type SplitMode = (typeof SPLIT_MODE)[keyof typeof SPLIT_MODE];
export const SPLIT_MODE_VALUES: SplitMode[] = [
  SPLIT_MODE.PERCENTAGE,
  SPLIT_MODE.FLAT,
];

function round2(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

export type ChargeSplit = { payer: number; outOfPocket: number };

/**
 * Partition a line's full charge into the payer portion (-> claim) and the
 * out-of-pocket portion (-> invoice). `splitValue` is the PAYER's portion (D2):
 * percentage = payer coverage %, flat = payer's flat $ contribution. Compute the
 * payer side and derive out-of-pocket by subtraction so the two always sum to
 * the charge exactly.
 */
export function splitCharge(
  charge: number,
  coverage: Coverage | string | null | undefined,
  splitMode?: SplitMode | string | null,
  splitValue?: number | string | null,
): ChargeSplit {
  const total = round2(charge);
  if (!(total > 0)) return { payer: 0, outOfPocket: 0 };
  if (coverage === COVERAGE.OUT_OF_POCKET) return { payer: 0, outOfPocket: total };
  // payer (and any unknown/absent coverage) bills the full charge to the payer.
  if (coverage !== COVERAGE.BOTH) return { payer: total, outOfPocket: 0 };
  // both — splitValue is the payer's portion
  const v = Number(splitValue) || 0;
  let payer =
    splitMode === SPLIT_MODE.PERCENTAGE ? round2(total * (v / 100)) : round2(v);
  if (payer < 0) payer = 0;
  if (payer > total) payer = total;
  return { payer, outOfPocket: round2(total - payer) };
}

export function isValidSplit(
  coverage: Coverage | string | null | undefined,
  splitMode: SplitMode | string | null | undefined,
  splitValue: number | string | null | undefined,
): boolean {
  if (coverage !== COVERAGE.BOTH) return true;
  if (splitValue === null || splitValue === undefined || splitValue === "") return false;
  const v = Number(splitValue);
  if (!Number.isFinite(v) || v < 0) return false;
  if (splitMode === SPLIT_MODE.PERCENTAGE && v > 100) return false;
  return true;
}

export type LineCoverage = {
  coverage: Coverage;
  splitMode: SplitMode | null;
  splitValue: number | null;
};

type CoverageLineLike = {
  coverage?: string | null;
  splitMode?: string | null;
  splitValue?: number | null;
};
type CoverageClientLike = {
  defaultCoverage?: string | null;
  defaultSplitMode?: string | null;
  defaultSplitValue?: number | null;
  billingDirection?: string | null;
};

/**
 * Resolve a line's effective coverage: explicit per-line value, else the client
 * default, else the legacy whole-client billingDirection, else payer.
 */
export function resolveLineCoverage(
  line: CoverageLineLike | null | undefined,
  client: CoverageClientLike | null | undefined,
): LineCoverage {
  const lineCov = line?.coverage;
  if (lineCov && (COVERAGE_VALUES as string[]).includes(lineCov)) {
    return {
      coverage: lineCov as Coverage,
      splitMode: (line?.splitMode ?? null) as SplitMode | null,
      splitValue: line?.splitValue ?? null,
    };
  }
  const def = client?.defaultCoverage;
  if (def && (COVERAGE_VALUES as string[]).includes(def)) {
    return {
      coverage: def as Coverage,
      splitMode: (client?.defaultSplitMode ?? null) as SplitMode | null,
      splitValue: client?.defaultSplitValue ?? null,
    };
  }
  if (client?.billingDirection === "out-of-pocket") {
    return { coverage: COVERAGE.OUT_OF_POCKET, splitMode: null, splitValue: null };
  }
  return { coverage: COVERAGE.PAYER, splitMode: null, splitValue: null };
}
