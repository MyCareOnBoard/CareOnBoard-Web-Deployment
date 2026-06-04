import type { Agency, UpdateAgencyProfileRequest } from "@/lib/api/agencies";

export type OperationalFormSlice = {
  maxShiftPerDay: string;
  travelTimeRules: string;
  mileageRate: number;
  whoReceivesNotifications: string;
  allowedFileTypes: string[];
  allowRecurringSchedules: boolean;
  allowOverlappingVisits: boolean;
  offerMileageReimbursements: boolean;
  realtimeGpsTracking: boolean;
};

export const OPERATIONAL_FIELD_KEYS: (keyof OperationalFormSlice)[] = [
  "maxShiftPerDay",
  "travelTimeRules",
  "mileageRate",
  "whoReceivesNotifications",
  "allowedFileTypes",
  "allowRecurringSchedules",
  "allowOverlappingVisits",
  "offerMileageReimbursements",
  "realtimeGpsTracking",
];

export const OPERATIONAL_FORM_DEFAULTS: OperationalFormSlice = {
  maxShiftPerDay: "5",
  travelTimeRules: "",
  mileageRate: 0,
  whoReceivesNotifications: "",
  allowedFileTypes: [],
  allowRecurringSchedules: false,
  allowOverlappingVisits: false,
  offerMileageReimbursements: false,
  realtimeGpsTracking: false,
};

export const ALLOWED_FILE_TYPE_VALUES = ["pdf", "jpg", "png"] as const;

const ALLOWED_FILE_TYPE_SET = new Set<string>(ALLOWED_FILE_TYPE_VALUES);

export function normalizeAllowedFileTypes(values: string[]): string[] {
  const expanded = values.includes("all")
    ? [...ALLOWED_FILE_TYPE_VALUES]
    : values.filter((v) => v !== "all");
  const filtered = expanded.filter((v) => ALLOWED_FILE_TYPE_SET.has(v));
  return [...new Set(filtered)];
}

export function pickOperationalFormValues(
  source: Partial<OperationalFormSlice> | null | undefined,
): OperationalFormSlice {
  return {
    maxShiftPerDay: source?.maxShiftPerDay ?? OPERATIONAL_FORM_DEFAULTS.maxShiftPerDay,
    travelTimeRules: source?.travelTimeRules ?? OPERATIONAL_FORM_DEFAULTS.travelTimeRules,
    mileageRate: parseMileageRate(source?.mileageRate ?? OPERATIONAL_FORM_DEFAULTS.mileageRate),
    whoReceivesNotifications:
      source?.whoReceivesNotifications ?? OPERATIONAL_FORM_DEFAULTS.whoReceivesNotifications,
    allowedFileTypes: source?.allowedFileTypes ?? OPERATIONAL_FORM_DEFAULTS.allowedFileTypes,
    allowRecurringSchedules:
      source?.allowRecurringSchedules ?? OPERATIONAL_FORM_DEFAULTS.allowRecurringSchedules,
    allowOverlappingVisits:
      source?.allowOverlappingVisits ?? OPERATIONAL_FORM_DEFAULTS.allowOverlappingVisits,
    offerMileageReimbursements:
      source?.offerMileageReimbursements ?? OPERATIONAL_FORM_DEFAULTS.offerMileageReimbursements,
    realtimeGpsTracking:
      source?.realtimeGpsTracking ?? OPERATIONAL_FORM_DEFAULTS.realtimeGpsTracking,
  };
}

export function parseMileageRate(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

export function parseMaxShiftPerDay(value: string): number {
  const parsed = parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 5;
  return Math.min(5, Math.max(1, parsed));
}

export function agencyOperationalToForm(
  agency: Pick<
    Agency,
    | "maxShiftPerDay"
    | "travelTimeRules"
    | "mileageRate"
    | "whoReceivesNotifications"
    | "allowedFileTypes"
    | "allowRecurringSchedules"
    | "allowOverlappingVisits"
    | "offerMileageReimbursements"
    | "realtimeGpsTracking"
  >,
): OperationalFormSlice {
  return {
    maxShiftPerDay: String(agency.maxShiftPerDay ?? 5),
    travelTimeRules: agency.travelTimeRules ?? "",
    mileageRate: parseMileageRate(agency.mileageRate ?? 0),
    whoReceivesNotifications: agency.whoReceivesNotifications ?? "",
    allowedFileTypes: normalizeAllowedFileTypes(agency.allowedFileTypes ?? []),
    allowRecurringSchedules: agency.allowRecurringSchedules ?? false,
    allowOverlappingVisits: agency.allowOverlappingVisits ?? false,
    offerMileageReimbursements: agency.offerMileageReimbursements ?? false,
    realtimeGpsTracking: agency.realtimeGpsTracking ?? false,
  };
}

export function hasOperationalDirtyFields(
  dirtyFields?: Partial<Record<keyof OperationalFormSlice, boolean | boolean[]>>,
): boolean {
  if (!dirtyFields) return false;
  return OPERATIONAL_FIELD_KEYS.some((key) => {
    const flag = dirtyFields[key];
    return flag === true || (Array.isArray(flag) && flag.some(Boolean));
  });
}

export function operationalFormToUpdatePayload(
  values: OperationalFormSlice,
): Pick<
  UpdateAgencyProfileRequest,
  | "maxShiftPerDay"
  | "travelTimeRules"
  | "mileageRate"
  | "whoReceivesNotifications"
  | "allowedFileTypes"
  | "allowRecurringSchedules"
  | "allowOverlappingVisits"
  | "offerMileageReimbursements"
  | "realtimeGpsTracking"
> {
  const trim = (v: string) => v.trim();
  const travelTime = trim(values.travelTimeRules);
  const notificationRole = trim(values.whoReceivesNotifications);

  return {
    maxShiftPerDay: parseMaxShiftPerDay(values.maxShiftPerDay),
    travelTimeRules: travelTime === "" ? null : travelTime,
    mileageRate: parseMileageRate(values.mileageRate),
    whoReceivesNotifications: notificationRole === "" ? null : notificationRole,
    allowedFileTypes: normalizeAllowedFileTypes(values.allowedFileTypes),
    allowRecurringSchedules: values.allowRecurringSchedules,
    allowOverlappingVisits: values.allowOverlappingVisits,
    offerMileageReimbursements: values.offerMileageReimbursements,
    realtimeGpsTracking: values.realtimeGpsTracking,
  };
}
