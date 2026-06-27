/**
 * Per-user role-label helper.
 *
 * Maps an individual's role to a display label, accounting for HHA Caregivers.
 * HHA when `applicantType === "hha"` OR `role === "hha"` OR `role === "caregiver"`.
 *
 * - short (default): "Caregiver" (HHA) / "DSP" (else)
 * - full (`{ full: true }`): "Caregiver" (HHA) / "Direct Support Professional" (else)
 *
 * Call sites handle pluralization/casing.
 */
export function roleLabel(
  input: { applicantType?: string; role?: string },
  opts?: { full?: boolean }
): string {
  const applicantType = input?.applicantType?.toLowerCase();
  const role = input?.role?.toLowerCase();
  const isHha =
    applicantType === "hha" || role === "hha" || role === "caregiver";

  if (isHha) return "Caregiver";
  return opts?.full ? "Direct Support Professional" : "DSP";
}

/**
 * Program/client-type code for an individual, for badge display.
 * HHA (caregiver) -> "HHA"; otherwise -> "DDD".
 */
export function programLabel(input: { applicantType?: string; role?: string }): "DDD" | "HHA" {
  const applicantType = input?.applicantType?.toLowerCase();
  const role = input?.role?.toLowerCase();
  const isHha =
    applicantType === "hha" || role === "hha" || role === "caregiver";
  return isHha ? "HHA" : "DDD";
}

/** Field staff carry a program; agency/admin/super roles are shared across both. */
export function isProgramScopedRole(role?: string): boolean {
  const r = (role || "").toLowerCase();
  return r.includes("dsp") || r === "employee" || r === "hha" || r === "caregiver";
}

/**
 * Whether a person with this role belongs in the given program mode's view.
 * Shared (non-field) roles always pass; `null` mode means no filtering.
 */
export function matchesAgencyMode(
  role: string | undefined,
  mode: "ddd" | "hha" | null
): boolean {
  if (!mode) return true;
  if (!isProgramScopedRole(role)) return true;
  return programLabel({ role }) === (mode === "hha" ? "HHA" : "DDD");
}

/**
 * Agency-level (aggregate) staff labels derived from the agency's supported
 * client types. Used for the staff-management page/sidebar headings.
 *
 * - DDD + HHA (or unset) -> "DSP/Caregiver"
 * - DDD only             -> "DSP"
 * - HHA only             -> "Caregivers"
 *
 * `title`      : management heading noun (e.g. `${title} Management`)
 * `noun`       : section heading noun (stats card, directory header)
 * `nounPlural` : short plural noun for table headings (e.g. "{nounPlural} to pay")
 * `plural`     : descriptive plural (e.g. "manage your {plural}")
 */
export function staffLabels(
  supportedClientTypes?: string[] | null
): { title: string; noun: string; nounPlural: string; plural: string } {
  const types = (supportedClientTypes ?? []).map((t) => t?.toLowerCase());
  const ddd = types.includes("ddd");
  const hha = types.includes("hha");

  if (hha && !ddd) {
    return { title: "Caregivers", noun: "Caregiver", nounPlural: "Caregivers", plural: "caregivers" };
  }
  if (ddd && !hha) {
    return { title: "DSP", noun: "DSP", nounPlural: "DSPs", plural: "direct support professionals" };
  }
  // Both supported, or unset (treated as both, matching the app-wide fallback).
  return {
    title: "DSP/Caregiver",
    noun: "DSP/Caregiver",
    nounPlural: "DSPs/Caregivers",
    plural: "direct support professionals & caregivers",
  };
}
