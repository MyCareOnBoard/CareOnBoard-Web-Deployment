import { HHA_PERSONAL_CARE, HHA_SERVICE_LOG, NoteTypeId } from "@/lib/notes/noteTypes";

/** Canonical service-catalog category for personal care services. */
const PERSONAL_CARE_SERVICE_TYPE = "personal care";

/**
 * Known personal-care service codes, used as a fallback for legacy HHA
 * authorizations saved before the `serviceType` field existed (T1019 =
 * Personal Care Assistant). Lowercased for case-insensitive matching.
 */
const PERSONAL_CARE_CODES = new Set(["t1019"]);

export function isPersonalCareService(
  serviceType?: string | null,
  serviceCode?: string | null,
): boolean {
  if (serviceType && serviceType.trim().toLowerCase() === PERSONAL_CARE_SERVICE_TYPE) {
    return true;
  }
  if (serviceCode && PERSONAL_CARE_CODES.has(serviceCode.trim().toLowerCase())) {
    return true;
  }
  return false;
}

/**
 * Resolves the HHA note type for a shift's service: personal-care services get
 * the checklist note, everything else gets the activity-log note.
 */
export function resolveHhaNoteType(
  serviceType?: string | null,
  serviceCode?: string | null,
): NoteTypeId {
  return isPersonalCareService(serviceType, serviceCode)
    ? HHA_PERSONAL_CARE
    : HHA_SERVICE_LOG;
}
