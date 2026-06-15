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
